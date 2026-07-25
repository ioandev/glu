import { Router, type Request, type Response } from "express";
import { Readable } from "node:stream";
import type { ServerConfig } from "./config";
import { requireTokens } from "./authRoutes";
import { TodoistError, todoistGet, todoistPost, type TokenSet } from "./todoist";

/**
 * A read-only, **allowlisted** surface (ADR 12) — never a blind passthrough.
 * The sealed cookie holds a `data:read_write` token, so a generic proxy would
 * hand any XSS the whole account, deletes included. Write verbs arrive
 * deliberately, one ADR at a time.
 */

/** ADR 12: a pomodoro sidebar is not a task manager. Honest, visible cap. */
export const TASK_CAP = 200;
/** ADR 13: the same honesty applied to a task's comments. */
export const COMMENT_CAP = 100;

export interface RawTask {
  id: string;
  content: string;
  description?: string;
  /**
   * **Todoist's API priority is inverted from its UI**: API 4 is the UI's P1
   * (red), API 1 is P4 (none). Normalised at this boundary and nowhere else.
   */
  priority?: number;
  project_id?: string;
  section_id?: string | null;
  child_order?: number;
  is_completed?: boolean;
  url?: string;
}

export interface UiTask {
  id: string;
  title: string;
  description: string;
  /** 1..4 in the UI's sense: 1 = P1 red. */
  uiPriority: 1 | 2 | 3 | 4;
  sectionId: string | null;
  order: number;
}

/** API 4 → P1, 3 → P2, 2 → P3, 1 → P4. The inversion dies here. */
export function toUiPriority(apiPriority: number | undefined): 1 | 2 | 3 | 4 {
  switch (apiPriority) {
    case 4:
      return 1;
    case 3:
      return 2;
    case 2:
      return 3;
    default:
      return 4;
  }
}

/**
 * Todoist `content` may contain markdown. Rendering it is not v1, and stripping
 * to plain text is also the XSS posture (ADR 12).
 */
export function toPlainText(content: string): string {
  return content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1$2")
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1$2")
    .trim();
}

export function toUiTask(task: RawTask): UiTask {
  return {
    id: task.id,
    title: toPlainText(task.content ?? ""),
    description: (task.description ?? "").trim(),
    uiPriority: toUiPriority(task.priority),
    sectionId: task.section_id ?? null,
    order: task.child_order ?? 0,
  };
}

interface Paged<T> {
  results?: T[];
  next_cursor?: string | null;
}

/** Follows cursors up to `cap`, and says so when it stops. */
async function collect<T>(
  tokens: TokenSet,
  path: string,
  query: Record<string, string | undefined>,
  cap: number,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  let cursor: string | undefined;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const body = await todoistGet<Paged<T>>(tokens, path, { ...query, cursor, limit: "50" });
    items.push(...(body.results ?? []));
    cursor = body.next_cursor ?? undefined;
    if (!cursor || items.length >= cap) break;
  }

  const truncated = items.length > cap || Boolean(cursor);
  return { items: items.slice(0, cap), truncated };
}

function upstreamStatus(error: unknown): number {
  if (error instanceof TodoistError) {
    // A user-authored filter query that Todoist rejects is a 4xx worth showing.
    return error.status >= 400 && error.status < 500 ? error.status : 502;
  }
  return 502;
}

