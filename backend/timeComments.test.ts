import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { sealData } from "iron-session";
import { createApp } from "./app";
import { readConfig, type ServerConfig } from "./config";
import { SESSION_COOKIE, type TokenSet } from "./session";
import {
  MAX_COMMENT_MINUTES,
  composeTimeComment,
  parseTimeComment,
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

describe("the comment format contract (ADR 14)", () => {
  it("composes exactly the specified text, singular at one", () => {
    expect(composeTimeComment(1)).toBe("[1m] You spent 1 minute on this");
    expect(composeTimeComment(5)).toBe("[5m] You spent 5 minutes on this");
    expect(composeTimeComment(90)).toBe("[90m] You spent 90 minutes on this");
  });

  it("round-trips through the parser", () => {
    for (const minutes of [1, 2, 42, 1440, MAX_COMMENT_MINUTES]) {
      expect(parseTimeComment(composeTimeComment(minutes))).toBe(minutes);
    }
  });

  it("anchors at the start with the trailing space", () => {
    // The gotcha: a quoted "[5m]" inside a reply must not count.
    expect(parseTimeComment('Re: "[5m] You spent 5 minutes on this" — nice')).toBeNull();
    expect(parseTimeComment("see [5m] above")).toBeNull();
    expect(parseTimeComment("[5m]no space")).toBeNull();
  });

  it("ignores out-of-range and malformed values rather than erroring", () => {
    expect(parseTimeComment("[0m] You spent 0 minutes on this")).toBeNull();
    expect(parseTimeComment(`[${MAX_COMMENT_MINUTES + 1}m] too long`)).toBeNull();
    expect(parseTimeComment("[-5m] negative")).toBeNull();
    expect(parseTimeComment("[5h] wrong unit")).toBeNull();
    expect(parseTimeComment("")).toBeNull();
  });
});

describe("POST /todoist/comment — the narrow write verb (ADR 14)", () => {
  it("composes the text server-side and posts it", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "c1" }));

    const response = await request(app())
      .post("/glu/api/todoist/comment")
      .set("Cookie", [await liveCookie()])
      .send({ taskId: "t1", minutes: 5 });

    expect(response.status).toBe(200);
    expect(response.body.content).toBe("[5m] You spent 5 minutes on this");

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toEqual({ task_id: "t1", content: "[5m] You spent 5 minutes on this" });
  });

  it("refuses to relay caller-supplied text", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "c1" }));
    await request(app())
      .post("/glu/api/todoist/comment")
      .set("Cookie", [await liveCookie()])
      .send({ taskId: "t1", minutes: 5, content: "delete everything" });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.content).toBe("[5m] You spent 5 minutes on this");
  });

  it.each([0, -1, 1.5, MAX_COMMENT_MINUTES + 1, Number.NaN])(
    "rejects %s minutes without calling upstream",
    async (minutes) => {
      const response = await request(app())
        .post("/glu/api/todoist/comment")
        .set("Cookie", [await liveCookie()])
        .send({ taskId: "t1", minutes });

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing task id", async () => {
    const response = await request(app())
      .post("/glu/api/todoist/comment")
      .set("Cookie", [await liveCookie()])
      .send({ minutes: 5 });
    expect(response.status).toBe(400);
  });

  it("needs a session", async () => {
    const response = await request(app())
      .post("/glu/api/todoist/comment")
      .send({ taskId: "t1", minutes: 5 });
    expect(response.status).toBe(401);
  });
});

