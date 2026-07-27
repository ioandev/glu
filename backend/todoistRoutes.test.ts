import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { sealData } from "iron-session";
import { createApp } from "./app";
import { readConfig, type ServerConfig } from "./config";
import { SESSION_COOKIE, type TokenSet } from "./session";
import {
  TASK_CAP,
  buildProjectRanks,
  compareTasks,
  splitFilterViews,
  type RawTask,
  toPlainText,
  toUiPriority,
  toUiTask,
} from "./todoistRoutes";

const config: ServerConfig = readConfig({
  TODOIST_CLIENT_ID: "id",
  TODOIST_CLIENT_SECRET: "secret",
  SESSION_SECRET: "test-session-secret-that-is-long-enough-32",
  PUBLIC_ORIGIN: "http://localhost:3000",
} as unknown as NodeJS.ProcessEnv);

const app = () => createApp(config);
let fetchMock: ReturnType<typeof vi.fn>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * ADR 34 made a filter fetch fan out — every view in parallel with `/projects`
 * for the sort's fourth key — so replies are matched on the URL, never on call
 * order. Anything the handler does not answer comes back as an empty page.
 */
function upstream(reply: (url: string) => unknown) {
  fetchMock.mockImplementation((input: unknown) =>
    Promise.resolve(json(reply(String(input)) ?? { results: [], next_cursor: null })),
  );
}

async function liveCookie() {
  const tokens: TokenSet = { accessToken: "at", expiresAt: Date.now() + 30 * 60_000 };
  return `${SESSION_COOKIE}=${await sealData(tokens, { password: config.sessionSecret })}`;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the priority inversion (ADR 12)", () => {
  // Todoist's API priority is inverted from its UI. This is the named test.
  it.each([
    [4, 1],
    [3, 2],
    [2, 3],
    [1, 4],
    [undefined, 4],
  ])("API priority %s maps to UI P%s", (api, ui) => {
    expect(toUiPriority(api as number | undefined)).toBe(ui);
  });

  it("normalises at the proxy boundary so the UI never sees the raw scale", () => {
    const task = toUiTask({ id: "1", content: "Ship it", priority: 4 });
    expect(task.uiPriority).toBe(1);
    expect(Object.keys(task)).not.toContain("priority");
  });
});

describe("plain-text titles (ADR 12)", () => {
  it("shows link text, not markdown", () => {
    expect(toPlainText("Read [the ADR](https://example.com/adr)")).toBe("Read the ADR");
  });

  it("strips emphasis and code fences", () => {
    expect(toPlainText("**Fix** the `mix` function and _ship_")).toBe(
      "Fix the mix function and ship",
    );
  });

  it("leaves ordinary text alone", () => {
    expect(toPlainText("Write ADR 15 — palette crossfade")).toBe(
      "Write ADR 15 — palette crossfade",
    );
  });
});

describe("filter views (ADR 12 amendment)", () => {
  it("splits a multi-view filter on its top-level commas", () => {
    expect(splitFilterViews("@yolo, #Week N & /Doing, #Inbox")).toEqual([
      "@yolo",
      "#Week N & /Doing",
      "#Inbox",
    ]);
  });

  it("leaves commas inside parentheses and quotes alone", () => {
    expect(splitFilterViews("(due: yesterday | today), search: \"a, b\"")).toEqual([
      "(due: yesterday | today)",
      'search: "a, b"',
    ]);
  });

  it("passes a single-view filter through untouched", () => {
    expect(splitFilterViews("today & @glu")).toEqual(["today & @glu"]);
  });

  it("drops empty views from a trailing or doubled comma", () => {
    expect(splitFilterViews("p1,, p2,")).toEqual(["p1", "p2"]);
  });
});