export function todoistRoutes(config: ServerConfig): Router {
  const router = Router();

  const guarded =
    (handler: (req: Request, res: Response, tokens: TokenSet) => Promise<void>) =>
    async (req: Request, res: Response) => {
      const tokens = await requireTokens(req, res, config);
      if (!tokens) return;
      try {
        await handler(req, res, tokens);
      } catch (error) {
        res.status(upstreamStatus(error)).json({
          error: "upstream_error",
          message: (error as Error).message,
        });
      }
    };

  router.get(
    "/projects",
    guarded(async (_req, res, tokens) => {
      const { items } = await collect<{ id: string; name: string }>(
        tokens,
        "/projects",
        {},
        200,
      );
      res.json({ items: items.map((p) => ({ id: p.id, name: p.name })) });
    }),
  );

  router.get(
    "/labels",
    guarded(async (_req, res, tokens) => {
      const { items } = await collect<{ id: string; name: string }>(tokens, "/labels", {}, 200);
      res.json({ items: items.map((l) => ({ id: l.id, name: l.name })) });
    }),
  );

  router.get(
    "/filters",
    guarded(async (_req, res, tokens) => {
      const { items } = await collect<{ id: string; name: string; query?: string }>(
        tokens,
        "/filters",
        {},
        200,
      );
      res.json({ items: items.map((f) => ({ id: f.id, name: f.name, query: f.query })) });
    }),
  );

  router.get(
    "/sections",
    guarded(async (req, res, tokens) => {
      const projectId = String(req.query.projectId ?? "");
      const { items } = await collect<{
        id: string;
        name: string;
        section_order?: number;
      }>(tokens, "/sections", { project_id: projectId || undefined }, 200);
      res.json({
        items: items
          .map((s) => ({ id: s.id, name: s.name, order: s.section_order ?? 0 }))
          .sort((a, b) => a.order - b.order),
      });
    }),
  );

  router.get(
    "/tasks",
    guarded(async (req, res, tokens) => {
      const type = String(req.query.type ?? "");
      const id = String(req.query.id ?? "");
      const query = String(req.query.query ?? "");

      let path = "/tasks";
      let params: Record<string, string | undefined> = {};
      if (type === "project") {
        params = { project_id: id };
      } else if (type === "label") {
        path = "/tasks/filter";
        params = { query: `@${query || id}` };
      } else if (type === "filter") {
        path = "/tasks/filter";
        params = { query: query || id };
      } else {
        res.status(400).json({ error: "unknown_source_type" });
        return;
      }

      const { items, truncated } = await collect<RawTask>(tokens, path, params, TASK_CAP);
      res.json({ items: items.map(toUiTask), truncated, cap: TASK_CAP });
    }),
  );

  router.get(
    "/task/:id",
    guarded(async (req, res, tokens) => {
      const raw = await todoistGet<RawTask>(
        tokens,
        `/tasks/${encodeURIComponent(String(req.params.id))}`,
      );
      res.json({ task: { ...toUiTask(raw), completed: Boolean(raw.is_completed) } });
    }),
  );

  router.get(
    "/comments",
    guarded(async (req, res, tokens) => {
      const taskId = String(req.query.taskId ?? req.query.task_id ?? "");
      if (!taskId) {
        res.status(400).json({ error: "missing_task_id" });
        return;
      }
      const { items, truncated } = await collect<RawComment>(
        tokens,
        "/comments",
        { task_id: taskId },
        COMMENT_CAP,
      );
      res.json({
        items: items.map(toUiComment).sort((a, b) => a.postedAt.localeCompare(b.postedAt)),
        truncated,
        cap: COMMENT_CAP,
      });
    }),
  );

  router.get(
    "/task/:id/time-total",
    guarded(async (req, res, tokens) => {
      const taskId = String(req.params.id);
      const user = await todoistGet<{ id: string }>(tokens, "/user");
      // Deliberately NOT ADR 13's capped fetch: a total must see every page.
      const { items, exceeded } = await collectAll<RawComment>(tokens, "/comments", {
        task_id: taskId,
      });
      if (exceeded) console.warn("[glu] time-total page bound exceeded for task", taskId);

      let counted = 0;
      let ignored = 0;
      let minutes = 0;
      for (const comment of items) {
        // Shared projects mean other people's comments exist, and they can
        // imitate the format (ADR 14).
        if (comment.posted_uid && comment.posted_uid !== user.id) {
          ignored += 1;
          continue;
        }
        const parsed = parseTimeComment(comment.content ?? "");
        if (parsed === null) {
          ignored += 1;
          continue;
        }
        counted += 1;
        minutes += parsed;
      }

      res.json({
        minutes: Math.min(minutes, MAX_COMMENT_MINUTES),
        counted,
        ignored,
        clamped: minutes > MAX_COMMENT_MINUTES,
      });
    }),
  );

  /**
   * The allowlist's first non-GET (ADR 14) — and deliberately **not** a general
   * comment API. The server accepts `{taskId, minutes}` and composes the text
   * itself, so even a hijacked frontend can only post well-formed time comments
   * within sane bounds.
   */
  router.post(
    "/comment",
    guarded(async (req, res, tokens) => {
      const taskId = String((req.body as { taskId?: string })?.taskId ?? "");
      const minutes = Number((req.body as { minutes?: number })?.minutes);

      if (!taskId) {
        res.status(400).json({ error: "missing_task_id" });
        return;
      }
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_COMMENT_MINUTES) {
        res.status(400).json({ error: "minutes_out_of_range" });
        return;
      }

      const content = composeTimeComment(minutes);
      await todoistPost(tokens, "/comments", { task_id: taskId, content });
      res.json({ posted: true, content });
    }),
  );

  /**
   * Write verbs two and three (ADR 20). Shaped and named — no bodies, no
   * passthrough — so the whole write surface stays enumerable on one hand.
   */
  router.post(
    "/task/:id/close",
    guarded(async (req, res, tokens) => {
      await todoistPost(tokens, `/tasks/${encodeURIComponent(String(req.params.id))}/close`, {});
      res.json({ closed: true });
    }),
  );

  router.post(
    "/task/:id/reopen",
    guarded(async (req, res, tokens) => {
      await todoistPost(tokens, `/tasks/${encodeURIComponent(String(req.params.id))}/reopen`, {});
      res.json({ reopened: true });
    }),
  );

  router.get("/attachment", guarded(proxyAttachment));

  // Anything not named above is refused: allowlist, not wildcard.
  router.use((_req, res) => {
    res.status(404).json({ error: "not_allowlisted" });
  });

  return router;
}

