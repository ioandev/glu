import type { NextFunction, Request, Response } from "express";
import type { ServerConfig } from "./config";

/**
 * Two small guards the proxy needs and nothing more (ADR 11 amendment,
 * 2026-07-25 security audit). Deliberately dependency-free: this is a
 * single-user app, and `express-rate-limit` + `helmet` would double the
 * backend's three-package dependency tree to solve a problem worth ~40 lines.
 */

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

/**
 * ADR 24's limits. Token buckets: `capacity` is the burst a human can spend at
 * once, `refillPerMinute` the sustained rate an abuser is left with.
 *
 * The auth plane is the only unauthenticated surface that costs anything: the
 * OAuth callback's `state` check is CSRF protection, **not** authentication —
 * a caller supplies both halves (their own cookie and their own query param),
 * so anyone can walk past it and make the server POST to Todoist's token
 * endpoint. Unmetered, that burns the app's Todoist rate budget and can lock
 * the real user out of logging in.
 */
export const AUTH_LIMIT = { capacity: 20, refillPerMinute: 10 } as const;

/**
 * The floor under every API route, including the ones that reach no router at
 * all — 404 probes and body-parse failures still cost `express.json()`.
 */
export const API_LIMIT = { capacity: 300, refillPerMinute: 300 } as const;

/**
 * 60/min is 900 per 15 minutes, deliberately **under Todoist's own budget of
 * 1000 requests per 15 minutes per user**. When Todoist 429s us the real user
 * loses their tasks until the window rolls; when we 429 a caller, only that
 * caller is affected. Tripping first is the whole point of the number.
 */
export const TODOIST_LIMIT = { capacity: 120, refillPerMinute: 60 } as const;

/**
 * Bounded so the limiter cannot become the memory-exhaustion bug it exists to
 * prevent. Far above one household's worth of clients.
 */
const MAX_TRACKED_KEYS = 10_000;
const SWEEP_INTERVAL_MS = 60_000;
/** A limiter that logs every rejection is a log-flood amplifier. */
const WARN_INTERVAL_MS = 10_000;

interface Bucket {
  tokens: number;
  updatedAt: number;
  warned: boolean;
}

export interface RateLimitOptions {
  capacity: number;
  refillPerMinute: number;
  /** Injectable for tests; production uses the wall clock. */
  now?: () => number;
  label?: string;
}

/**
 * Token bucket keyed by client IP (ADR 24). Duplicated from
 * `web/src/lib/rateLimit.ts` on purpose: ADR 22 forbids a shared dependency
 * between the packages, and ADR 24's limits table — not this code — is the
 * contract the two copies answer to.
 */
export function rateLimit(options: RateLimitOptions) {
  const { capacity, refillPerMinute, label = "rate" } = options;
  const now = options.now ?? (() => Date.now());
  const refillPerMs = refillPerMinute / 60_000;
  const buckets = new Map<string, Bucket>();
  let lastSweepAt = 0;
  let lastWarnAt = 0;

  /**
   * A full bucket is indistinguishable from a never-seen key, so dropping one
   * is free. Only if that cannot get under the cap does insertion-order
   * eviction run, and that does hand back an allowance.
   */
  function sweep(at: number): void {
    lastSweepAt = at;
    for (const [key, bucket] of buckets) {
      if (bucket.tokens + (at - bucket.updatedAt) * refillPerMs >= capacity) {
        buckets.delete(key);
      }
    }
    while (buckets.size >= MAX_TRACKED_KEYS) {
      const oldest = buckets.keys().next();
      if (oldest.done) break;
      buckets.delete(oldest.value);
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = clientKey(req);
    const at = now();
    let bucket = buckets.get(key);

    if (!bucket) {
      if (at - lastSweepAt >= SWEEP_INTERVAL_MS || buckets.size >= MAX_TRACKED_KEYS) {
        sweep(at);
      }
      bucket = { tokens: capacity, updatedAt: at, warned: false };
      buckets.set(key, bucket);
    } else {
      bucket.tokens = Math.min(capacity, bucket.tokens + (at - bucket.updatedAt) * refillPerMs);
      bucket.updatedAt = at;
    }

    if (bucket.tokens < 1) {
      if (!bucket.warned && at - lastWarnAt >= WARN_INTERVAL_MS) {
        bucket.warned = true;
        lastWarnAt = at;
        console.warn(`[glu] ${label} limit reached for a client`);
      }
      const retryAfter = Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000));
      res.setHeader("retry-after", String(retryAfter));
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    bucket.tokens -= 1;
    bucket.warned = false;
    next();
  };
}

/**
 * ADR 24's resolution order: an explicit `X-Glu-Client-IP` override, then
 * `X-Real-IP` (which nginx-proxy *assigns* from `$remote_addr`, so a caller's
 * copy is replaced), then `req.ip` — already "rightmost `X-Forwarded-For`
 * entry, else the socket" thanks to `app.set("trust proxy", 1)`, which is the
 * right end of that header to read since nginx-proxy **appends** to it.
 *
 * This tier never counts hops: a count one too high promotes the leftmost,
 * caller-written entry into the key and hands out a bypass.
 */
export function clientKey(req: Request): string {
  return (
    normalizeIp(req.get("x-glu-client-ip") ?? "") ||
    normalizeIp(req.get("x-real-ip") ?? "") ||
    normalizeIp(req.ip ?? "") ||
    "unknown"
  );
}

