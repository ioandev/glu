import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { sealData } from "iron-session";
import { createApp } from "./app";
import { readConfig, type ServerConfig } from "./config";
import { SESSION_COOKIE, STATE_COOKIE, type TokenSet } from "./session";
import { unsealData } from "iron-session";

const config: ServerConfig = readConfig({
  TODOIST_CLIENT_ID: "test-client-id",
  TODOIST_CLIENT_SECRET: "test-client-secret",
  SESSION_SECRET: "test-session-secret-that-is-long-enough-32",
  PUBLIC_ORIGIN: "http://localhost:3000",
} as unknown as NodeJS.ProcessEnv);

const app = () => createApp(config);

/** The upstream is always mocked — the suite never touches api.todoist.com. */
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function sealTokens(tokens: TokenSet) {
  return sealData(tokens, { password: config.sessionSecret });
}

const cookieValue = (headers: string | string[] | undefined, name: string) => {
  const list = Array.isArray(headers) ? headers : headers ? [headers] : [];
  return list.find((header) => header.startsWith(`${name}=`));
};

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /auth/todoist/login (ADR 11)", () => {
  it("redirects to Todoist with the right client, scope and a state cookie", async () => {
    const response = await request(app()).get("/glu/api/auth/todoist/login");

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.origin + location.pathname).toBe("https://app.todoist.com/oauth/authorize");
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(location.searchParams.get("scope")).toBe("data:read_write");
    expect(location.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/glu/api/auth/todoist/callback",
    );

    const state = location.searchParams.get("state")!;
    const cookie = cookieValue(response.headers["set-cookie"], STATE_COOKIE)!;
    expect(cookie).toContain(`${STATE_COOKIE}=${state}`);
    expect(cookie).toContain("HttpOnly");
    // Lax, never Strict: the callback is a top-level cross-site GET.
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/glu");
  });

  it("answers 503 rather than bouncing to a broken page when no app is registered", async () => {
    const unconfigured = createApp(readConfig({} as unknown as NodeJS.ProcessEnv));
    const response = await request(unconfigured).get("/glu/api/auth/todoist/login");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "todoist_not_configured" });
  });
});

describe("GET /auth/todoist/callback (ADR 11)", () => {
  it("exchanges the code, seals the tokens and lands back on /glu", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "at-1", refresh_token: "rt-1", expires_in: 3600 }),
    );

    const response = await request(app())
      .get("/glu/api/auth/todoist/callback?code=abc&state=s1")
      .set("Cookie", [`${STATE_COOKIE}=s1`]);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("http://localhost:3000/glu");

    const cookie = cookieValue(response.headers["set-cookie"], SESSION_COOKIE)!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    // The cookie carries no readable token material.
    expect(cookie).not.toContain("at-1");
    const sealed = cookie.split(";")[0].slice(SESSION_COOKIE.length + 1);
    const tokens = await unsealData<TokenSet>(decodeURIComponent(sealed), {
      password: config.sessionSecret,
    });
    expect(tokens.accessToken).toBe("at-1");
  });

  it("rejects a mismatched state with 403 and no session", async () => {
    const response = await request(app())
      .get("/glu/api/auth/todoist/callback?code=abc&state=attacker")
      .set("Cookie", [`${STATE_COOKIE}=real`]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "state_mismatch" });
    expect(cookieValue(response.headers["set-cookie"], SESSION_COOKIE)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a missing state cookie with 403", async () => {
    const response = await request(app()).get(
      "/glu/api/auth/todoist/callback?code=abc&state=s1",
    );
    expect(response.status).toBe(403);
  });

  it("surfaces an exchange failure without creating a session", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 400 }));

    const response = await request(app())
      .get("/glu/api/auth/todoist/callback?code=bad&state=s1")
      .set("Cookie", [`${STATE_COOKIE}=s1`]);

    expect(response.status).toBe(502);
    expect(cookieValue(response.headers["set-cookie"], SESSION_COOKIE)).toBeUndefined();
  });
});