/* -------------------------------------------------------------------------- */
/* Comments (ADR 13)                                                          */
/* -------------------------------------------------------------------------- */

export interface RawAttachment {
  resource_type?: string;
  file_name?: string;
  file_type?: string;
  file_url?: string;
  image?: string;
  thumbnail?: string | [string, number, number][];
  image_width?: number;
  image_height?: number;
}

export interface RawComment {
  id: string;
  content?: string;
  posted_at?: string;
  posted_uid?: string;
  attachment?: RawAttachment | null;
}

export interface UiAttachment {
  kind: "image" | "file";
  fileName: string;
  fileType: string;
  /** Already wrapped in the same-origin proxy URL; never a Todoist host. */
  src?: string;
  width?: number;
  height?: number;
}

export interface UiComment {
  id: string;
  text: string;
  postedAt: string;
  /** ADR 14 filters by authorship; the id comes from ADR 11's `status`. */
  postedByUid: string | null;
  attachment: UiAttachment | null;
}

export const attachmentProxyPath = (url: string) =>
  `/glu/api/todoist/attachment?url=${encodeURIComponent(url)}`;

export function toUiComment(comment: RawComment): UiComment {
  const attachment = comment.attachment ?? null;
  let ui: UiAttachment | null = null;

  if (attachment) {
    const isImage = attachment.resource_type === "image";
    const source = attachment.image ?? attachment.file_url;
    ui = {
      kind: isImage ? "image" : "file",
      fileName: attachment.file_name ?? "attachment",
      fileType: attachment.file_type ?? "",
      // Images come from structured attachment data, never from parsing text —
      // which is why images-in-comments needs no markdown engine (ADR 13).
      src: isImage && source ? attachmentProxyPath(source) : undefined,
      width: attachment.image_width,
      height: attachment.image_height,
    };
  }

  return {
    id: comment.id,
    text: toPlainText(comment.content ?? ""),
    postedAt: comment.posted_at ?? "",
    postedByUid: comment.posted_uid ?? null,
    attachment: ui,
  };
}

