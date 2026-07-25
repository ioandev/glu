import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { MIN_SESSION_SECRET_LENGTH, readConfig, redirectUri, type ServerConfig } from "./config";
import { API_LIMIT, AUTH_LIMIT, TODOIST_LIMIT } from "./security";

/**
 * The 2026-07-25 security audit's findings, each pinned by a test so the fix
 * cannot regress silently (ADR 11 / ADR 16 amendments).
 */

const env = (over: Record<string, string> = {}) =>
  ({
    TODOIST_CLIENT_ID: "test-client-id",
    TODOIST_CLIENT_SECRET: "test-client-secret",
    SESSION_SECRET: "test-session-secret-that-is-long-enough-32",
    PUBLIC_ORIGIN: "http://localhost:3000",
    ...over,
  }) as unknown as NodeJS.ProcessEnv;

const config: ServerConfig = readConfig(env());
const app = () => createApp(config);

describe("config validation (F-1, F-6)", () => {
  it("refuses to boot with a non-local origin and no SESSION_SECRET", () => {
    expect(() =>
      readConfig(env({ PUBLIC_ORIGIN: "https://ioan.dev", SESSION_SECRET: "" })),
    ).toThrow(/SESSION_SECRET is required/);
  });

  it("refuses a SESSION_SECRET below the iron-session floor", () => {
    expect(() =>
      readConfig(env({ PUBLIC_ORIGIN: "https://ioan.dev", SESSION_SECRET: "too-short" })),
    ).toThrow(new RegExp(`${MIN_SESSION_SECRET_LENGTH} characters`));
  });

  it("still allows the dev fallback for a local origin", () => {
    const local = readConfig(env({ PUBLIC_ORIGIN: "http://localhost:3000", SESSION_SECRET: "" }));
    expect(local.sessionSecret.length).toBeGreaterThanOrEqual(MIN_SESSION_SECRET_LENGTH);
    expect(local.secureCookies).toBe(false);
  });

  it("rejects an origin with no scheme instead of silently dropping Secure", () => {
    // The old `startsWith("https://")` test answered `false` here and set a
    // cookie without `Secure`.
    expect(() => readConfig(env({ PUBLIC_ORIGIN: "ioan.dev" }))).toThrow(/absolute URL/);
  });

  it("derives Secure from the parsed protocol and normalises the origin", () => {
    const prod = readConfig(
      env({ PUBLIC_ORIGIN: "https://ioan.dev/", SESSION_SECRET: "x".repeat(40) }),
    );
    expect(prod.secureCookies).toBe(true);
    expect(prod.publicOrigin).toBe("https://ioan.dev");
    // A trailing slash used to produce a double-slash redirect URI that
    // Todoist rejects.
    expect(redirectUri(prod)).toBe("https://ioan.dev/glu/api/auth/todoist/callback");
  });
});

/**
 * Every test file builds its app with `createApp()`, and `rateLimit()` closes
 * over a fresh `Map` per call — so buckets never leak between tests. Hoisting a
 * single app instance to module scope is the one change that would make this
 * suite order-dependent.
 */