describe("the App Console verification token (ADR 11 amendment)", () => {
  const VERIFICATION_TOKEN = "test-verification-token";

  const verifiedConfig: ServerConfig = readConfig({
    TODOIST_CLIENT_ID: "test-client-id",
    TODOIST_CLIENT_SECRET: "test-client-secret",
    TODOIST_VERIFICATION_TOKEN: VERIFICATION_TOKEN,
    SESSION_SECRET: "test-session-secret-that-is-long-enough-32",
    PUBLIC_ORIGIN: "http://localhost:3000",
  } as unknown as NodeJS.ProcessEnv);

  const verifiedApp = () => createApp(verifiedConfig);

  /** Signed from scratch here, so the suite can't rubber-stamp `session.ts`. */
  const sign = (nonce: string) =>
    // Test fixture, not a credential — the "key" is this suite's own constant.
    // nosemgrep: javascript.lang.security.audit.hardcoded-hmac-key.hardcoded-hmac-key
    createHmac("sha256", VERIFICATION_TOKEN).update(nonce).digest("base64url");

  const callback = (state: string) =>
    request(verifiedApp())
      .get(`/glu/api/auth/todoist/callback?code=abc&state=${encodeURIComponent(state)}`)
      .set("Cookie", [`${STATE_COOKIE}=${state}`]);

  it("signs the state with the token and keeps the token out of the URL", async () => {
    const response = await request(verifiedApp()).get("/glu/api/auth/todoist/login");

    const state = new URL(response.headers.location).searchParams.get("state")!;
    const [nonce, signature] = state.split(".");
    expect(signature).toBe(sign(nonce));

    // The token is a static per-app secret: a URL is the one place it must
    // never appear, since it survives in history, referrers and access logs.
    expect(response.headers.location).not.toContain(VERIFICATION_TOKEN);
    expect(cookieValue(response.headers["set-cookie"], STATE_COOKIE)).toContain(
      `${STATE_COOKIE}=${state}`,
    );
  });

  it("mints a fresh nonce per login, so the signature is never a fixed value", async () => {
    const first = await request(verifiedApp()).get("/glu/api/auth/todoist/login");
    const second = await request(verifiedApp()).get("/glu/api/auth/todoist/login");

    const stateOf = (r: typeof first) =>
      new URL(r.headers.location).searchParams.get("state")!;
    expect(stateOf(first)).not.toBe(stateOf(second));
  });

  it("completes the callback for a state it minted", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "at-v", refresh_token: "rt-v", expires_in: 3600 }),
    );

    const response = await callback(`nonce-1.${sign("nonce-1")}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("http://localhost:3000/glu");
    expect(cookieValue(response.headers["set-cookie"], SESSION_COOKIE)).toBeDefined();
  });

  it("rejects a forged signature even when the state cookie matches", async () => {
    const response = await callback(`nonce-1.${sign("some-other-nonce")}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "state_unverified" });
    expect(cookieValue(response.headers["set-cookie"], SESSION_COOKIE)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unsigned state even when the state cookie matches", async () => {
    const response = await callback("bare-nonce");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "state_unverified" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves the state a bare nonce when no token is configured", async () => {
    const response = await request(app()).get("/glu/api/auth/todoist/login");
    const state = new URL(response.headers.location).searchParams.get("state")!;
    expect(state).not.toContain(".");
  });
});

describe("GET /auth/todoist/status (ADR 11)", () => {
  it("reports unauthenticated with no cookie and sets nothing", async () => {
    const response = await request(app()).get("/glu/api/auth/todoist/status");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ authenticated: false });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("reports the account name and id for a live token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "42", full_name: "Ioan" }));
    const sealed = await sealTokens({
      accessToken: "at-live",
      refreshToken: "rt",
      expiresAt: Date.now() + 30 * 60_000,
    });

    const response = await request(app())
      .get("/glu/api/auth/todoist/status")
      .set("Cookie", [`${SESSION_COOKIE}=${sealed}`]);

    expect(response.body).toEqual({ authenticated: true, name: "Ioan", id: "42" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expired token transparently and reseals", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "at-2", refresh_token: "rt-2", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "42", full_name: "Ioan" }));

    const sealed = await sealTokens({
      accessToken: "at-old",
      refreshToken: "rt-1",
      expiresAt: Date.now() - 1000,
    });

    const response = await request(app())
      .get("/glu/api/auth/todoist/status")
      .set("Cookie", [`${SESSION_COOKIE}=${sealed}`]);

    expect(response.body).toMatchObject({ authenticated: true, name: "Ioan" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.todoist.com/oauth/access_token");

    const cookie = cookieValue(response.headers["set-cookie"], SESSION_COOKIE)!;
    const resealed = await unsealData<TokenSet>(
      decodeURIComponent(cookie.split(";")[0].slice(SESSION_COOKIE.length + 1)),
      { password: config.sessionSecret },
    );
    expect(resealed.accessToken).toBe("at-2");
    expect(resealed.refreshToken).toBe("rt-2");
  });

  it("clears the cookie and reports logged out when the refresh fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("revoked", { status: 401 }));
    const sealed = await sealTokens({
      accessToken: "at-old",
      refreshToken: "rt-dead",
      expiresAt: Date.now() - 1000,
    });

    const response = await request(app())
      .get("/glu/api/auth/todoist/status")
      .set("Cookie", [`${SESSION_COOKIE}=${sealed}`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ authenticated: false });
    expect(cookieValue(response.headers["set-cookie"], SESSION_COOKIE)).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
  });

  it("degrades to logged out when Todoist rejects the token outright", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 403 }));
    const sealed = await sealTokens({
      accessToken: "at-live",
      expiresAt: Date.now() + 30 * 60_000,
    });

    const response = await request(app())
      .get("/glu/api/auth/todoist/status")
      .set("Cookie", [`${SESSION_COOKIE}=${sealed}`]);

    expect(response.body).toEqual({ authenticated: false });
  });

  it("treats a tampered cookie as logged out, not as an error", async () => {
    const response = await request(app())
      .get("/glu/api/auth/todoist/status")
      .set("Cookie", [`${SESSION_COOKIE}=not-a-sealed-blob`]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ authenticated: false });
  });
});

describe("POST /auth/todoist/logout (ADR 11)", () => {
  it("clears the session cookie", async () => {
    const sealed = await sealTokens({
      accessToken: "at-live",
      expiresAt: Date.now() + 60_000,
    });
    const response = await request(app())
      .post("/glu/api/auth/todoist/logout")
      .set("Cookie", [`${SESSION_COOKIE}=${sealed}`]);

    expect(response.body).toEqual({ authenticated: false });
    expect(cookieValue(response.headers["set-cookie"], SESSION_COOKIE)).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
  });
});

describe("the API surface (ADR 11)", () => {
  it("answers healthz and 404s unknown API paths as JSON", async () => {
    await request(app()).get("/glu/api/healthz").expect(200, { ok: true, service: "glu-api" });
    const missing = await request(app()).get("/glu/api/nope");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "not_found" });
  });
});
