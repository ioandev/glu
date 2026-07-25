import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { sealData } from "iron-session";
import { createApp } from "./app";
import { readConfig, type ServerConfig } from "./config";
import { SESSION_COOKIE, type TokenSet } from "./session";
import {
  ATTACHMENT_MAX_BYTES,
  COMMENT_CAP,
  attachmentProxyPath,
  isAllowedAttachmentUrl,
  toUiComment,
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

describe("SSRF hardening on the image proxy (ADR 13)", () => {
  it("allows only Todoist's own storage hosts over https", () => {
    expect(isAllowedAttachmentUrl("https://files.todoist.com/a.png")).toBe(true);
    expect(isAllowedAttachmentUrl("http://files.todoist.com/a.png")).toBe(false);
    expect(isAllowedAttachmentUrl("https://example.com/a.png")).toBe(false);
  });

  it("parses before it checks — the substring trick fails", () => {
    // `includes("todoist.com")` would wave every one of these through.
    expect(isAllowedAttachmentUrl("https://evil.com/?x=files.todoist.com")).toBe(false);
    expect(isAllowedAttachmentUrl("https://evil.com/files.todoist.com/a.png")).toBe(false);
    expect(isAllowedAttachmentUrl("https://files.todoist.com.evil.com/a.png")).toBe(false);
    expect(isAllowedAttachmentUrl("https://user@evil.com/#files.todoist.com")).toBe(false);
  });

  it("rejects loopback and metadata addresses", () => {
    expect(isAllowedAttachmentUrl("https://127.0.0.1/a.png")).toBe(false);
    expect(isAllowedAttachmentUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedAttachmentUrl("file:///etc/passwd")).toBe(false);
  });

  it("400s a non-allowlisted host without touching the network", async () => {
    const response = await request(app())
      .get("/glu/api/todoist/attachment?url=https%3A%2F%2Fevil.com%2Fa.png")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "host_not_allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400s a non-image content type", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<script>alert(1)</script>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const response = await request(app())
      .get("/glu/api/todoist/attachment?url=https%3A%2F%2Ffiles.todoist.com%2Fx.html")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "not_an_image" });
  });

  it("400s an oversize declared body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("x", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(ATTACHMENT_MAX_BYTES + 1),
        },
      }),
    );

    const response = await request(app())
      .get("/glu/api/todoist/attachment?url=https%3A%2F%2Ffiles.todoist.com%2Fbig.png")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "attachment_too_large" });
  });

  it("refuses redirects rather than following them off the allowlist", async () => {
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      expect(init.redirect).toBe("error");
      throw new TypeError("redirect not allowed");
    });

    const response = await request(app())
      .get("/glu/api/todoist/attachment?url=https%3A%2F%2Ffiles.todoist.com%2Fr.png")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(502);
  });

  it("streams an allowed image with a private cache header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );

    const response = await request(app())
      .get("/glu/api/todoist/attachment?url=https%3A%2F%2Ffiles.todoist.com%2Fok.png")
      .set("Cookie", [await liveCookie()]);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.headers["cache-control"]).toContain("private");
  });

  it("needs a session like every other proxy route", async () => {
    const response = await request(app()).get(
      "/glu/api/todoist/attachment?url=https%3A%2F%2Ffiles.todoist.com%2Fok.png",
    );
    expect(response.status).toBe(401);
  });
});

describe("comments (ADR 13)", () => {
  it("wraps image attachments in the same-origin proxy URL", () => {
    const comment = toUiComment({
      id: "c1",
      content: "Look",
      posted_at: "2026-07-24T09:00:00Z",
      posted_uid: "42",
      attachment: {
        resource_type: "image",
        file_name: "shot.png",
        file_type: "image/png",
        image: "https://files.todoist.com/shot.png",
        image_width: 800,
        image_height: 600,
      },
    });

    expect(comment.attachment).toMatchObject({
      kind: "image",
      width: 800,
      height: 600,
      src: attachmentProxyPath("https://files.todoist.com/shot.png"),
    });
    expect(comment.attachment!.src!.startsWith("/glu/api/")).toBe(true);
  });

  it("renders a non-image attachment as an inert filename line", () => {
    const comment = toUiComment({
      id: "c2",
      content: "Spec",
      attachment: {
        resource_type: "file",
        file_name: "spec.pdf",
        file_type: "application/pdf",
        file_url: "https://files.todoist.com/spec.pdf",
      },
    });
    expect(comment.attachment).toMatchObject({ kind: "file", fileName: "spec.pdf" });
    expect(comment.attachment!.src).toBeUndefined();
  });

  it("returns comments oldest-first, capped at 100", async () => {
    // A fresh Response per call: a body can only be read once.
    let page = 0;
    fetchMock.mockImplementation(async () => {
      const offset = page * 50;
      page += 1;
      return json({
        results: Array.from({ length: 50 }, (_, i) => ({
          id: String(offset + i),
          content: `Comment ${offset + i}`,
          posted_at: new Date(Date.UTC(2026, 6, 24, 9, 0, offset + i)).toISOString(),
        })),
        next_cursor: "next",
      });
    });

    const response = await request(app())
      .get("/glu/api/todoist/comments?taskId=t1")
      .set("Cookie", [await liveCookie()]);

    expect(response.body.items).toHaveLength(COMMENT_CAP);
    expect(response.body.truncated).toBe(true);
    const times: string[] = response.body.items.map((c: { postedAt: string }) => c.postedAt);
    expect([...times].sort()).toEqual(times);
  });

  it("400s without a task id", async () => {
    const response = await request(app())
      .get("/glu/api/todoist/comments")
      .set("Cookie", [await liveCookie()]);
    expect(response.status).toBe(400);
  });
});

describe("the read-only guarantee (ADR 13)", () => {
  it("still exposes zero non-GET Todoist verbs", async () => {
    const cookie = await liveCookie();
    for (const path of ["/task/1", "/comments", "/attachment"]) {
      for (const method of ["post", "put", "delete", "patch"] as const) {
        const response = await request(app())
          [method](`/glu/api/todoist${path}`)
          .set("Cookie", [cookie]);
        expect(response.status, `${method} ${path}`).toBe(404);
      }
    }
  });
});
