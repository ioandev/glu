import { Router, type Request, type Response } from "express";
import {
  commentVocabulary,
  DEFAULT_COMMENT_LOCALE,
  resolveCommentLocale,
  type CommentLocale,
} from "./commentLocales";
import { Readable } from "node:stream";
import type { ServerConfig } from "./config";
import { requireTokens } from "./authRoutes";
import {
  TodoistError,
  todoistDelete,
  todoistGet,
  todoistPost,
  type TokenSet,
} from "./todoist";

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
  /** ADR 34 sort keys. `date` is `YYYY-MM-DD` or a full datetime, depending on
   *  whether the task carries a time; `datetime` appears on older shapes. */
  due?: { date?: string; datetime?: string } | null;
  deadline?: { date?: string } | null;
}

export interface UiTask {
  id: string;
  title: string;
  description: string;
  /** 1..4 in the UI's sense: 1 = P1 red. */
  uiPriority: 1 | 2 | 3 | 4;
  projectId: string | null;
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
    projectId: task.project_id ?? null,
    sectionId: task.section_id ?? null,
    order: task.child_order ?? 0,
  };
}

/** Sync-API shape (see the `/filters` route) — snake_case, `item_order`. */
export interface RawFilter {
  id: string;
  name: string;
  query?: string;
  item_order?: number;
  is_deleted?: boolean;
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

/**
 * A Todoist filter can hold **several views**, separated by top-level commas —
 * the UI stacks them as separate lists and shows the union. `/tasks/filter`
 * does not: it reads the comma as AND, so `p1, p2` returns 0 tasks while
 * `p1 | p2` returns 15 (verified against the live API 2026-07-25). A
 * multi-view filter therefore came back empty or near-empty and looked broken.
 *
 * Commas inside parentheses or quotes belong to the expression, not to the
 * view list — `search: "a, b"` is one view.
 */
export function splitFilterViews(query: string): string[] {
  const views: string[] = [];
  let current = "";
  let depth = 0;
  let quoted = false;

  for (const char of query) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === "(") depth += 1;
    else if (!quoted && char === ")") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0 && !quoted) {
      views.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  views.push(current);

  return views.map((view) => view.trim()).filter(Boolean);
}

/** A filter with more views than this is pathological; the list says truncated. */
export const FILTER_VIEW_CAP = 20;
/** Views go out a few at a time: sequential is slow (14 views ≈ 4 s), all-at-once
 *  is a burst at Todoist's limits for a list that refetches on every focus. */
const FILTER_VIEW_BATCH = 4;

/**
 * Fetches every view of a filter and unions them **in view order**, which is
 * the order Todoist itself shows. A task matching two views appears once, at
 * its first position — the flat list has no view headers to repeat it under.
 */
async function collectFilterViews(
  tokens: TokenSet,
  query: string,
): Promise<{ items: RawTask[]; truncated: boolean }> {
  const views = splitFilterViews(query);
  const fetching = views.slice(0, FILTER_VIEW_CAP);
  let truncated = views.length > fetching.length;
  if (truncated) {
    console.warn(`[glu] filter has ${views.length} views; fetching the first ${FILTER_VIEW_CAP}`);
  }

  const byId = new Map<string, RawTask>();
  for (let start = 0; start < fetching.length; start += FILTER_VIEW_BATCH) {
    const batch = await Promise.all(
      fetching
        .slice(start, start + FILTER_VIEW_BATCH)
        .map((view) => collect<RawTask>(tokens, "/tasks/filter", { query: view }, TASK_CAP)),
    );
    for (const page of batch) {
      truncated ||= page.truncated;
      for (const task of page.items) if (!byId.has(task.id)) byId.set(task.id, task);
    }
    // Enough for the cap and views still unread: stop, and say so.
    if (byId.size >= TASK_CAP && start + FILTER_VIEW_BATCH < fetching.length) {
      truncated = true;
      break;
    }
  }

  const items = [...byId.values()];
  return { items: items.slice(0, TASK_CAP), truncated: truncated || items.length > TASK_CAP };
}

