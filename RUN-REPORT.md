# RUN-REPORT — GLU overnight build

Built end to end from the 21 ADRs, in build order, per `GO.md`. Every ADR is
`Implemented` except ADR 16 Phase B, which is `Proposed` by design (its
artifacts are written; deployment is the human's call). Zero git commits, zero
pushes, zero deployment — as mandated.

## Morning commands

Updated for ADR 22 — the repo is now two independent packages (`web/`,
`backend/`) driven by a root `just` runner; there is no root `package.json`.

```bash
cd /repos/glu
just install             # both packages, if node_modules is missing

just dev                 # Next on :3000 and the Express API on :4000, together
                         # → open http://localhost:3000/glu   ( / 404s by design )
just web storybook       # every component, all 18 clocks, 3 chrome directions, :6006

just test                # unit + story tests both schemes, then the backend suite
just e2e                 # Playwright, prod build, 4 projects        (≈ 1–2 min)
just build               # Next production build + backend/dist
just web build-storybook # static Storybook

# Containers — two tiers, each with its own Dockerfile (docker → podman here):
just docker-build        # builds glu-web:dev and glu-api:dev
just web docker-run      # → curl http://127.0.0.1:3000/glu/healthz
just backend docker-run  # → curl http://127.0.0.1:4000/glu/api/healthz
# NOTE: rootless podman on this box does not forward published ports — if those
# curls return 000, rerun with `--network host` and no `-p`, overriding the port
# with `-e PORT=…` (web) or `-e API_PORT=…` (api).
```

Todoist login needs a registered app (none exists tonight) — without it the
Todoist region shows a clean logged-out state and nothing errors. See
`backend/.env.example` and `HUMAN-TODO.md`.

## Final gate (all green at end of run)

| Gate | Result |
|---|---|
| `npm test` (unit) | 33 files / 339 tests pass |
| `npm test` (story, light+dark) | 16 files / 109 tests pass |
| `npm run test:e2e` | 4 projects (Chromium/WebKit × tablet/half-tablet), all pass, 0 flaky over repeated runs |
| `npm run build` | pass |
| `npm run build-storybook` | pass |
| `npm run lint` | clean |
| `tsc --noEmit` (app + `tsconfig.server.json`) | clean |
| podman image + `/glu/healthz` + non-root | pass |

The command names above are as they stood on the night of the run; ADR 22 later
split the repo and moved them behind `just` (`tsconfig.server.json` became
`backend/tsconfig.json`). ADR 22 records its own re-verification of every gate.

## What shipped, per ADR

- **01 — Next.js + Mantine setup.** Next 16 + Mantine 9.4 + Tailwind v4 utility
  layer (no preflight, layered), `basePath: '/glu'`, SSR-safe `auto` scheme,
  favicon from `img/favicon.svg` with a dark-scheme ink swap.
- **02 — UI / timer engine.** Timestamp-based countdown (50 ms display tick),
  Zustand store with `persist` over a versioned `glu:vN` blob, preset/±
  semantics, environment toggles with the Silence rule, two-breakpoint layout,
  restore paths (running / paused / expired-while-away).
- **03 — Storybook + testing.** Storybook 10 (`nextjs-vite`), Mantine decorator,
  shared `src/theme.ts`, a11y addon as a hard gate, unit + story-play layers,
  `npm test` runs both, both schemes.
- **16-A — CI/CD (Phase A).** `tests.yml` (reusable), `ci.yml`, `publish.yml`
  (trigger commented out), web `Dockerfile` (standalone, non-root, `/glu/healthz`),
  `deploy/` examples + `SERVER.md`. Dockerfile validated with podman.
- **15 — Chrome design system.** Three switchable directions (`studio-quiet`
  default, `instrument`, `poster`) as a token contract; `chrome × clock × scheme`
  mix function; static token stylesheet + pre-paint bootstrap (no flash); a11y
  matrix as a unit test over the mix.
- **05 — Session tracking.** `finished`-only recording, idempotent per `runId`,
  day + 90-day archive, "New day" confirm, `glu:v1→v2` migration.
- **06 — Keyboard control.** `s`/`Ctrl+C` stop, `p` toggle, `n` restart-at-
  selected-duration; selection-safe Ctrl+C, editable-element and auto-repeat
  guards.
- **07 — Clock designs.** All 18 as pure components, both schemes, exported
  palettes, `clockProgress` helper, registry + completeness tests, fonts via
  `next/font`.
- **08 — Clock gallery.** In-place swipe/chevron gallery, active-only render,
  page repaint through chrome tokens, mobile first-viewport, `showSession`
  switch, persisted `activeClockId`.
- **09 — E2E Playwright.** Four projects on the prod build, `page.clock`,
  seeded storage, console tripwire (proven), core + every feature block active.
- **17 — Wake lock.** Hold-while-running + 5-min grace, deadline-based
  re-acquire, silent degrade, read-only (no timer transition).
- **18 — Session-end alerts.** WebAudio two-tone chime (gesture-primed),
  hidden-tab Notification with tag, live-finish-only, silent restore path.
- **04 — PWA.** `manifest.ts` under `/glu`, icon set generated from the SVG
  (`scripts/generate-icons.mjs`), apple-touch + dark/light theme-color, **no
  service worker** (E2E-asserted).
- **10 — Hidden header drawer.** Corner chevron → right Drawer (GitHub, theme,
  Settings), theme control relocated here, Settings modal socket.
- **11 — Todoist auth.** Express 5 in `server/`, four OAuth routes, sealed
  httpOnly cookie (iron-session), transparent refresh, brand login button /
  account chip. Supertest against a mocked upstream.
- **19 — Settings + shared auth substrate.** `useTodoistAuth` store, one status
  fetch, global-401 handler, near-full-size settings modal, one branded login
  component reused.
- **12 — Task view.** Allowlisted read-only proxy (`projects/labels/filters/
  sections/tasks`), priority inversion killed at the boundary, source picker,
  section grouping, 200-cap, abort-on-switch.
- **13 — Task detail.** Responsive drawer/modal, comments oldest-first, inline
  images via an **SSRF-hardened** image proxy (parse-then-check host allowlist,
  image-only, streaming size cap), gone-state.
- **14 — Focused task + time comments.** `ranMs` (capped at `endAt`), the first
  write verb (composing `POST /comment`), server-computed totals with author
  filter, persisted outbox + retry, 10-second undo bar.
- **20 — Task actions.** `close`/`reopen` verbs, optimistic complete + undo-by-
  reopen, one `TaskCircle`, generalised `UndoBar` host, cross-type displacement.
- **21 — Final-countdown takeover.** Edge-triggered last-60 s overlay in the
  page background, clock elevated above it, peek, reduced-motion crossfade,
  finished persistence, stacking contract (portals > undo bar > takeover).

## Deviations (all noted in-ADR, in the same session)

Highlights — each ADR's own deviation notes are authoritative:

- **Contrast** — Mantine's stock blue-6 (3.55:1) and dimmed gray-6 failed the
  ADR 03 a11y gate, so `primaryShade: 8` and remapped `--mantine-color-dimmed`
  (ADR 02/03). Todoist's brand red is theirs, so its login button uses large
  type (19px/700) to clear the gate (ADR 11). Grid/Tide light palettes darkened
  (ADR 07).
- **Blend modes** — the three blend-mode clocks (Pill/Tide/Field) dropped
  `mix-blend-mode: difference` (genuinely low-contrast and invisible to checkers)
  for honest ink-on-background readouts (ADR 07).
- **Node 25 localStorage** — a real in-memory `Storage` shim in the unit setup
  (ADR 03).
- **WebKit E2E** — Playwright's dependency check refuses the Arch-family box;
  `libicu74`/`libflite1` were vendored into the webkit bundle and
  `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` is set locally (CI uses
  `--with-deps`). See HUMAN-TODO (ADR 09).
- **ADR 13 → 20** — ADR 13's "detail mutates nothing" was deliberately, visibly
  relaxed by ADR 20 (the priority-circle complete), annotated in both.
- **ADR 04's "no sound at timer end"** — deliberately reversed by ADR 18
  (chime + Notification, still no service worker).

## Quarantined tests

**None.** No test was weakened, skipped, or quarantined. The only skipped E2E
is ADR 04's flow block *design*, which is active (ADR 04 is implemented); the
console tripwire's self-test is `test.fail()` (an expected failure, by design).

## Deferrals

`HUMAN-TODO.md` is the complete list. In short, everything deferred needs one of:
a git commit/push (forbidden this run), a GitHub repo, a registered Todoist app,
a real network cut, or physical tablet hardware. Nothing was silently skipped;
where a criterion needed real hardware or a real account, the equivalent
behaviour is covered by unit/supertest/stubbed-proxy tests and the deferral is
recorded both in the owning ADR and in `HUMAN-TODO.md`.

Two ADRs carry a recorded "verify at implementation" answer that could not be
obtained without a Todoist account, noted in-ADR and in HUMAN-TODO:
- **ADR 13** — whether `file_url` needs the bearer header (proxy works either way).
- **ADR 20** — Todoist's by-id behaviour for a completed task (both outcomes degrade).