/* -------------------------------------------------------------------------- */
/* The image proxy (ADR 13)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * An arbitrary-URL fetcher on a server is a hole, so this one isn't: an exact
 * **host allowlist** on the *parsed* URL, image content-types only, a streaming
 * size cap, a timeout, and redirects refused outright.
 */
export const ATTACHMENT_HOSTS = new Set([
  "files.todoist.com",
  "d2dcuo6t5f6qwe.cloudfront.net",
  "api.todoist.com",
  "todoist.s3.amazonaws.com",
]);

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Parse-then-check. `evil.com/?x=files.todoist.com` passes a substring test. */
export function isAllowedAttachmentUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ATTACHMENT_HOSTS.has(url.hostname);
}

export async function proxyAttachment(
  req: Request,
  res: Response,
  tokens: TokenSet,
): Promise<void> {
  const raw = String(req.query.url ?? "");
  if (!isAllowedAttachmentUrl(raw)) {
    console.warn("[glu] attachment host rejected", raw.slice(0, 120));
    res.status(400).json({ error: "host_not_allowed" });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(raw, {
      // If Todoist's file URLs need the bearer, only the server has it; if they
      // are public signed URLs, sending it is harmless because the host is
      // allowlisted to Todoist's own storage (ADR 13).
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      redirect: "error",
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: "attachment_unavailable" });
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn("[glu] attachment content-type rejected", contentType);
      res.status(400).json({ error: "not_an_image" });
      return;
    }

    const declared = Number(upstream.headers.get("content-length") ?? 0);
    if (declared > ATTACHMENT_MAX_BYTES) {
      res.status(400).json({ error: "attachment_too_large" });
      return;
    }

    res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "private, max-age=300");

    // Enforced while streaming, not by buffering first.
    let seen = 0;
    const source = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
    source.on("data", (chunk: Buffer) => {
      seen += chunk.length;
      if (seen > ATTACHMENT_MAX_BYTES) {
        console.warn("[glu] attachment exceeded the size cap mid-stream");
        source.destroy();
        controller.abort();
        res.destroy();
      }
    });
    source.pipe(res);
    await new Promise<void>((resolve) => {
      source.on("end", resolve);
      source.on("close", resolve);
      source.on("error", resolve);
    });
  } catch {
    if (!res.headersSent) res.status(502).json({ error: "attachment_unavailable" });
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------- */
/* Time comments (ADR 14)                                                     */
/* -------------------------------------------------------------------------- */

/** 28 days, in minutes. Applies to a single comment and to the total. */
export const MAX_COMMENT_MINUTES = 40_320;

/**
 * The exact, parseable contract. Minutes-only, always — one format beats a
 * pretty one, and the bracket prefix is what the totals parser anchors on.
 */
export function composeTimeComment(minutes: number): string {
  const unit = minutes === 1 ? "minute" : "minutes";
  return `[${minutes}m] You spent ${minutes} ${unit} on this`;
}

/**
 * Anchored at the start, trailing space required: unanchored parsing counts
 * "[5m] …" quoted inside somebody's reply (ADR 14's gotcha). Out-of-range
 * values are ignored, never errors.
 */
export function parseTimeComment(content: string): number | null {
  const match = /^\[(\d+)m\] /.exec(content);
  if (!match) return null;
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_COMMENT_MINUTES) return null;
  return minutes;
}

/** Follows every page, with a sane bound and a distinct log if it is hit. */
async function collectAll<T>(
  tokens: TokenSet,
  path: string,
  query: Record<string, string | undefined>,
): Promise<{ items: T[]; exceeded: boolean }> {
  const items: T[] = [];
  let cursor: string | undefined;
  const maxPages = 40; // ~2000 comments

  for (let page = 0; page < maxPages; page += 1) {
    const body = await todoistGet<{ results?: T[]; next_cursor?: string | null }>(tokens, path, {
      ...query,
      cursor,
      limit: "50",
    });
    items.push(...(body.results ?? []));
    cursor = body.next_cursor ?? undefined;
    if (!cursor) return { items, exceeded: false };
  }
  return { items, exceeded: true };
}
