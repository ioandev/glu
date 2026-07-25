# ADR 09: End-to-end tests with Playwright

- Status: Implemented (deviations noted)
- Date: 2026-07-23

- Deviation (2026-07-24, implementation): ADRs 05, 06 and 08 were already
  Implemented when this ADR landed, so their flow blocks ship **active**, not
  skipped. Only ADR 04's block carries a `test.skip` naming the pending ADR.
- Deviation (2026-07-24, implementation): the local `test:e2e` script sets
  `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`. Playwright's dependency check
  only knows Debian/Ubuntu package names and refuses to launch on the Arch-family
  dev box; CI installs the real dependencies with `--with-deps`. WebKit's
  `libicu74`/`libflite1` were vendored into the browser bundle locally.
- Deviation (2026-07-24, implementation): `seedStorage` plants its blob **only
  when no `glu:v*` key exists**. `addInitScript` runs on every navigation, so an
  unconditional seed silently restores itself across `page.reload()` and every
  reload assertion passes vacuously — this bit two tests before it was caught.
- Deviation (2026-07-24, implementation): the running-restore test pauses the
  fake clock (`clock.pauseAt`) before reloading, so the reload itself cannot
  consume run time.

## Context

ADR 03 built two test layers (Vitest/jsdom units, story play-functions in real
Chromium) and explicitly deferred an app-level E2E suite to a named future ADR.
Product decision (2026-07-23): write that ADR now. It takes **09** — 08 remains
reserved for the clock gallery per the ADR 07 brief; numbers are assignments,
not write-order.

E2E exists to cover exactly what the other layers *cannot* see:

- **True reloads.** ADR 02/05's restore paths (running / paused / expired /
  v1→v2 migration) are unit-tested against mocks; only a real browser
  navigation proves them end to end.
- **The prod build under `basePath: '/glu'`** — the classic works-in-dev,
  404s-deployed failure class (assets, favicon, manifest resolution).
- **Real keyboard events** (ADR 06), **real localStorage across contexts**,
  hydration cleanliness on first paint.
- **ADR 04's install collateral** — manifest and icon responses (actual
  install UX is not automatable in a meaningful way; asserting the collateral
  is).

There is no backend at core-suite time (the backend arrives with ADR 11 as a
stateless Todoist proxy — its permanent scope), so the core flows need no
network mocking at all — a rare luxury; take it.

Versions verified against npm on 2026-07-23: Playwright **1.61.1** (already a
transitive presence via ADR 03's story-test browser runner; this ADR adds
`@playwright/test` as a first-class harness).

**Prerequisites: ADRs 01–03 Implemented** for the core suite. Flows for 04, 05,
06, and 08 activate as those ADRs land (flow map below) — the suite is designed
to grow, not to block on the whole roadmap.

## Decision

- **We will use `@playwright/test` against the production build**, started via
  Playwright's `webServer` config (`next build && next start`). Dev mode
  forgives what prod does not, and prod-under-basePath is a primary target of
  this suite, not an afterthought.
- **Browser × viewport matrix mirrors the real targets, nothing more:**
  Chromium + WebKit (Android tablet Chrome and iPad Safari are the product
  surfaces; Firefox is not) × tablet (~1180 px) and half-tablet (~590 px)
  viewports. Four projects; a one-screen app keeps the matrix cheap.
- **We will drive time with Playwright's clock API (`page.clock`), never
  wall-clock waits.** A pomodoro suite that actually waits is unrunnable;
  `clock.install` + `fastForward` runs a 20-minute session in milliseconds and
  — because ADR 02 derives everything from `Date.now()`/`endAt` — exercises
  the *real* timekeeping logic, not a test double.
- **State seeding via `addInitScript`**: tests plant `glu:v1`/`glu:v2` blobs
  before page scripts run to hit every restore branch deterministically,
  including the ran-out-while-away path and the v1→v2 migration.
- **A console tripwire in every test**: any console error or hydration warning
  fails the test. It's ten lines in a fixture and permanently guards the
  SSR/theming promises made since ADR 01.
- **Flake discipline as policy**: web-first assertions only, no `waitForTimeout`,
  trace-on-retry, at most 1 retry locally. A flaky E2E suite trains people to
  ignore red; better small and trusted.
- **`npm run test:e2e` is a separate script, not part of `npm test`.** The
  unit/story loop stays seconds-fast; E2E is minutes and runs before merges
  and releases (and in CI once the CI/CD ADR exists).
- **`baseURL` is parameterized** (`E2E_BASE_URL`, default
  `http://localhost:3000/glu/`) so the identical suite later smoke-tests the
  deployed `ioan.dev/glu` — deployment verification reuses this suite rather
  than growing its own.
- **Flow map — each block becomes mandatory when its ADR reaches Implemented:**
  - *Core (ADRs 01–03):* app loads under `/glu` with zero 404s and a clean
    console; timer start/pause/resume/stop; preset and ± semantics;
    reload-while-running, reload-while-paused, reload-after-expiry restores;
    Silence exclusivity; theme toggle persists across reload with no flash.
  - *ADR 04:* manifest served and parseable under `/glu/`; 192/512 icons
    respond 200; `navigator.serviceWorker.getRegistrations()` is empty.
  - *ADR 05:* finish → count 1 → finish → 2; expired-while-closed records
    exactly once across two reloads; New day confirm/cancel; v1→v2 migration.
  - *ADR 06:* `s`/`Ctrl+C`/`p`/`n` real-keyboard flows including the
    selection-guard (Ctrl+C with selected text must not stop the timer).
  - *ADR 08:* gallery flip changes clock and site palette; choice survives
    reload; mobile first-viewport layout at the half-tablet project.

