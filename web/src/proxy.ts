import { NextResponse, type NextRequest } from "next/server";
import { PAGE_LIMIT, clientKey, createRateLimiter } from "@/lib/rateLimit";

/**
 * The app owns its own CSP (ADR 16 amendment, 2026-07-25 security audit) and
 * meters its own render-costing requests (ADR 24).
 *
 * ADR 16 wrote a strict `script-src 'self'` into the Caddyfile; ADRs 01 and 15
 * each mandate a **required inline script** — Mantine's `ColorSchemeScript` and
 * the chrome pre-paint bootstrap — and Next's App Router adds its own inline
 * RSC/hydration bootstraps on top. `'self'` blocks all of them, so under the
 * policy as written the page renders and never hydrates. The tempting fix,
 * `'unsafe-inline'`, would delete the single mitigation that made ADR 16 call
 * the CSP "the payoff moment".
 *
 * A per-request nonce is the version that keeps the promise. Next reads the
 * nonce out of the **request's** `Content-Security-Policy` header and stamps it
 * on the scripts it emits itself; `layout.tsx` forwards the same value to the
 * two app-owned inline scripts via `x-nonce`.
 *
 * Consequence, accepted: a nonce is per-request, so pages can no longer be
 * statically prerendered and the `s-maxage` shell cache is gone. GLU is one
 * client-rendered page whose HTML is a few KB — the trade buys a real CSP.
 * It is also precisely why this file rate-limits: with no shell cache, every
 * page request is an SSR render, on a 512 MB container, for anybody.
 *
 * **Caddy must not also send a CSP for these routes.** Two `Content-Security-
 * Policy` headers intersect, and Caddy's has no nonce, so the intersection is
 * the broken policy this file exists to replace.
 *
 * This file was `middleware.ts` until ADR 24. Next 16 renamed the convention to
 * `proxy`, and — the reason the rename is in that ADR rather than a tidy-up —
 * `proxy.ts` defaults to the **Node.js runtime**, where the limiter's `Map` is
 * ordinary per-process module state. Under the edge runtime it was sandbox
 * state whose lifetime Next does not contract.
 */
/**
 * Static assets are fingerprinted and immutable; a nonce per chunk buys
 * nothing, and neither does a token. Filtered here rather than through
 * `config.matcher` because the matcher regexp is compiled with the basePath
 * baked in (`^/glu…`) and does not match at runtime under `basePath: '/glu'` —
 * verified against the built `middleware-manifest.json`.
 */
const SKIP = /^\/_next\/static|^\/_next\/image|\.(?:png|svg|ico|webmanifest|txt)$/;

/**
 * The container healthcheck and the deploy smoke step. Exempt from the limiter
 * only — it keeps its CSP. A limiter that can 429 this path fails the
 * healthcheck, which flips the service to unhealthy, which trips Caddy's
 * `depends_on: service_healthy`: an outage manufactured by the component that
 * exists to prevent one. `basePath` is stripped before this file sees the path,
 * so the real URL `/glu/healthz` arrives as `/healthz`.
 */
const HEALTH = "/healthz";

const limiter = createRateLimiter({ ...PAGE_LIMIT, label: "page" });

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (SKIP.test(pathname)) return NextResponse.next();

  if (pathname !== HEALTH) {
    const denied = meter(request);
    if (denied) return denied;
  }

  const nonce = crypto.randomUUID().replaceAll("-", "");

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced bootstrap load Next's chunks without
    // enumerating them; browsers that don't support it fall back to 'self'.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Mantine writes CSS-variable style attributes at runtime; there is no
    // nonce mechanism for those (ADR 01's styling model).
    "style-src 'self' 'unsafe-inline'",
    // Attachments are same-origin by construction — ADR 13's proxy is the
    // reason no Todoist host appears here.
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  // This is what Next reads to nonce its own inline scripts.
  headers.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  return response;
}

/**
 * Returns a 429 when the caller is over budget, `null` otherwise.
 *
 * A Next proxy sees headers and nothing else — there is no socket to read, as
 * Express has. It needs none: Next synthesises `X-Forwarded-For` from the peer
 * when the request arrives without one, so ADR 24's third fallback is already
 * in the header by the time this runs. Verified against the standalone build —
 * a client-supplied `X-Forwarded-For` is passed through rather than replaced,
 * which is exactly why `X-Glu-Client-IP` is consulted first and why only the
 * rightmost forwarded entry is ever trusted.
 */
function meter(request: NextRequest): NextResponse | null {
  const decision = limiter.take(clientKey(request.headers, ""));
  if (decision.ok) return null;

  // Plain text, not an error page: rendering one would spend exactly the
  // resource being defended.
  return new NextResponse("rate limited\n", {
    status: 429,
    headers: {
      "retry-after": String(decision.retryAfterSeconds),
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

// Deliberately no `config.matcher` — see SKIP above.