/**
 * ADR 34 — **an unsorted Todoist view is not an unordered one.** `/tasks/filter`
 * returns rows in no defined order; Todoist's own apps sort them client-side
 * before painting, so we have to as well. Projects are exempt: `section_order`
 * then `child_order` genuinely is what Todoist shows there.
 *
 * The rule is Todoist's documented default for a filter *without* a date query,
 * applied to every filter and label. Detecting a date query means parsing a
 * grammar we do not own; a heuristic that is right most of the time produces a
 * third order that is neither Todoist's nor predictable.
 */

/** Sorts last when absent — no real key can reach it. */
const NO_DATE = "￿";

/** `YYYY-MM-DD` sorts before `YYYY-MM-DDT…` on the same day, which is where
 *  Todoist paints an all-day task: ahead of that day's timed ones. */
function dueKey(task: RawTask): string {
  return task.due?.datetime || task.due?.date || NO_DATE;
}

function deadlineKey(task: RawTask): string {
  return task.deadline?.date || NO_DATE;
}

interface RawProject {
  id: string;
  parent_id?: string | null;
  child_order?: number;
  inbox_project?: boolean;
  is_inbox_project?: boolean;
}

/** Sorts after every real project — a task whose project fell outside the
 *  fetch cap goes last rather than jumping to the front. */
const UNRANKED: number[] = [Number.MAX_SAFE_INTEGER];

/**
 * Each project's rank is its path of `child_order` values from the root, so a
 * parent sorts ahead of its own sub-projects instead of interleaving with them.
 * Inbox leads, as it does in Todoist's sidebar.
 */
export function buildProjectRanks(projects: RawProject[]): Map<string, number[]> {
  const byId = new Map(projects.map((p) => [String(p.id), p]));
  const ranks = new Map<string, number[]>();

  const rankOf = (id: string, seen: Set<string>): number[] => {
    const cached = ranks.get(id);
    if (cached) return cached;
    const project = byId.get(id);
    // Unknown parent, or a cycle in hand-edited data: stop walking, don't hang.
    if (!project || seen.has(id)) return [];
    seen.add(id);

    const own = project.inbox_project || project.is_inbox_project ? -1 : (project.child_order ?? 0);
    const parentId = project.parent_id ? String(project.parent_id) : null;
    const path = parentId ? [...rankOf(parentId, seen), own] : [own];
    ranks.set(id, path);
    return path;
  };

  for (const project of projects) rankOf(String(project.id), new Set());
  return ranks;
}

/**
 * Best-effort: project order is one key of six, and a degraded order beats an
 * error page for a list the user is looking at.
 */
async function projectRanks(tokens: TokenSet): Promise<Map<string, number[]>> {
  try {
    const { items } = await collect<RawProject>(tokens, "/projects", {}, 200);
    return buildProjectRanks(items);
  } catch (error) {
    console.warn(`[glu] project order unavailable, sorting without it: ${(error as Error).message}`);
    return new Map();
  }
}

function comparePaths(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    // Shorter path first: a parent project sits above its own children.
    const left = a[i] ?? -Infinity;
    const right = b[i] ?? -Infinity;
    if (left !== right) return left - right;
  }
  return 0;
}

/**
 * Priority (descending — API 4 is the UI's P1) → date and time → deadline →
 * project order → `child_order` → id. Only the first key runs descending;
 * the last exists so the same list never renders in two different orders.
 */