describe("listing filters (ADR 12 amendment)", () => {
  it("reads saved filters through the Sync API, in Todoist's order", async () => {
    // GET /api/v1/filters does not exist — this route is the one POST that
    // reads. The mock's shape is the sync response's, not a paged list's.
    fetchMock.mockResolvedValueOnce(
      json({
        filters: [
          { id: "2", name: "Later", query: "@later", item_order: 1 },
          { id: "1", name: "PRIORITY PASS", query: "@yolo, p1", item_order: 0 },
          { id: "3", name: "Gone", query: "@gone", item_order: 2, is_deleted: true },
        ],
      }),
    );

    const response = await request(app())
      .get("/glu/api/todoist/filters")
      .set("Cookie", [await liveCookie()]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/sync");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ sync_token: "*", resource_types: ["filters"] });
    expect(response.body.items).toEqual([
      { id: "1", name: "PRIORITY PASS", query: "@yolo, p1" },
      { id: "2", name: "Later", query: "@later" },
    ]);
  });
});

describe("the allowlisted proxy surface (ADR 12)", () => {
  it("refuses everything without a session", async () => {
    for (const path of ["/projects", "/labels", "/filters", "/sections", "/tasks"]) {
      const response = await request(app()).get(`/glu/api/todoist${path}`);
      expect(response.status, path).toBe(401);
    }
  });

  it("404s paths that are not on the allowlist", async () => {
    const cookie = await liveCookie();
    const response = await request(app())
      .get("/glu/api/todoist/sync")
      .set("Cookie", [cookie]);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "not_allowlisted" });
  });

  it("refuses non-GET verbs on the read-only surface", async () => {
    const cookie = await liveCookie();
    for (const method of ["post", "put", "delete", "patch"] as const) {
      const response = await request(app())
        [method]("/glu/api/todoist/tasks")
        .set("Cookie", [cookie]);
      expect(response.status, method).toBe(404);
    }
  });

  it("rejects an unknown source type before calling upstream", async () => {
    const cookie = await liveCookie();
    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=section&id=1")
      .set("Cookie", [cookie]);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("task fetching (ADR 12)", () => {
  it("returns UI tasks for a project", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        results: [
          { id: "1", content: "First", priority: 4, section_id: null, child_order: 0 },
          { id: "2", content: "Second", priority: 1, section_id: "s1", child_order: 1 },
        ],
        next_cursor: null,
      }),
    );

    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=project&id=p1")
      .set("Cookie", [await liveCookie()]);

    expect(response.body.items).toEqual([
      { id: "1", title: "First", description: "", uiPriority: 1, projectId: null, sectionId: null, order: 0 },
      { id: "2", title: "Second", description: "", uiPriority: 4, projectId: null, sectionId: "s1", order: 1 },
    ]);
    expect(response.body.truncated).toBe(false);
    expect(String(fetchMock.mock.calls[0][0])).toContain("project_id=p1");
  });

  it("queries filters and labels through the filter endpoint", async () => {
    fetchMock.mockResolvedValue(json({ results: [], next_cursor: null }));
    const cookie = await liveCookie();

    await request(app())
      .get("/glu/api/todoist/tasks?type=label&id=l1&query=deep-work")
      .set("Cookie", [cookie]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("query=%40deep-work");

    await request(app())
      .get("/glu/api/todoist/tasks?type=filter&id=f1&query=today%20%26%20%40glu")
      .set("Cookie", [cookie]);

    // Each also reads `/projects` for ADR 34's fourth sort key, so the calls
    // are matched by URL rather than by position.
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.filter((url) => url.includes("tasks/filter"))).toHaveLength(2);
    expect(urls.filter((url) => url.includes("/projects"))).toHaveLength(2);
  });

  it("caps at 200 tasks and says so", async () => {
    const page = (start: number, cursor: string | null) =>
      json({
        results: Array.from({ length: 50 }, (_, i) => ({
          id: String(start + i),
          content: `Task ${start + i}`,
          priority: 1,
        })),
        next_cursor: cursor,
      });
    for (let i = 0; i < 5; i += 1) {
      fetchMock.mockResolvedValueOnce(page(i * 50, i < 4 ? `c${i}` : null));
    }

    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=project&id=p1")
      .set("Cookie", [await liveCookie()]);

    expect(response.body.items).toHaveLength(TASK_CAP);
    expect(response.body.truncated).toBe(true);
    expect(response.body.cap).toBe(TASK_CAP);
  });

  it("relays Todoist's own message for an invalid filter query", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Invalid query", { status: 400 }));
    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=filter&id=f1&query=nonsense!!")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("upstream_error");
    expect(response.body.message).toContain("failed");
  });

  it("fetches one request per filter view and unions them once each", async () => {
    // `p1, p2` upstream means p1 AND p2 — the union is ours to assemble.
    upstream((url) => {
      if (url.includes("query=%40yolo")) {
        return { results: [{ id: "1", content: "One", priority: 1 }], next_cursor: null };
      }
      if (url.includes("query=p1")) {
        return {
          results: [
            { id: "1", content: "One", priority: 1 }, // in both views, kept once
            { id: "2", content: "Two", priority: 4 },
          ],
          next_cursor: null,
        };
      }
      return null;
    });

    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=filter&id=f1&query=%40yolo%2C%20p1")
      .set("Cookie", [await liveCookie()]);

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.filter((url) => url.includes("query=%40yolo"))).toHaveLength(1);
    expect(urls.filter((url) => url.includes("query=p1"))).toHaveLength(1);
    // The union is sorted (ADR 34), so the P1 leads even though it arrived last.
    expect(response.body.items.map((t: { id: string }) => t.id)).toEqual(["2", "1"]);
    expect(response.body.truncated).toBe(false);
  });

  it("returns sections in Todoist's own order", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        results: [
          { id: "b", name: "Later", section_order: 2 },
          { id: "a", name: "Today", section_order: 1 },
        ],
        next_cursor: null,
      }),
    );
    const response = await request(app())
      .get("/glu/api/todoist/sections?projectId=p1")
      .set("Cookie", [await liveCookie()]);

    expect(response.body.items.map((s: { name: string }) => s.name)).toEqual([
      "Today",
      "Later",
    ]);
  });
});

