# ADR 22: Repository split — independent `backend/` and `web/` packages

- Status: Implemented
- Date: 2026-07-24
- Amended: 2026-07-24 — **each package now owns its own Dockerfile and is its
  own build context** (`web/Dockerfile`, `backend/Dockerfile`); the root
  `Dockerfile` and `.dockerignore` are gone. That also unparks ADR 16 step 8,
  so "containerising the backend" below is no longer out of scope. See ADR 16's
  amendment for the CI/compose/Caddy follow-through.

## Context

Until now GLU was one npm package at the repo root: the Next.js app in `src/`,
the Express Todoist proxy in `server/`, a single `package.json`, a single
lockfile, a single `node_modules`. ADR 11 chose that deliberately — "no
workspace split for one small service" — and named the reopening condition:
"split into workspaces only when the server grows real weight."

The owner has reopened it ahead of that condition (2026-07-24). The two halves
already have nothing in common at the code level: no module is imported across
the boundary, they run on different runtimes (browser/Next vs Node/Express),
they are tested by different Vitest environments, and only the web half is
containerised. Sharing one manifest meant the server's `npm ci` dragged in
Storybook, Playwright and Tailwind, and the web half carried Express types.

## Decision

**Two fully independent packages, each with its own `package.json`, lockfile
and `node_modules`. No root `package.json` and no npm workspace linking.**

```
justfile  Dockerfile  .github/  deploy/  docs/     ← repo-level only
web/      the Next.js app, Storybook, the e2e suite
backend/  the Express Todoist proxy (ADR 11)
```

- **No workspaces**, on the owner's call. Workspaces would restore a shared
  root manifest and hoisted `node_modules` — the coupling this split exists to
  remove. The cost is two `npm install`s and two lockfiles; the root `just
  install` runs both, so the ergonomic cost lands only on tooling.
- **`web/` owns everything the app needs to build itself** — `src/`, `public/`,
  `e2e/`, `.storybook/`, `img/` and `scripts/`, plus the Next, PostCSS,
  Vitest, Playwright and ESLint configs. `scripts/generate-icons.mjs` resolves
  its paths relative to its own file, so it moved unchanged and still reads
  `img/favicon.svg` and writes `public/icons/`.
- **`backend/` sources stay flat** (`app.ts`, `index.ts`, …) rather than
  gaining a `src/`, and **stays CommonJS**. Its imports are extensionless
  (`./config`), which NodeNext only resolves for CJS emit; adding
  `"type": "module"` would break every one of them. Output moved
  `dist-server/` → `backend/dist/`.
- **Each package owns its Dockerfile and is its own build context** (amended
  2026-07-24 — this originally kept one root Dockerfile that copied `web/`).
  `web/Dockerfile` builds `glu-web` from `web/`, `backend/Dockerfile` builds
  `glu-api` from `backend/`, and each has its own `.dockerignore`. The
  workflows select a tier by `context:` rather than by `file:`.
- **Each package lints and tests itself.** The web half keeps
  `eslint-config-next`; the backend gets `typescript-eslint` (see deviations).
  The `server` project moved out of the web Vitest config into a standalone
  `backend/vitest.config.ts`.

## Deviations

- **New dependency: `typescript-eslint` in `backend/`.** The server was
  previously linted by the root's `eslint-config-next` — the wrong rule set for
  a Node service, and unreachable once the packages install separately. The
  alternative was dropping server linting entirely, which would have been a
  regression. `no-unused-vars` keeps the `^_` escape hatch the old config
  allowed, since route handlers legitimately take `_req`.
- **`concurrently` is gone.** It existed only for the root `npm run dev` that
  started both halves. With no root package there is nothing to hang it off;
  the root `just dev` runs both as background jobs and traps `kill 0` on exit.
- **Paths in ADRs 01–21 predate this split.** They are historical records and
  were not rewritten: read `src/…` as `web/src/…` and `server/…` as
  `backend/…`. Only ADR 11's decision statement, which this ADR directly
  reverses, carries an amendment line.

## Out of scope

- ~~Containerising the backend (still ADR 16's parked leg).~~ — done in the
  2026-07-24 amendment above; ADR 16 step 8 is closed.
- Any change to what the two halves *do* — this is a move, not a rewrite. No
  runtime behaviour, route, component or blob schema changed.
- Sharing code between the halves. There is none today; if a shared type ever
  appears, that is a new ADR, not a silent third package.

## Acceptance criteria

- [x] No root `package.json`; `web/` and `backend/` each install standalone
      with their own lockfile (601 and 258 packages respectively).
- [x] `just backend lint` clean, `just backend test` 68/68 green,
      `just backend build` emits exactly the 7 runtime modules to `dist/` —
      no tests, no Vitest config.
- [x] `just web lint` clean, `test-unit` 162/162, `test-stories` 109/109 in
      both colour schemes, `build` and `build-storybook` succeed.
- [x] `just e2e` — 325 passed, 2 skipped against the production build.
- [x] `just dev` brings up both halves: web `/glu/healthz` → 200 and the API
      `/glu/api/auth/todoist/status` → `{"authenticated":false}`.
- [x] `just docker-build` builds both tiers from their own contexts.
      `glu-web` (204 MB) serves `/glu` → 200 with `/` → 404, preserving the
      basePath contract; `glu-api` (170 MB) serves `/glu/api/healthz` →
      `{"ok":true,"service":"glu-api"}` and `/glu/api/auth/todoist/status` →
      `{"authenticated":false}`, with a bare `/healthz` → 404 as expected.
      Both run as the unprivileged `node` user (uid 1000).
- [x] `just web icons` regenerates all four PNGs from `web/img/favicon.svg`.
