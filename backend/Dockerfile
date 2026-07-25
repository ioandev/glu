# GLU api tier — ADR 11's stateless Todoist proxy, containerised per ADR 16
# step 8 (the leg that ADR 16 parked and ADR 22 left parked).
# The build context is this package, not the repo root (ADR 22):
#   docker build -t glu-api backend/
# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /repo
# Copy manifests first so the dependency layer survives source-only changes.
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# tsc → dist/. Tests and the Vitest config are excluded by tsconfig, so dist/
# holds exactly the seven runtime modules.
RUN npm run build

# Production dependencies only, resolved in their own stage: the build stage's
# node_modules carries tsx, vitest, supertest and typescript-eslint, none of
# which the running server needs.
FROM node:24-alpine AS deps
WORKDIR /deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
# node:alpine already ships an unprivileged `node` user (uid 1000).
# Secrets (TODOIST_CLIENT_ID/_SECRET, SESSION_SECRET, PUBLIC_ORIGIN) come from
# the environment at run time — compose's `env_file` — never baked into a layer.
ENV NODE_ENV=production API_PORT=4000
COPY --from=deps --chown=node:node /deps/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/dist ./dist
# LICENSES carries the attribution AND GLU's own Apache-2.0 text + NOTICE, since
# this package is its own build context and cannot reach the repo root (ADR 23).
COPY --chown=node:node package.json LICENSES ./
USER node
EXPOSE 4000
# The router mounts at /glu/api, so the health route is /glu/api/healthz — a
# probe on a bare /healthz 404s, the same trap the web tier's basePath sets.
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://localhost:4000/glu/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# No --env-file-if-exists here: in a container the environment is injected
# directly, and a missing .env is the normal case rather than the fallback.
CMD ["node", "dist/index.js"]