// Not ReDoS-able: every quantifier is bounded and none nest, so backtracking
// is constant — safe-regex is conservative about `{1,3}` expansion (ADR 38).
// eslint-disable-next-line security/detect-unsafe-regex
const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Strips brackets and ports, then keys IPv6 by its /64 prefix — a residential
 * client holds a whole /64, so keying the full /128 lets one machine rotate
 * through billions of buckets and walk past any limit.
 */
export function normalizeIp(raw: string): string {
  let value = raw.trim();
  if (!value) return "";

  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    value = close === -1 ? value.slice(1) : value.slice(1, close);
  } else if (value.split(":").length === 2) {
    // Exactly one colon is `1.2.3.4:5678`; splitting a bare IPv6 on ":" is the
    // classic wrong fix, so branch on the count rather than doing it blindly.
    value = value.slice(0, value.indexOf(":"));
  }

  value = value.trim();
  if (!value) return "";

  const mapped = IPV4_MAPPED.exec(value);
  if (mapped) return mapped[1];

  return value.includes(":") ? ipv6Prefix(value) : value;
}

/** `2001:db8::1` and `2001:0db8:0000:0000::1` must key the same. */
function ipv6Prefix(address: string): string {
  const [head, tail] = address.split("::", 2);
  const left = head ? head.split(":") : [];
  const right = tail === undefined ? [] : tail ? tail.split(":") : [];

  let hextets: string[];
  if (tail === undefined) {
    hextets = left;
  } else {
    const missing = 8 - left.length - right.length;
    if (missing < 0) return address.toLowerCase();
    hextets = [...left, ...Array<string>(missing).fill("0"), ...right];
  }

  const prefix = hextets.slice(0, 4);
  while (prefix.length < 4) prefix.push("0");
  return `${prefix.map((h) => h.toLowerCase().padStart(4, "0")).join(":")}::/64`;
}

/* -------------------------------------------------------------------------- */
/* Security headers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The headers the Caddyfile used to add, moved into the app when the proxy
 * became nginx-proxy (ADR 16 amendment, 2026-07-25). They live here rather
 * than in proxy config because they are properties of *these responses*, and
 * the repo has already paid once for a security header owned by a tier that
 * could not see what it was protecting (the 2026-07-25 audit's F-2 CSP).
 *
 * HSTS is the deliberate exception and stays at the proxy: it is a statement
 * about the TLS connection, which is the only thing that terminates TLS.
 *
 * The CSP here is the strictest one there is, and the API can have it because
 * it only ever returns JSON — no scripts, so no nonce, so none of what made
 * the page tier's CSP hard (ADR 16 amendment).
 */
export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader(
      "content-security-policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
    next();
  };
}

/* -------------------------------------------------------------------------- */
/* Cross-origin write rejection                                               */
/* -------------------------------------------------------------------------- */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence in depth. The sealed cookie is `SameSite=Lax`, which already
 * withholds it from a cross-site POST — but that is one browser-side default
 * carrying the entire write surface, and `close`/`reopen` take no body, so a
 * cross-site auto-submitting form would otherwise be a complete request.
 *
 * Two independent checks, both "reject known-bad" rather than "require
 * known-good": CSRF is a *browser* attack, and every browser that can mount
 * one sends at least one of these headers. A request carrying neither is not a
 * browser (curl, supertest), where an attached cookie is not CSRF at all.
 */
export function rejectCrossOriginWrites(config: ServerConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    // `none` is a user-initiated navigation (address bar, bookmark) — no
    // initiator origin to distrust.
    const site = req.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      res.status(403).json({ error: "cross_origin_write" });
      return;
    }

    const origin = req.get("origin");
    if (origin && origin !== config.publicOrigin) {
      res.status(403).json({ error: "cross_origin_write" });
      return;
    }

    // An HTML form can only send urlencoded, multipart or text/plain — so
    // demanding JSON on anything that declares a type closes the form vector
    // even if both headers above are absent.
    const contentType = req.get("content-type");
    if (contentType && !contentType.toLowerCase().startsWith("application/json")) {
      res.status(415).json({ error: "unsupported_media_type" });
      return;
    }

    next();
  };
}

/* -------------------------------------------------------------------------- */
/* Error shape                                                                */
/* -------------------------------------------------------------------------- */

interface BodyParserError extends Error {
  type?: string;
  status?: number;
  statusCode?: number;
}

/**
 * Without this, `express.json()` failures fall through to Express's default
 * finalhandler, which answers **HTML** — and, whenever `NODE_ENV` is not
 * `production`, an HTML page carrying a full filesystem-path stack trace. Both
 * are reachable unauthenticated, since the body parser runs before the router.
 * The API's contract is `{ error }` JSON; make that true for every exit.
 */
export function errorHandler() {
  return (error: BodyParserError, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error?.type === "entity.too.large") {
      res.status(413).json({ error: "payload_too_large" });
      return;
    }
    if (error?.type === "entity.parse.failed" || error?.type === "entity.verify.failed") {
      res.status(400).json({ error: "bad_request" });
      return;
    }

    const status = error?.status ?? error?.statusCode ?? 500;
    if (status >= 400 && status < 500) {
      res.status(status).json({ error: "bad_request" });
      return;
    }

    // Never the message: an unexpected error's text can carry internals.
    console.error("[glu] unhandled error", error?.message);
    res.status(500).json({ error: "internal_error" });
  };
}
