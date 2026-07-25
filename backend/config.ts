/**
 * Server configuration (ADR 11). Everything here comes from the environment;
 * nothing is ever a `NEXT_PUBLIC_*` value — these are the secrets the whole
 * backend exists to keep out of the browser.
 */

export const API_BASE_PATH = "/glu/api";

/** Todoist ground truth, verified against developer.todoist.com. */
export const TODOIST_AUTHORIZE_URL = "https://app.todoist.com/oauth/authorize";
export const TODOIST_TOKEN_URL = "https://api.todoist.com/oauth/access_token";
export const TODOIST_API_BASE = "https://api.todoist.com/api/v1";

/**
 * The roadmap needs read *and* complete; widening scope later is a full
 * re-consent round trip, so take what ADR 20 will need now (ADR 11).
 */
export const TODOIST_SCOPE = "data:read_write";

/** Access tokens last an hour; refresh a minute early to absorb clock skew. */
export const REFRESH_SKEW_MS = 60_000;

export interface ServerConfig {
  clientId: string;
  clientSecret: string;
  /**
   * The App Management Console's per-app **verification token**. Optional:
   * empty means the OAuth `state` stays a bare nonce, which is ADR 11's
   * original shape and behaves identically. See `mintState` in `session.ts`
   * for why the token is signed into the state rather than sent as it.
   */
  verificationToken: string;
  sessionSecret: string;
  publicOrigin: string;
  port: number;
  /** True when the app is served over HTTPS — controls the `Secure` flag. */
  secureCookies: boolean;
}

/** iron-session's floor, and the length `.env.example` tells you to generate. */
export const MIN_SESSION_SECRET_LENGTH = 32;

/**
 * Obviously fake so nobody mistakes it for a usable production value — and,
 * since it is committed, only ever tolerated for a **local** origin (see
 * `readConfig`). A deployment that reaches this key can be unsealed by anyone
 * holding the repo.
 */
const DEV_SESSION_SECRET = "glu-development-only-session-secret-not-for-production";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/**
 * Parse-then-use, because `startsWith("https://")` silently mis-answers two
 * ways: `PUBLIC_ORIGIN=ioan.dev` (no scheme) drops the `Secure` cookie flag,
 * and `https://ioan.dev/` builds a redirect URI with a double slash that
 * Todoist rejects. `URL.origin` normalises both away.
 */
function parseOrigin(raw: string): { origin: string; secure: boolean; local: boolean } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `[glu] PUBLIC_ORIGIN must be an absolute URL including the scheme — got "${raw}". ` +
        `Example: https://ioan.dev`,
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`[glu] PUBLIC_ORIGIN must be http(s) — got "${url.protocol}"`);
  }
  return {
    origin: url.origin,
    secure: url.protocol === "https:",
    local: LOCAL_HOSTS.has(url.hostname),
  };
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const { origin, secure, local } = parseOrigin(env.PUBLIC_ORIGIN ?? "http://localhost:3000");

  const supplied = env.SESSION_SECRET ?? "";
  const usable = supplied.length >= MIN_SESSION_SECRET_LENGTH;

  // Fail fast rather than fall back: a non-local origin means real cookies on a
  // real domain, and sealing those with the committed dev key hands the
  // Todoist token to anyone who can read this repo. Refusing to boot is the
  // only failure mode that cannot be missed.
  if (!usable && !local) {
    throw new Error(
      `[glu] SESSION_SECRET is required for a non-local PUBLIC_ORIGIN (${origin}) and must be ` +
        `at least ${MIN_SESSION_SECRET_LENGTH} characters. Generate one with: just backend secret`,
    );
  }

  return {
    clientId: env.TODOIST_CLIENT_ID ?? "",
    clientSecret: env.TODOIST_CLIENT_SECRET ?? "",
    verificationToken: env.TODOIST_VERIFICATION_TOKEN ?? "",
    sessionSecret: usable ? supplied : DEV_SESSION_SECRET,
    publicOrigin: origin,
    port: Number(env.API_PORT ?? 4000),
    secureCookies: secure,
  };
}

/**
 * With no Todoist app registered the whole surface degrades to a clean
 * logged-out state rather than an error screen (ADR 11's `status` contract).
 */
export function isConfigured(config: ServerConfig): boolean {
  return config.clientId !== "" && config.clientSecret !== "";
}

export const redirectUri = (config: ServerConfig) =>
  `${config.publicOrigin}${API_BASE_PATH}/auth/todoist/callback`;

/** Where the user lands after the OAuth dance. */
export const appUrl = (config: ServerConfig) => `${config.publicOrigin}/glu`;