describe("rate limiting (F-3, ADR 24)", () => {
  it("429s the auth plane past its burst and says when to come back", async () => {
    const server = app();
    for (let i = 0; i < AUTH_LIMIT.capacity; i += 1) {
      const ok = await request(server).get("/glu/api/auth/todoist/status");
      expect(ok.status).toBe(200);
    }

    const limited = await request(server).get("/glu/api/auth/todoist/status");
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: "rate_limited" });
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("meters the proxy routes too — a session is a cookie, not a rate limit", async () => {
    const server = app();
    for (let i = 0; i < TODOIST_LIMIT.capacity; i += 1) {
      const res = await request(server).get("/glu/api/todoist/projects");
      expect(res.status).toBe(401);
    }

    const limited = await request(server).get("/glu/api/todoist/projects");
    expect(limited.status).toBe(429);
  });

  it("keeps the route families independent", async () => {
    const server = app();
    for (let i = 0; i <= AUTH_LIMIT.capacity; i += 1) {
      await request(server).get("/glu/api/auth/todoist/status");
    }
    expect((await request(server).get("/glu/api/auth/todoist/status")).status).toBe(429);

    // The auth family is spent; todoist has its own bucket and the floor is
    // looser than both, so this must still reach the router.
    expect((await request(server).get("/glu/api/todoist/projects")).status).toBe(401);
  });

  it("never meters the health probe", async () => {
    const server = app();
    for (let i = 0; i < 500; i += 1) {
      const res = await request(server).get("/glu/api/healthz");
      expect(res.status).toBe(200);
    }
  });

  it("meters unrouted probes, which still cost the body parser", async () => {
    const server = app();
    let sawLimit = false;
    for (let i = 0; i <= API_LIMIT.capacity; i += 1) {
      const res = await request(server).get(`/glu/api/nope-${i}`);
      if (res.status === 429) {
        sawLimit = true;
        break;
      }
      expect(res.status).toBe(404);
    }
    expect(sawLimit).toBe(true);
  });

  it("buckets by the header the proxy sets, not by anything a caller writes", async () => {
    const server = app();
    for (let i = 0; i <= AUTH_LIMIT.capacity; i += 1) {
      await request(server)
        .get("/glu/api/auth/todoist/status")
        .set("x-glu-client-ip", "203.0.113.7");
    }
    const spent = await request(server)
      .get("/glu/api/auth/todoist/status")
      .set("x-glu-client-ip", "203.0.113.7");
    expect(spent.status).toBe(429);

    // A different real client is unaffected…
    const other = await request(server)
      .get("/glu/api/auth/todoist/status")
      .set("x-glu-client-ip", "198.51.100.8");
    expect(other.status).toBe(200);

    // …but forging the leftmost forwarded entry mints nothing: only the
    // rightmost is trusted, and the proxy's own header outranks both.
    const spoofed = await request(server)
      .get("/glu/api/auth/todoist/status")
      .set("x-glu-client-ip", "203.0.113.7")
      .set("x-forwarded-for", "9.9.9.9, 203.0.113.7");
    expect(spoofed.status).toBe(429);
  });

  it("reads X-Real-IP, which nginx-proxy assigns rather than appends", async () => {
    const server = app();
    for (let i = 0; i <= AUTH_LIMIT.capacity; i += 1) {
      await request(server).get("/glu/api/auth/todoist/status").set("x-real-ip", "203.0.113.7");
    }

    // nginx-proxy fills X-Forwarded-For with `$proxy_add_x_forwarded_for`, so
    // its leftmost entries are the caller's. Neither they nor a forged
    // X-Real-IP that the proxy overwrote can open a second bucket.
    const spoofed = await request(server)
      .get("/glu/api/auth/todoist/status")
      .set("x-real-ip", "203.0.113.7")
      .set("x-forwarded-for", "9.9.9.9, 203.0.113.7");
    expect(spoofed.status).toBe(429);
  });

  it("keys IPv6 callers by their /64, so a subnet is not a bypass", async () => {
    const server = app();
    for (let i = 0; i <= AUTH_LIMIT.capacity; i += 1) {
      await request(server).get("/glu/api/auth/todoist/status").set("x-glu-client-ip", "2001:db8:1:2::1");
    }

    const sameSubnet = await request(server)
      .get("/glu/api/auth/todoist/status")
      .set("x-glu-client-ip", "2001:db8:1:2:ffff:ffff:ffff:ffff");
    expect(sameSubnet.status).toBe(429);

    const otherSubnet = await request(server)
      .get("/glu/api/auth/todoist/status")
      .set("x-glu-client-ip", "2001:db8:1:3::1");
    expect(otherSubnet.status).toBe(200);
  });
});

describe("security headers (ADR 16 amendment — moved off the proxy)", () => {
  it("sends the strictest CSP there is, on a route that answers JSON", async () => {
    const res = await request(app()).get("/glu/api/healthz");
    expect(res.headers["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("keeps them on the exits a proxy header would have covered and an app forgets", async () => {
    // A 404 that reaches no router, and a body-parse failure that never even
    // reaches the 404 — both used to be Caddy's problem.
    const missing = await request(app()).get("/glu/api/no-such-route");
    expect(missing.status).toBe(404);
    expect(missing.headers["x-content-type-options"]).toBe("nosniff");

    const malformed = await request(app())
      .post("/glu/api/todoist/comment")
      .set("content-type", "application/json")
      .send("{not json");
    expect(malformed.status).toBe(400);
    expect(malformed.headers["content-security-policy"]).toContain("default-src 'none'");
  });

  it("never sends HSTS — that belongs to whatever terminates TLS", async () => {
    const res = await request(app()).get("/glu/api/healthz");
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });
});

describe("cross-origin write rejection (F-9)", () => {
  it("blocks a cross-site form POST to a write route", async () => {
    const res = await request(app())
      .post("/glu/api/todoist/task/1/close")
      .set("sec-fetch-site", "cross-site");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "cross_origin_write" });
  });

  it("blocks a mismatched Origin", async () => {
    const res = await request(app())
      .post("/glu/api/todoist/task/1/close")
      .set("origin", "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("blocks a form-encoded content type even with no origin headers", async () => {
    const res = await request(app())
      .post("/glu/api/todoist/comment")
      .type("form")
      .send({ taskId: "1", minutes: "5" });
    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: "unsupported_media_type" });
  });

  it("lets a same-origin JSON write through to the auth check", async () => {
    const res = await request(app())
      .post("/glu/api/todoist/comment")
      .set("sec-fetch-site", "same-origin")
      .set("origin", config.publicOrigin)
      .send({ taskId: "1", minutes: 5 });
    // 401, not 403: the guard passed and `requireTokens` answered.
    expect(res.status).toBe(401);
  });

  it("leaves reads alone", async () => {
    const res = await request(app())
      .get("/glu/api/todoist/projects")
      .set("sec-fetch-site", "cross-site");
    expect(res.status).toBe(401);
  });
});

describe("error shape (F-5)", () => {
  it("answers malformed JSON with JSON, not an HTML stack trace", async () => {
    const res = await request(app())
      .post("/glu/api/todoist/comment")
      .set("content-type", "application/json")
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "bad_request" });
    expect(res.text).not.toMatch(/<!DOCTYPE html>/i);
    expect(res.text).not.toMatch(/node_modules/);
  });

  it("answers an oversize body with JSON too", async () => {
    const res = await request(app())
      .post("/glu/api/todoist/comment")
      .set("content-type", "application/json")
      .send(JSON.stringify({ taskId: "1", minutes: 5, pad: "a".repeat(70_000) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "payload_too_large" });
    expect(res.text).not.toMatch(/node_modules/);
  });
});
