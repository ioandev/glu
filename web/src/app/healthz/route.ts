/**
 * Liveness probe for the container healthcheck and the deploy smoke step.
 * `basePath` applies, so the real URL is `/glu/healthz` — a healthcheck aimed at
 * `/healthz` silently 404s (ADR 16's documented gotcha).
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ ok: true, service: "glu-web" });
}
