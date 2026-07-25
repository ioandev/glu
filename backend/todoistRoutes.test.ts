import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { sealData } from "iron-session";
import { createApp } from "./app";
import { readConfig, type ServerConfig } from "./config";
import { SESSION_COOKIE, type TokenSet } from "./session";
import { TASK_CAP, toPlainText, toUiPriority, toUiTask } from "./todoistRoutes";

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
      { id: "1", title: "First", description: "", uiPriority: 1, sectionId: null, order: 0 },
      { id: "2", title: "Second", description: "", uiPriority: 4, sectionId: "s1", order: 1 },
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
    expect(String(fetchMock.mock.calls[1][0])).toContain("tasks/filter");
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
