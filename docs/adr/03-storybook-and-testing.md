# ADR 03: Storybook and UI testing

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-23 — follows ADR 02's deferral of the ring UI: the timer is a
  text display, so the ± test asserts the `remaining ≤ total` engine invariant,
  not a ring fraction.
- Amended: 2026-07-23 — the deferred E2E ADR materialized as ADR 09; pointers
  updated.
- Amended: 2026-07-24 — ADR 02 adopted Zustand: the "hook" test targets are
  the store's actions plus the thin `useCountdown` selector hook; the test
  list, fake-clock discipline, and all criteria are otherwise unchanged
  (store actions are plain functions — if anything, easier to test).

- Deviation (2026-07-24, implementation): Node 25 ships an experimental
  `localStorage` global that shadows jsdom's and is inert without
  `--localstorage-file`; `vitest.setup.ts` installs a real in-memory `Storage`
  so persistence and the `Storage.prototype.setItem` spy behave.
- Deviation (2026-07-24, implementation): the a11y gate is real, and Mantine's
  defaults failed it — `primaryShade` moved to 8 and `--mantine-color-dimmed`
  was remapped to gray-7/gray-5. ADR 02's "default Mantine theme" is amended to
  "default Mantine theme, contrast-corrected".
- Deviation (2026-07-24, implementation): "both schemes" is enforced by running
  the story project twice (`npm test` = unit + stories light + stories dark)
  rather than duplicating every story.
- Deviation (2026-07-24, implementation): the Storybook initialiser's
  `@chromatic-com/storybook` and `@storybook/addon-mcp` were removed — this ADR
  explicitly rejects Chromatic and names neither.

## Context

ADR 02 ships the entire visible product — timer engine with persistence, toggle
exclusivity rules, a two-breakpoint layout, and two color schemes — with a build
gate but no tests. Its riskiest logic is invisible in a browser walkthrough: drift
correction, the ran-out-while-away restore branch, transition-only localStorage
writes. PLAN.md allocates ADR 03 to Storybook and testing before the PWA (ADR 04)
and backend (04/05) build on top.

**Prerequisite: ADR 02 must be Implemented before this ADR starts** (there is
nothing to story or test until then).

Versions verified against npm on 2026-07-23: Storybook **10.5.3**
(`@storybook/nextjs-vite` at parity), Vitest **4.1.10**, Testing Library React
**16.3.2**, Playwright **1.61.1**. Storybook's docs recommend the Vite-based
Next.js framework; Mantine's Storybook guide targets Storybook 10+.

## Decision

- **We will use Storybook 10 with `@storybook/nextjs-vite`.** It's the
  documented recommendation (faster builds, better test support) and we have no
  custom webpack/babel config forcing the webpack variant. The app building with
  Turbopack while Storybook builds with Vite is two bundlers, accepted — the
  framework package resolves `next/image`, fonts, and aliases itself.
- **We will wire Mantine into Storybook per Mantine's own guide**: a preview
  decorator wrapping stories in `MantineProvider`, `@mantine/core/styles.css`
  imported in preview, and a **dark/light toolbar toggle** via `globalTypes` +
  `forceColorScheme`. The app's theme moves to a shared `src/theme.ts` imported
  by both the app and preview — one theme, two consumers, zero drift.
- **We will test on two layers, matching where the risk lives:**
  1. **Vitest 4 + jsdom + Testing Library** for logic: the `useCountdown` hook,
     persistence/restore, and the toggle-exclusivity reducer. This is where
     fake-clock control matters, and jsdom is the fastest place to have it.
  2. **Stories with play functions for every component**, run headlessly as
     Vitest tests via Storybook's Vitest integration (browser mode + Playwright).
     Stories double as living documentation and as interaction tests — one
     artifact, two jobs.
- **We will use Vitest, not Jest.** Same ecosystem as the Storybook framework
  (Vite), ESM-native against Next 16 / React 19, and one config language for
  both test layers. Jest buys nothing here but migration friction.
- **We will pin the required test list to ADR 02's decisions** (see outline) —
  the contract is "every decided behavior has a test", not a coverage
  percentage. A % gate on a codebase this small rewards padding, not safety.
- **We will include `@storybook/addon-a11y`** and treat contrast violations in
  either color scheme as failures — dark/light legibility is an ADR 02
  acceptance criterion; this automates it instead of eyeballing it forever.
- **We will add viewport presets for the two real targets** (~1180 px tablet,
  ~590 px half-tablet) so layout stories are reviewed at the widths that matter,
  not Storybook's defaults.

## Options considered

- **`@storybook/nextjs` (webpack)** — slower, and only justified by custom
  webpack config we don't have. Rejected.
- **Jest + RTL** — ESM/Next 16 friction, second config dialect next to Vite.
  Rejected.
- **Playwright E2E suite against the running app** — real-browser confidence,
  but a device-matrix cost this one-screen app doesn't justify yet; play
  functions in real Chromium cover the interaction risk. Rejected → deferred,
  since materialized as **ADR 09**.
- **Chromatic / visual regression snapshots** — a paid service and screenshot
  churn for a UI still expected to move. Rejected → revisit after visual
  identity stabilizes.
- **Coverage percentage gate** — measures lines, not decisions; the behavior
  checklist below is stricter where it counts. Rejected.

## Scope

### In scope

- Storybook 10 (`@storybook/nextjs-vite`) with Mantine provider decorator,
  dark/light toolbar, shared `src/theme.ts`, a11y addon, tablet/half-tablet
  viewport presets.
- Stories for every ADR 02 component: TimerPanel (idle/running/paused/finished),
  preset row, ± buttons, EnvironmentToggles, ThemeToggle, and the full app shell
  at both viewports.