## Options considered

- **Fold E2E into ADR 03** — different harness (built server), different speed
  class, different flake profile; 03 shipped its scope and rejected this
  knowingly. Rejected again.
- **Cypress** — second-place on every axis that matters here (WebKit support,
  clock API maturity, parallel workers, trace viewer), and Playwright is
  already in the toolchain via story tests. Rejected.
- **Wait for the CI/CD ADR and write them together** — the recommendation the
  product owner overrode; writing now costs nothing if the suite is designed
  for `baseURL` reuse (it is). Superseded by owner decision, recorded.
- **Firefox in the matrix** — not a product target on any device the plan
  names; every project multiplies runtime. Rejected.
- **Real-device farm (BrowserStack etc.)** — money and flake for a personal
  tool; WebKit engine coverage approximates the iPad risk acceptably. Rejected.
- **Testing PWA install UX itself** — Chrome's install prompt isn't
  automatable end-user-style; asserting manifest/icon collateral is the honest
  automatable proxy. Scoped to that.

## Scope

### In scope

- Playwright config (four projects, `webServer` on the prod build,
  parameterized `baseURL`), fixtures (console tripwire, clock helpers,
  storage seeding), and the **core flow block** (ADRs 01–03 surface).
- Flow blocks for 04/05/06/08 as written specs in the suite, skipped-with-reason
  until their ADRs are Implemented, activated as each lands.
- `npm run test:e2e` (+ `test:e2e:ui` for the Playwright UI mode).
- A short testing section in the README (what runs where, when).

### Out of scope

- CI wiring, merge gates, scheduled runs → future **ADR: CI/CD** (unchanged in
  the unnumbered list; this suite is its main payload).
- Deployed-environment smoke runs → same CI/CD ADR, via `E2E_BASE_URL`.
- Visual regression / screenshot comparison → unchanged ADR 03 position.
- Accessibility audits → ADR 03's a11y addon owns that layer.
- Performance/Lighthouse budgets → future ADR if ever.
- Backend API testing → ADR 11 brings its own (supertest on the proxy).

## Implementation outline

1. **Install and config** — `@playwright/test`, `playwright.config.ts`:
   four projects, `webServer: next build && next start`, `baseURL` from env
   with the local default. **Gotcha (the basePath footgun):** `baseURL` ends
   in `/glu/` and relative navigation must be `page.goto('.')` — a leading
   slash (`goto('/')`) resolves against the *origin* and silently escapes the
   basePath; wrap navigation in a tiny helper so nobody relearns URL
   resolution the hard way.
2. **Fixtures** — extend `test` with: console tripwire (fail on
   `console.error` / hydration warnings, allowlist nothing until forced);
   `seedStorage(blob)` via `addInitScript`; clock bootstrap. **Gotcha:**
   `page.clock.install()` must run **before first navigation** or the app
   captures the real clock; install it in the fixture, not mid-test.
3. **Core flows** (ADR 01–03 surface) — load/no-404s/clean-console; timer
   lifecycle driven by `clock.fastForward`; the three reload-restore
   branches via seeded storage + real `page.reload()`; Silence exclusivity;
   theme persistence. **Gotcha:** after `fastForward` past zero, assert on
   the `finished` UI state, not on elapsed wall time — the display tick is
   display cadence, not the source of truth.
4. **Feature flow blocks** for 04/05/06/08, written now, `test.skip` with the
   ADR status as the reason string, activated as each ADR lands (activation is
   part of that ADR's definition of done from here on).
5. **Scripts + README** — `test:e2e`, `test:e2e:ui`, doc blurb.

Honest sizing: **1.5 days** for harness + core flows, tests included. The
feature blocks are ~an hour each at activation time, priced into their ADRs'
implementation, not here.

## Acceptance criteria

- [x] `npm run test:e2e` builds the app, starts it, and runs green on all four projects (Chromium/WebKit × tablet/half-tablet) with zero flake across three consecutive runs.
- [x] The suite navigates exclusively under `/glu/` and at least one test asserts no request during load 404s (assets, favicon, CSS).
- [x] Any injected `console.error` makes a test fail (tripwire verified by a deliberate failing fixture test, then removed or marked expected-fail).
- [x] A full 20-minute timer session completes via `page.clock` in under 10 seconds of real runtime; no test contains `waitForTimeout`.
- [x] Reload-while-running, reload-while-paused, and reload-after-expiry each have a passing test using seeded storage and a real `page.reload()`.
- [x] Theme choice survives reload with no console hydration warnings (tripwire active during that test).
- [x] Flow blocks for ADRs 04, 05, 06, and 08 exist in the suite; 05/06/08 are **active** (their ADRs were Implemented first), and 04's is skipped with a reason naming it.
- [x] `E2E_BASE_URL=<url> npm run test:e2e` targets an arbitrary URL (verified by pointing it at the local server on a nonstandard port).
- [x] E2E is not part of `npm test`; unit/story suite runtime is unchanged.
- [x] README documents the three test layers and when each runs.

## Consequences

- The restore/persistence promises accumulated since ADR 02 finally get proven
  in a real browser against a real prod build — the highest-risk untested gap
  in the current plan closes.
- Every feature ADR from here on owes an E2E flow-block activation as part of
  its definition of done (this extends ADR 03's behavior-checklist precedent
  by one layer).
- Two Playwright roles now exist in the repo (story-test runner and E2E
  harness); version bumps touch both — pin them together.
- Until the CI/CD ADR lands, the suite only protects whoever runs it — the
  standing gap ADR 03 already recorded, now with a bigger payload waiting on
  it.
- The `baseURL` parameterization means deployment verification later is a CI
  job definition, not new test code.
