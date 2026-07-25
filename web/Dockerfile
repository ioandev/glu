# GLU web tier (ADR 16). Next.js standalone output → slim non-root runtime.
# The build context is this package, not the repo root (ADR 22):
#   docker build -t glu-web web/
# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /repo
# Copy manifests first so the dependency layer survives source-only changes.
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NOTE: no BACKEND_URL build arg on purpose. `next build` bakes rewrite
# destinations into routes-manifest.json, so GLU keeps the /glu/api rewrite
# development-only and lets Caddy route that path to the api container in
# production (ADR 16).
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
# Fixed UID/GID 5330 — matches the host deploy perms for glu-web (server-2-perms),
# so the container process and its files line up with the server user. Replaces
# node:alpine's default `node` (uid 1000); GLU is stateless and mounts nothing.
RUN addgroup -g 5330 -S app && adduser -u 5330 -S -G app -h /app -H app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# `output: 'standalone'` emits a minimal server + node_modules under
# .next/standalone; static assets and public/ are copied alongside it.
COPY --from=build --chown=app:app /repo/.next/standalone ./
COPY --from=build --chown=app:app /repo/.next/static ./.next/static
COPY --from=build --chown=app:app /repo/public ./public
# Attribution ships with the image (ADR 23). This package is its own build
# context (ADR 22), so the root LICENSE and NOTICE are embedded inside the
# generated manifest rather than copied as separate files.
COPY --from=build --chown=app:app /repo/LICENSES ./LICENSES
USER app
EXPOSE 3000
# basePath means the app answers under /glu — a probe on /healthz 404s silently.
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://localhost:3000/glu/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