describe("filter and label ordering (ADR 34)", () => {
  /** Only the keys under test differ; everything else ties. */
  const task = (id: string, extra: Partial<RawTask> = {}): RawTask => ({
    id,
    content: id,
    priority: 1,
    ...extra,
  });

  const order = (tasks: RawTask[], ranks?: Map<string, number[]>) =>
    [...tasks].sort((a, b) => compareTasks(a, b, ranks)).map((t) => t.id);

  it("puts P1 first and P4 last — the one descending key", () => {
    // API priority is inverted: 4 is the UI's P1.
    const tasks = [task("p4", { priority: 1 }), task("p1", { priority: 4 }), task("p2", { priority: 3 })];
    expect(order(tasks)).toEqual(["p1", "p2", "p4"]);
  });

  it("sorts dated before undated, earliest first, all-day ahead of timed", () => {
    const tasks = [
      task("none"),
      task("timed", { due: { date: "2026-07-26T14:00:00" } }),
      task("allday", { due: { date: "2026-07-26" } }),
      task("earlier", { due: { date: "2026-07-25" } }),
    ];
    expect(order(tasks)).toEqual(["earlier", "allday", "timed", "none"]);
  });

  it("breaks a date tie on deadline, absent last", () => {
    const due = { date: "2026-07-26" };
    const tasks = [
      task("no-deadline", { due }),
      task("late", { due, deadline: { date: "2026-08-01" } }),
      task("soon", { due, deadline: { date: "2026-07-27" } }),
    ];
    expect(order(tasks)).toEqual(["soon", "late", "no-deadline"]);
  });

  it("breaks a deadline tie on project order: Inbox first, parent before child", () => {
    const ranks = buildProjectRanks([
      { id: "sub", parent_id: "second", child_order: 0 },
      { id: "second", child_order: 2 },
      { id: "inbox", child_order: 9, inbox_project: true },
      { id: "first", child_order: 1 },
    ]);
    const tasks = [
      task("d", { project_id: "sub" }),
      task("c", { project_id: "second" }),
      task("b", { project_id: "first" }),
      task("a", { project_id: "inbox" }),
      task("e", { project_id: "gone" }), // outside the fetch cap: last, not first
    ];
    expect(order(tasks, ranks)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("breaks a project tie on child_order, then on id", () => {
    const ranks = buildProjectRanks([{ id: "p", child_order: 0 }]);
    const tasks = [
      task("z", { project_id: "p", child_order: 1 }),
      task("b", { project_id: "p", child_order: 0 }),
      task("a", { project_id: "p", child_order: 0 }),
    ];
    expect(order(tasks, ranks)).toEqual(["a", "b", "z"]);
  });

  it("survives a cycle in project parentage instead of hanging", () => {
    const ranks = buildProjectRanks([
      { id: "a", parent_id: "b", child_order: 0 },
      { id: "b", parent_id: "a", child_order: 1 },
    ]);
    expect(ranks.size).toBeGreaterThan(0);
  });

  it("sorts a label view by the same rule", async () => {
    upstream((url) => {
      if (url.includes("/projects")) {
        return { results: [{ id: "p", child_order: 0 }], next_cursor: null };
      }
      return {
        results: [task("low", { priority: 1 }), task("high", { priority: 4 })],
        next_cursor: null,
      };
    });

    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=label&id=l1&query=deep-work")
      .set("Cookie", [await liveCookie()]);

    expect(response.body.items.map((t: { id: string }) => t.id)).toEqual(["high", "low"]);
  });

  it("leaves a project view in Todoist's own order and reads no projects", async () => {
    upstream(() => ({
      results: [task("low", { priority: 1, child_order: 0 }), task("high", { priority: 4, child_order: 1 })],
      next_cursor: null,
    }));

    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=project&id=p1")
      .set("Cookie", [await liveCookie()]);

    // Untouched: `section_order` then `child_order` is Todoist's project order,
    // and the web applies it (ADR 12).
    expect(response.body.items.map((t: { id: string }) => t.id)).toEqual(["low", "high"]);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toHaveLength(1);
  });

  it("still renders the list when the projects read fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockImplementation((input: unknown) =>
      String(input).includes("/projects")
        ? Promise.resolve(new Response("nope", { status: 500 }))
        : Promise.resolve(
            json({
              results: [task("low", { priority: 1 }), task("high", { priority: 4 })],
              next_cursor: null,
            }),
          ),
    );

    const response = await request(app())
      .get("/glu/api/todoist/tasks?type=filter&id=f1&query=%40glu")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(200);
    expect(response.body.items.map((t: { id: string }) => t.id)).toEqual(["high", "low"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