export function compareTasks(
  a: RawTask,
  b: RawTask,
  ranks: Map<string, number[]> = new Map(),
): number {
  const priority = (b.priority ?? 1) - (a.priority ?? 1);
  if (priority !== 0) return priority;

  const due = dueKey(a).localeCompare(dueKey(b));
  if (due !== 0) return due;

  const deadline = deadlineKey(a).localeCompare(deadlineKey(b));
  if (deadline !== 0) return deadline;

  const project = comparePaths(
    ranks.get(String(a.project_id ?? "")) ?? UNRANKED,
    ranks.get(String(b.project_id ?? "")) ?? UNRANKED,
  );
  if (project !== 0) return project;

  const order = (a.child_order ?? 0) - (b.child_order ?? 0);
  if (order !== 0) return order;

  return String(a.id).localeCompare(String(b.id));
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

  /**
   * **Filters are not a REST resource.** `GET /api/v1/filters` 404s — verified
   * against the live API 2026-07-25; ADR 12's endpoint sweep recorded it as
   * real and nothing caught it, because every test mocks the upstream. Saved
   * filters exist only in the Sync API, so this one route reads them through a
   * `filters`-only sync. Still a read, still allowlisted: `/sync` is never
   * exposed as a proxy path, only used as one.
   */
  router.get(
    "/filters",
    guarded(async (_req, res, tokens) => {
      const body = await todoistPost<{ filters?: RawFilter[] }>(tokens, "/sync", {
        sync_token: "*",
        resource_types: ["filters"],
      });
      const items = (body.filters ?? [])
        .filter((f) => !f.is_deleted)
        // Todoist's own filter order, like every other list here.
        .sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0))
        .slice(0, 200)
        .map((f) => ({ id: String(f.id), name: f.name, query: f.query }));
      res.json({ items });
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
        // One request per view — see `collectFilterViews` — plus the projects
        // read ADR 34's fourth sort key needs.
        const [fetched, ranks] = await Promise.all([
          collectFilterViews(tokens, query || id),
          projectRanks(tokens),
        ]);
        const sorted = [...fetched.items].sort((a, b) => compareTasks(a, b, ranks));
        res.json({ items: sorted.map(toUiTask), truncated: fetched.truncated, cap: TASK_CAP });
        return;
      } else {
        res.status(400).json({ error: "unknown_source_type" });
        return;
      }

      // A project's own order is `section_order` then `child_order`, applied in
      // the web (ADR 12); only a label needs ADR 34's sort — and its extra read.
      const [{ items, truncated }, ranks] = await Promise.all([
        collect<RawTask>(tokens, path, params, TASK_CAP),
        type === "label" ? projectRanks(tokens) : Promise.resolve(null),
      ]);
      const ordered = ranks ? [...items].sort((a, b) => compareTasks(a, b, ranks)) : items;
      res.json({ items: ordered.map(toUiTask), truncated, cap: TASK_CAP });
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
   * comment API. The server accepts `{taskId, minutes, environment?}` — the
   * last one an array of *enumerated keys* (ADR 27), never text — and composes
   * the sentence itself, so even a hijacked frontend can only post well-formed
   * time comments within sane bounds.
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

      // ADR 27: enumerated keys only. Missing, malformed and unknown all mean
      // "no environment" — the composer decides that, not this handler.
      const content = composeTimeComment(
        minutes,
        (req.body as { environment?: unknown })?.environment,
        // Allowlisted, never trusted — and an unknown value is English rather
        // than a 400, for the same reason an unknown environment key is
        // ignored: a vocabulary mismatch must not lose tracked time.
        resolveCommentLocale((req.body as { locale?: unknown })?.locale),
      );
      const created = await todoistPost<RawComment>(tokens, "/comments", {
        task_id: taskId,
        content,
      });
      // The id is what makes the post undoable (ADR 14 amendment, c); an
      // upstream that omits it simply yields a comment that cannot be undone.
      res.json({ posted: true, content, id: created?.id ?? null });
    }),
  );

  /**
   * Write verb four, and the only destructive one (ADR 14 amendment, c): the
   * 5-second undo window after a comment posts. Deliberately **not** a
   * delete-by-id passthrough — that would hand an XSS the account's whole
   * comment history. The id is checked before it is used: the comment must be
   * ours and must parse as one of our own `[Nm]` time comments. Anything else
   * is refused without a delete ever being issued.
   */
  router.delete(
    "/comment/:id",
    guarded(async (req, res, tokens) => {
      const commentId = encodeURIComponent(String(req.params.id));
      const [user, comment] = await Promise.all([
        todoistGet<{ id: string }>(tokens, "/user"),
        // Not HTML — a URL path segment, encodeURIComponent-escaped above.
        // nosemgrep: javascript.express.security.injection.raw-html-format.raw-html-format
        todoistGet<RawComment>(tokens, `/comments/${commentId}`),
      ]);

      // Same authorship rule as the totals route: a missing uid is ours.
      const ours = !comment.posted_uid || comment.posted_uid === user.id;
      if (!ours || parseTimeComment(comment.content ?? "") === null) {
        res.status(403).json({ error: "not_a_time_comment" });
        return;
      }

      await todoistDelete(tokens, `/comments/${commentId}`);
      res.json({ deleted: true });
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
 * ADR 27's vocabulary: the four sound environments share one `with …` clause,
 * because "with music, with the TV on" reads like a struct and "with music and
 * the TV on" reads like English. Order comes from this array, never from the
 * caller's — an enumerated key buys a word, not a position in the sentence.
 */
const SOUND_ORDER = ["music", "podcast", "tv", "noisy"] as const;

/** `a`, `a and b`, `a, b and c` — in whatever the locale's words for those are. */
function listPhrase(parts: string[], separator: string, final: string): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(separator)}${final}${parts[parts.length - 1]}`;
}

/**
 * The environment half of the comment (ADR 27). The caller sends **enumerated
 * keys**, never prose, and this is the only place words come from — which is
 * what keeps the write verb as narrow as ADR 14 left it. Unknown keys are
 * ignored rather than rejected: a 400 here would strand a queued comment in
 * the outbox's permanent-failure path and lose tracked time over a vocabulary
 * mismatch.
 */
export function environmentSuffix(
  raw: unknown,
  locale: CommentLocale = DEFAULT_COMMENT_LOCALE,
): string {
  if (!Array.isArray(raw)) return "";
  // A Set is the dedupe: repeats cannot lengthen the sentence.
  const on = new Set(raw.filter((key): key is string => typeof key === "string"));
  const words = commentVocabulary(locale);

  const clauses: string[] = [];
  const sounds = SOUND_ORDER.filter((key) => on.has(key)).map((key) => words.sounds[key]);
  if (sounds.length > 0) {
    clauses.push(words.withSounds(listPhrase(sounds, words.listSeparator, words.listFinal)));
  } else if (on.has("silence")) {
    // ADR 02's exclusivity re-applied server-side: the reducer already
    // guarantees it client-side, but "in silence, with the TV on" must stay out
    // of the ledger even when the caller is not our UI.
    clauses.push(words.silence);
  }
  // Orthogonal equipment, so it is its own clause (ADR 02's rule, in grammar).
  if (on.has("headphones")) clauses.push(words.headphones);

  return clauses.length === 0
    ? ""
    : `${words.suffixSeparator}${clauses.join(words.clauseSeparator)}`;
}

/**
 * The exact, parseable contract. Minutes-only, always — one format beats a
 * pretty one, and the bracket prefix is what the totals parser anchors on.
 *
 * ADR 27 appends the environment **after** the sentence, deliberately: nothing
 * reads past the anchor, so every existing comment stays valid, totals keep
 * summing, and the DELETE guard keeps recognising our own comments.
 */
export function composeTimeComment(
  minutes: number,
  environment?: unknown,
  locale: CommentLocale = DEFAULT_COMMENT_LOCALE,
): string {
  const words = commentVocabulary(locale);
  const sentence = words.sentence(minutes, words.unit(minutes));
  // The `[Nm]` prefix is **never** localised: it is what `parseTimeComment` and
  // the DELETE guard anchor on, so it has to read the same in every language and
  // in every comment already written (ADR 44).
  return `[${minutes}m] ${sentence}${environmentSuffix(environment, locale)}`;
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