describe("GET /todoist/task/:id/time-total (ADR 14)", () => {
  const withComments = (comments: unknown[]) => {
    fetchMock.mockResolvedValueOnce(json({ id: "42" }));
    fetchMock.mockResolvedValueOnce(json({ results: comments, next_cursor: null }));
  };

  it("sums only our own well-formed comments", async () => {
    withComments([
      { id: "1", content: "[5m] You spent 5 minutes on this", posted_uid: "42" },
      { id: "2", content: "[10m] You spent 10 minutes on this", posted_uid: "42" },
      // Somebody else's comment imitating the format.
      { id: "3", content: "[99m] You spent 99 minutes on this", posted_uid: "99" },
      // Ours, but not a time comment.
      { id: "4", content: "Looks good", posted_uid: "42" },
    ]);

    const response = await request(app())
      .get("/glu/api/todoist/task/t1/time-total")
      .set("Cookie", [await liveCookie()]);

    expect(response.body).toMatchObject({ minutes: 15, counted: 2, ignored: 2 });
  });

  it("clamps the total at 28 days and says so", async () => {
    withComments([
      { id: "1", content: `[${MAX_COMMENT_MINUTES}m] x`, posted_uid: "42" },
      { id: "2", content: "[600m] x", posted_uid: "42" },
    ]);

    const response = await request(app())
      .get("/glu/api/todoist/task/t1/time-total")
      .set("Cookie", [await liveCookie()]);

    expect(response.body.minutes).toBe(MAX_COMMENT_MINUTES);
    expect(response.body.clamped).toBe(true);
  });

  it("follows every page — not ADR 13's display cap", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "42" }));
    let page = 0;
    fetchMock.mockImplementation(async () => {
      page += 1;
      return json({
        results: Array.from({ length: 50 }, (_, i) => ({
          id: `${page}-${i}`,
          content: "[1m] You spent 1 minute on this",
          posted_uid: "42",
        })),
        next_cursor: page < 3 ? `c${page}` : null,
      });
    });

    const response = await request(app())
      .get("/glu/api/todoist/task/t1/time-total")
      .set("Cookie", [await liveCookie()]);

    // 150 comments — well past ADR 13's 100-comment display cap.
    expect(response.body.counted).toBe(150);
    expect(response.body.minutes).toBe(150);
  });

  it("returns zero for a task with no comments, not an error", async () => {
    withComments([]);
    const response = await request(app())
      .get("/glu/api/todoist/task/t1/time-total")
      .set("Cookie", [await liveCookie()]);
    expect(response.body).toMatchObject({ minutes: 0, counted: 0, ignored: 0 });
  });
});

describe("the write surface stays narrow (ADR 14)", () => {
  it("keeps every read route GET-only", async () => {
    const cookie = await liveCookie();
    for (const path of ["/tasks", "/comments", "/projects", "/task/1/time-total"]) {
      const response = await request(app())
        .post(`/glu/api/todoist${path}`)
        .set("Cookie", [cookie])
        .send({});
      expect(response.status, `POST ${path}`).toBe(404);
    }
    for (const method of ["put", "delete", "patch"] as const) {
      const response = await request(app())
        [method]("/glu/api/todoist/comment")
        .set("Cookie", [cookie]);
      expect(response.status, method).toBe(404);
    }
  });
});

describe("close / reopen — write verbs two and three (ADR 20)", () => {
  it("maps close and reopen to Todoist's own endpoints, with no body of ours", async () => {
    const cookie = await liveCookie();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const closed = await request(app())
      .post("/glu/api/todoist/task/t1/close")
      .set("Cookie", [cookie]);
    expect(closed.body).toEqual({ closed: true });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.todoist.com/api/v1/tasks/t1/close",
    );

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const reopened = await request(app())
      .post("/glu/api/todoist/task/t1/reopen")
      .set("Cookie", [cookie]);
    expect(reopened.body).toEqual({ reopened: true });
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://api.todoist.com/api/v1/tasks/t1/reopen",
    );
  });

  it("needs a session", async () => {
    const response = await request(app()).post("/glu/api/todoist/task/t1/close");
    expect(response.status).toBe(401);
  });

  it("relays an upstream refusal without pretending it worked", async () => {
    fetchMock.mockResolvedValueOnce(new Response("gone", { status: 404 }));
    const response = await request(app())
      .post("/glu/api/todoist/task/t1/close")
      .set("Cookie", [await liveCookie()]);
    expect(response.status).toBe(404);
  });

  it("exposes exactly three write routes and nothing else", async () => {
    const cookie = await liveCookie();
    const allowed = [
      ["post", "/comment"],
      ["post", "/task/t1/close"],
      ["post", "/task/t1/reopen"],
    ] as const;

    // Everything not on that list is a 404, whatever the verb.
    const refused = [
      ["post", "/tasks"],
      ["post", "/comments"],
      ["post", "/projects"],
      ["post", "/task/t1"],
      ["post", "/task/t1/delete"],
      ["put", "/task/t1/close"],
      ["delete", "/task/t1/close"],
      ["patch", "/comment"],
      ["delete", "/comment"],
    ] as const;

    for (const [method, path] of refused) {
      const response = await request(app())
        [method](`/glu/api/todoist${path}`)
        .set("Cookie", [cookie])
        .send({});
      expect(response.status, `${method} ${path}`).toBe(404);
    }

    // …and the three that are allowed do reach upstream.
    for (let i = 0; i < allowed.length; i += 1) {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    }
    for (const [method, path] of allowed) {
      const response = await request(app())
        [method](`/glu/api/todoist${path}`)
        .set("Cookie", [cookie])
        .send({ taskId: "t1", minutes: 1 });
      expect(response.status, `${method} ${path}`).toBe(200);
    }
  });
});
