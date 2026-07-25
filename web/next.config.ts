import type { NextConfig } from "next";

/**
 * The dev-only proxy to the Express API (ADR 11 mounts it at `/glu/api`).
 *
 * Next evaluates `rewrites()` at **build** time and bakes the destination into
 * routes-manifest.json — a runtime env var in compose is read far too late to
 * matter (ADR 16's poached footgun). So this rewrite is deliberately
 * development-only: in production Caddy routes `/glu/api/*` straight to the api
 * container and nothing about the API URL is ever baked into the image.
 */
const devApiRewrites = async () => [
  {
    // `source` is matched *after* the basePath is stripped, so `/api/:path*`
    // catches the browser's `/glu/api/...`. The Express server mounts its router
    // at the full `/glu/api`, so the destination keeps that prefix — `basePath`
    // does not apply to an absolute rewrite destination.
    source: "/api/:path*",
    destination: `${process.env.GLU_DEV_API_URL ?? "http://localhost:4000"}/glu/api/:path*`,
  },
];

/**
 * The non-CSP security headers the Caddyfile used to add, moved into the app
 * when the proxy became nginx-proxy (ADR 16 amendment, 2026-07-25).
 *
 * The CSP is NOT here: it is per-request and nonce-bearing, so it comes from
 * `src/proxy.ts` and nowhere else (ADR 16's earlier amendment — two
 * Content-Security-Policy headers intersect, and the losing intersection is a
 * page that never hydrates). HSTS is not here either: it belongs to whatever
 * terminates TLS, which is the proxy.
 */
const securityHeaders = async () => [
  {
    source: "/:path*",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
];

const nextConfig: NextConfig = {
  headers: securityHeaders,
  // GLU is served from ioan.dev/glu — the subpath is a day-one constraint (ADR 01).
  // Locally this means the app lives at http://localhost:3000/glu and `/` 404s.
  basePath: "/glu",
  // Minimal server + node_modules for the runtime image (ADR 16).
  output: "standalone",
  // Caddy strips `Server`; this is the matching header on the Next tier
  // (2026-07-25 security audit, F-8).
  poweredByHeader: false,
  // GLU renders zero `next/image` — comment attachments come through ADR 13's
  // hardened proxy as plain `<img>`. Leaving the optimizer on shipped `sharp`
  // (and its libvips CVEs) into the runtime image for a route nothing calls
  // (F-7). `unoptimized` retires the route; the trace exclusion is what
  // actually keeps the native library out of the image — Next traces sharp
  // whenever it is installed, optimizer or no optimizer.
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "*": ["node_modules/sharp/**", "node_modules/@img/**", "node_modules/next/node_modules/sharp/**"],
  },
  ...(process.env.NODE_ENV === "development" ? { rewrites: devApiRewrites } : {}),
};

export default nextConfig;
