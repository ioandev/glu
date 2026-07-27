import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCommentLocale } from "./commentLocales";
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
    // The id is what the 5-second undo window aims its DELETE at.
    expect(response.body.id).toBe("c1");

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toEqual({ task_id: "t1", content: "[5m] You spent 5 minutes on this" });
  });

  it("reports a null id rather than inventing one when upstream omits it", async () => {
    fetchMock.mockResolvedValueOnce(json({}));

    const response = await request(app())
      .post("/glu/api/todoist/comment")
      .set("Cookie", [await liveCookie()])
      .send({ taskId: "t1", minutes: 5 });

    expect(response.body.id).toBeNull();
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

describe("DELETE /todoist/comment/:id — the undo verb (ADR 14 amendment, c)", () => {
  const timeComment = { id: "c1", content: "[5m] You spent 5 minutes on this", posted_uid: "42" };

  const upstream = (comment: unknown) => {
    fetchMock.mockResolvedValueOnce(json({ id: "42" })); // /user
    fetchMock.mockResolvedValueOnce(json(comment)); // /comments/c1
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 })); // the delete
  };

  it("deletes one of our own time comments", async () => {
    upstream(timeComment);

    const response = await request(app())
      .delete("/glu/api/todoist/comment/c1")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deleted: true });
    expect(String(fetchMock.mock.calls[2][0])).toBe("https://api.todoist.com/api/v1/comments/c1");
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });

  it("refuses somebody else's comment without issuing a delete", async () => {
    upstream({ ...timeComment, posted_uid: "99" });

    const response = await request(app())
      .delete("/glu/api/todoist/comment/c1")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(403);
    // Two reads happened; the third call — the delete — never did.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses a comment that is not one of ours in shape, whoever wrote it", async () => {
    // The whole point of the check: an id is not permission to delete.
    upstream({ id: "c1", content: "Looks good to me", posted_uid: "42" });

    const response = await request(app())
      .delete("/glu/api/todoist/comment/c1")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("needs a session", async () => {
    const response = await request(app()).delete("/glu/api/todoist/comment/c1");
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays an upstream refusal without pretending it worked", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "42" }));
    fetchMock.mockResolvedValueOnce(new Response("gone", { status: 404 }));

    const response = await request(app())
      .delete("/glu/api/todoist/comment/c1")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(404);
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

  it("exposes exactly four write routes and nothing else", async () => {
    const cookie = await liveCookie();
    const allowed = [
      ["post", "/comment"],
      ["delete", "/comment/c1"],
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
      // The delete verb is comment-shaped and stays that way.
      ["delete", "/comments/c1"],
      ["delete", "/task/t1"],
      ["put", "/comment/c1"],
    ] as const;

    for (const [method, path] of refused) {
      const response = await request(app())
        [method](`/glu/api/todoist${path}`)
        .set("Cookie", [cookie])
        .send({});
      expect(response.status, `${method} ${path}`).toBe(404);
    }

    // …and the four that are allowed do reach upstream.
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/user")) return json({ id: "42" });
      if (/\/comments\/[^/]+$/.test(url)) {
        return json({ id: "c1", content: "[1m] You spent 1 minute on this", posted_uid: "42" });
      }
      return new Response(null, { status: 204 });
    });
    for (const [method, path] of allowed) {
      const response = await request(app())
        [method](`/glu/api/todoist${path}`)
        .set("Cookie", [cookie])
        .send({ taskId: "t1", minutes: 1 });
      expect(response.status, `${method} ${path}`).toBe(200);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* ADR 27 — the environment half of the comment                               */
/* -------------------------------------------------------------------------- */

/**
 * **Pinned literals, and the reason they are literals.** ADR 22 forbids sharing
 * code with `web/`, so Settings composes its preview from a second copy of this
 * table. The copy is kept honest by this exact list appearing, character for
 * character, in `web/src/lib/timeComment.test.ts`: change the wording in one
 * package and the other package's suite fails.
 */
const ENVIRONMENT_SENTENCES: [string[], string][] = [
  [[], "[5m] You spent 5 minutes on this"],
  [["music"], "[5m] You spent 5 minutes on this — with music"],
  [["podcast"], "[5m] You spent 5 minutes on this — with a podcast"],
  [["tv"], "[5m] You spent 5 minutes on this — with the TV on"],
  [["noisy"], "[5m] You spent 5 minutes on this — with background noise"],
  [["silence"], "[5m] You spent 5 minutes on this — in silence"],
  [["headphones"], "[5m] You spent 5 minutes on this — on headphones"],
  [["music", "headphones"], "[5m] You spent 5 minutes on this — with music, on headphones"],
  [["silence", "headphones"], "[5m] You spent 5 minutes on this — in silence, on headphones"],
  [
    ["podcast", "tv", "noisy"],
    "[5m] You spent 5 minutes on this — with a podcast, the TV on and background noise",
  ],
  [
    ["music", "podcast", "tv", "noisy", "headphones"],
    "[5m] You spent 5 minutes on this — with music, a podcast, the TV on and background noise, on headphones",
  ],
];

describe("the environment vocabulary (ADR 27)", () => {
  it.each(ENVIRONMENT_SENTENCES)("composes %j as the specified sentence", (keys, expected) => {
    expect(composeTimeComment(5, keys)).toBe(expected);
  });

  it("leaves ADR 14's sentence byte-identical when nothing is on", () => {
    expect(composeTimeComment(1, [])).toBe("[1m] You spent 1 minute on this");
    expect(composeTimeComment(1, undefined)).toBe("[1m] You spent 1 minute on this");
    expect(composeTimeComment(1, [])).toBe(composeTimeComment(1));
  });

  it("keeps the parse contract intact for every sentence it can produce", () => {
    // The whole risk of this ADR: the suffix must be invisible to the two
    // readers that anchor on the prefix (totals, and the DELETE guard).
    for (const [keys] of ENVIRONMENT_SENTENCES) {
      expect(parseTimeComment(composeTimeComment(5, keys))).toBe(5);
    }
    // And a decorated comment quoted inside a reply still does not count.
    expect(
      parseTimeComment(`Re: "${composeTimeComment(5, ["music"])}" — nice`),
    ).toBeNull();
  });

  it("ignores unknown keys, dedupes repeats, and owns the word order", () => {
    // Junk in, ADR 14's sentence out — never a 400, which would strand the
    // entry in the outbox's permanent-failure path.
    expect(composeTimeComment(5, ["sauna", 7, null, {}])).toBe(
      "[5m] You spent 5 minutes on this",
    );
    expect(composeTimeComment(5, "music")).toBe("[5m] You spent 5 minutes on this");
    // Repeats cannot lengthen the sentence.
    expect(composeTimeComment(5, ["music", "music", "music"])).toBe(
      "[5m] You spent 5 minutes on this — with music",
    );
    // The caller's order is not the sentence's order.
    expect(composeTimeComment(5, ["headphones", "tv", "music"])).toBe(
      composeTimeComment(5, ["music", "tv", "headphones"]),
    );
  });

  it("re-applies ADR 02's exclusivity even when the caller ignores it", () => {
    expect(composeTimeComment(5, ["silence", "tv"])).toBe(
      "[5m] You spent 5 minutes on this — with the TV on",
    );
  });
});

describe("POST /todoist/comment with an environment (ADR 27)", () => {
  it("posts the decorated sentence and still composes it server-side", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "c1" }));

    const response = await request(app())
      .post("/glu/api/todoist/comment")
      .set("Cookie", [await liveCookie()])
      .send({
        taskId: "t1",
        minutes: 5,
        environment: ["music", "headphones"],
        // Still refused: the environment is a vocabulary, not a text channel.
        content: "delete everything",
      });

    expect(response.status).toBe(200);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toEqual({
      task_id: "t1",
      content: "[5m] You spent 5 minutes on this — with music, on headphones",
    });
    expect(response.body.content).toBe(body.content);
  });

  it("treats a malformed environment as no environment rather than an error", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "c1" }));

    const response = await request(app())
      .post("/glu/api/todoist/comment")
      .set("Cookie", [await liveCookie()])
      .send({ taskId: "t1", minutes: 5, environment: "loud" });

    expect(response.status).toBe(200);
    expect(response.body.content).toBe("[5m] You spent 5 minutes on this");
  });

  it("still rejects out-of-range minutes, environment or not", async () => {
    const response = await request(app())
      .post("/glu/api/todoist/comment")
      .set("Cookie", [await liveCookie()])
      .send({ taskId: "t1", minutes: 0, environment: ["music"] });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the DELETE guard still recognises a decorated comment (ADR 27)", () => {
  const decorated = {
    id: "c1",
    content: "[5m] You spent 5 minutes on this — with music, on headphones",
    posted_uid: "42",
  };

  it("deletes one of ours", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "42" }));
    fetchMock.mockResolvedValueOnce(json(decorated));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await request(app())
      .delete("/glu/api/todoist/comment/c1")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });

  it("still refuses somebody else's, decoration or not", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "42" }));
    fetchMock.mockResolvedValueOnce(json({ ...decorated, posted_uid: "99" }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await request(app())
      .delete("/glu/api/todoist/comment/c1")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(403);
    // The call count is the assertion that matters: no delete was issued.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * ADR 44. These literals are **pinned on purpose**, and their twins live in
 * `web/src/lib/timeComment.test.ts`. The two packages compose this sentence
 * from separate copies of the same vocabulary (ADR 22 forbids sharing a module
 * between them), so the only thing standing between the Settings preview and
 * what actually lands in Todoist is that both suites assert the same strings.
 * If you change one, the other fails — which is the whole point.
 */
describe("the comment speaks the reader's language (ADR 44)", () => {
  it("composes the plain sentence in every locale", () => {
    expect(composeTimeComment(25, [], "en")).toBe("[25m] You spent 25 minutes on this");
    expect(composeTimeComment(25, [], "es")).toBe("[25m] Dedicaste 25 minutos a esto");
    expect(composeTimeComment(25, [], "fr")).toBe("[25m] Vous avez passé 25 minutes là-dessus");
    expect(composeTimeComment(25, [], "pt")).toBe("[25m] Dedicaste 25 minutos a isto");
    expect(composeTimeComment(25, [], "de")).toBe("[25m] Du hast 25 Minuten daran gearbeitet");
    expect(composeTimeComment(25, [], "zh-Hans")).toBe("[25m] 你在这件事上花了 25 分钟");
  });

  it("gets the singular right where the language has one", () => {
    expect(composeTimeComment(1, [], "en")).toBe("[1m] You spent 1 minute on this");
    expect(composeTimeComment(1, [], "es")).toBe("[1m] Dedicaste 1 minuto a esto");
    expect(composeTimeComment(1, [], "fr")).toBe("[1m] Vous avez passé 1 minute là-dessus");
    expect(composeTimeComment(1, [], "de")).toBe("[1m] Du hast 1 Minute daran gearbeitet");
    // Chinese has one plural category — the unit does not move.
    expect(composeTimeComment(1, [], "zh-Hans")).toBe("[1m] 你在这件事上花了 1 分钟");
  });

  it("builds the environment clause with each language's own list grammar", () => {
    const keys = ["music", "podcast", "headphones"];
    expect(composeTimeComment(5, keys, "en")).toBe(
      "[5m] You spent 5 minutes on this — with music and a podcast, on headphones",
    );
    expect(composeTimeComment(5, keys, "es")).toBe(
      "[5m] Dedicaste 5 minutos a esto — con música y un pódcast, con auriculares",
    );
    expect(composeTimeComment(5, keys, "fr")).toBe(
      "[5m] Vous avez passé 5 minutes là-dessus — avec de la musique et un podcast, au casque",
    );
    expect(composeTimeComment(5, keys, "de")).toBe(
      "[5m] Du hast 5 Minuten daran gearbeitet — mit Musik und einem Podcast, mit Kopfhörern",
    );
    expect(composeTimeComment(5, keys, "zh-Hans")).toBe(
      "[5m] 你在这件事上花了 5 分钟 — 伴随音乐和播客，戴着耳机",
    );
  });

  it("keeps silence exclusive in every language", () => {
    expect(composeTimeComment(5, ["silence"], "de")).toBe(
      "[5m] Du hast 5 Minuten daran gearbeitet — in Stille",
    );
    // ADR 02's exclusivity, re-applied server-side: a sound wins over silence.
    expect(composeTimeComment(5, ["silence", "tv"], "de")).toBe(
      composeTimeComment(5, ["tv"], "de"),
    );
  });

  it("keeps the [Nm] anchor parseable whatever the language", () => {
    // The reason the prefix is not localised: totals and the DELETE guard read
    // it, and they have to keep recognising comments written before a language
    // was ever chosen.
    for (const locale of ["en", "es", "fr", "pt", "de", "zh-Hans"] as const) {
      expect(parseTimeComment(composeTimeComment(42, ["music"], locale))).toBe(42);
    }
  });

  it("falls back to English rather than rejecting an unknown locale", () => {
    // A vocabulary mismatch must never strand a queued comment in the outbox's
    // permanent-failure path.
    expect(resolveCommentLocale("klingon")).toBe("en");
    expect(resolveCommentLocale(undefined)).toBe("en");
    expect(resolveCommentLocale("de")).toBe("de");
  });
});