- Play-function interaction tests on those stories, running headlessly via the
  Storybook–Vitest integration.
- Vitest unit tests for `useCountdown`, persistence/restore, and toggle
  exclusivity (full list in the outline).
- npm scripts: `storybook`, `build-storybook`, `test`, `test:watch` — `test`
  runs both layers.

### Out of scope

- CI pipeline (no repo host exists yet) → future **ADR: CI/CD** alongside
  deployment.
- App-level Playwright E2E → **ADR 09** (written 2026-07-23; deployment smoke
  reuses its suite via the CI/CD ADR).
- Visual regression / Chromatic → future ADR after visual identity work.
- Publishing Storybook anywhere — it runs locally only.
- Backend/API tests → **ADR 04/05** owns its own testing.
- Refactoring ADR 02 code beyond what testability strictly requires (extracting
  the storage module boundary is in; redesigning components is not).

## Implementation outline

1. **`npm create storybook@latest`**, selecting the Vite Next.js framework and
   the test (Vitest) setup it offers — the initializer wires the Vitest addon,
   browser mode, and Playwright; take its scaffold as source of truth for those
   package names rather than hand-installing.
2. **Mantine preview wiring** — decorator with `MantineProvider` +
   `forceColorScheme` from `context.globals.theme`, styles import, extract
   `src/theme.ts` and point the app's layout at it too. Add the two viewport
   presets and `@storybook/addon-a11y`. **Gotcha:** a story rendered without the
   provider fails with a cryptic "Mantine context" error — the decorator must be
   global in `preview.ts`, not per-story.
3. **jsdom environment shims** for the unit layer — Mantine components in jsdom
   need `matchMedia` and `ResizeObserver` mocks in a `setupFiles`; localStorage
   must be cleared between tests. **Gotcha:** miss the `matchMedia` shim and the
   first Mantine render throws, which reads like a component bug and burns an
   hour.
4. **`useCountdown` unit tests** with `vi.useFakeTimers()` +
   `vi.setSystemTime()` — the pair matters: fake timers alone don't advance
   `Date.now()`, and this hook reads the clock, not tick counts. Required cases:
   - start → running; pause freezes remaining; resume continues; stop resets to
     selected duration.
   - preset while idle and while running (total+remaining set, run state kept).
   - ±2/±5: remaining changes exactly, `total = max(total+Δ, remaining, 1 min)`,
     the `remaining ≤ total` invariant holds, subtract-past-zero → `finished`
     (the invariant is engine truth the future clock-face ADR will render).
   - suspension simulation: jump system time forward minutes past several missed
     ticks → next tick shows true remaining; jump past `endAt` → `finished`.
   - mm:ss formatting uses ceiling (20:00 stays 20:00 at start, not 19:59).
5. **Persistence tests** — spy on `Storage.prototype.setItem`: transitions
   write, ticks don't; restore running (future `endAt`), restore expired →
   `finished` silently, restore paused exactly; corrupt or missing `glu:v1`
   blob → clean defaults, no throw (the version field is the guard).
6. **Toggle reducer tests** — Silence clears Music/Podcast/TV/Noisy; any of
   those clears Silence; Headphones orthogonal in both directions.
7. **Stories + play functions** — state-variant stories for the timer panel
   (drive via props/initial state, not real time — a play function must not
   wait wall-clock seconds); interaction plays for preset tap, ± clamp,
   Silence exclusivity, theme toggle. **Gotcha:** the running-timer story needs
   a frozen or mocked clock, or Storybook's test runner gets flaky waits and
   the a11y snapshot diffs every run.
8. **Wire `npm test`** to run unit + story tests; verify `build-storybook`
   passes clean (it catches import/SSR issues `storybook dev` forgives).

Honest sizing: 1.5–2 days. Setup and Mantine wiring are half a day; the timer
and persistence test matrix is the real day; stories are quick once the
decorator is right.

## Acceptance criteria

- [x] `npm run storybook` starts; every ADR 02 component has at least one story; the timer panel has stories for idle, running, paused, and finished.
- [x] The Storybook toolbar switches all stories between dark and light; both render correctly (spot-check any story in both schemes).
- [x] Tablet (~1180 px) and half-tablet (~590 px) viewport presets exist; the app-shell story honors the layout contract at both.
- [x] The a11y addon reports no contrast violations on any story in either color scheme.
- [x] `npm test` runs unit and story tests in one command; all pass.
- [x] Every behavior listed in outline steps 4–6 has a named, passing test (reviewer can map list → test names).
- [x] The suspension case is tested: system time jumped forward past missed ticks yields the correct remaining; jumped past `endAt` yields `finished`.
- [x] Persistence tests prove transition-only writes (a running tick sequence performs zero `setItem` calls) and all three restore paths.
- [x] A corrupted `glu:v1` value does not crash the app in tests — defaults load.
- [x] `npm run build-storybook` and `npm run build` both complete with zero errors.
- [x] `src/theme.ts` is imported by both the app layout and Storybook preview (no duplicated theme object).

## Consequences

- ADR 02's riskiest logic (drift, restore, write discipline) is pinned by tests
  before later ADRs build on it (ADR 04 no longer adds a service worker —
  offline was cut from its scope — but sessions, hotkeys, and clocks all lean
  on this suite).
- Stories become the review surface for all future UI ADRs — Todoist lands with
  stories or it doesn't land.
- Two bundlers (Turbopack app, Vite Storybook) means an occasional
  works-in-one-not-the-other surprise; `build-storybook` in the test script is
  the tripwire.
- The behavior-checklist testing contract means every future ADR that adds
  behavior owes its own test-list section — this ADR sets that precedent.
- No CI yet: the suite only protects people who run it. The CI/CD ADR closes
  that gap and should come with deployment.
