# ADR 02: UI implementation — timer, environment toggles, theming

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-23 — 50 ms tick; timer/toggle state persists to localStorage and
  survives reload, tab close, and suspension (product decision, reversing this
  draft's original no-persistence stance).
- Amended: 2026-07-23 — circular ring UI deferred to a future **ADR: custom clock
  UI** (hand-built clock face); this ADR ships a plain text timer display instead
  of `RingProgress`.
- Amended: 2026-07-23 — the deferred clock-face work materialized as **ADR 07**
  (clock components) and **ADR 08** (gallery integration); pointers updated.
- Amended: 2026-07-23 — the corner theme toggle's placement is interim:
  **ADR 10** relocates it into the hidden header drawer (mechanics unchanged;
  build it in the corner here, move it there).
- Amended: 2026-07-23 — **ADR 08** supersedes the no-scroll contract *below
  `sm` only*: the clock owns the first `100dvh` viewport and the page scrolls.
  The at/above-`sm` contract is unchanged. ADR 08 also performs the
  text-display → clock swap this ADR's props seam was built for.
- Amended: 2026-07-23 — **ADR 14** extends the engine additively: a per-run
  `ranMs` (actual running time, accumulated across pauses, persisted with the
  run) and a run-end event `{runId, ranMs, endKind}`. `total − remaining` is
  NOT ran-time once ± adjustments exist — consumers use `ranMs`.
- Amended: 2026-07-24 — this ADR's visuals are **interim: functional, not
  perfect**. **ADR 15** (app chrome design system) is the visual authority;
  build plain here, don't polish twice. Behavioral criteria stand unchanged.
- Amended: 2026-07-24 — **state management reversed by owner decision:
  Zustand (5.0.14) is the state layer**, replacing "plain React state, no
  library". Persistence semantics are unchanged (versioned blob, migrations,
  write-on-transition) — the mechanism becomes Zustand's `persist`
  middleware. Boundary rule: the store owns shared/persisted app state;
  purely-local UI state (drawer open, popovers) stays `useState`.
- Amended: 2026-07-25 — **the 50 ms interval becomes a `requestAnimationFrame`
  loop** (owner report: the clock animations stepped rather than moved). A fixed
  interval beats out of phase with the compositor, so the same value was drawn
  twice or skipped; frame-pacing is finer (~8–17 ms), never computes a value for
  a frame that will not be drawn, and degrades by dropping frames instead of
  queueing work. `BACKGROUND_TICK_MS = 1000` survives underneath it as the
  hidden-tab safety net that still lands `finish()` (ADR 18's alerts depend on
  it). Everything else about the engine is unchanged — still recomputed from
  `endAt`, still no per-tick store write, still ceiling-rounded digits. The
  companion half is in ADR 07: the clocks now receive **milliseconds**, since a
  whole-second prop caps every geometry at one move per second no matter how
  often it re-renders.

- Deviation (2026-07-24, implementation): the `glu:vN` key carries Zustand
  `persist`'s `{ state, version }` envelope rather than a bare flat object — a
  custom `PersistStorage` maps the middleware's single `name` onto the versioned
  key (read falls back through older keys, write lands on the current one and
  deletes superseded ones). The versioned-key contract of ADRs 02/05 is
  preserved; only the value's outer shape is Zustand's.
- Deviation (2026-07-24, implementation): `persist` runs with
  `skipHydration: true` and a `useHydrated()` mount effect, which is how the
  ADR's "hydrate with defaults, then load persisted state in a mount effect"
  gotcha is honoured under SSR.
- Deviation (2026-07-24, implementation): "default Mantine theme + default blue
  primary" ships **contrast-corrected** — `primaryShade: 8` and a remapped
  `--mantine-color-dimmed` — because ADR 03's a11y gate fails Mantine's stock
  blue-6 (3.55:1) and dimmed gray-6 (3.32:1). ADR 15 owns real colour.
- Deviation (2026-07-24, implementation): subtracting past zero from `idle`
  (no run in flight) enters `finished` without minting a run, so it records no
  session — ADR 05's "only a completed run counts" rule wins the corner case.
  **Superseded 2026-07-25 by ADR 32**: with no run in flight, − now clamps at
  the one-minute floor instead. Entering the done state for a run nobody ever
  started was always the odd behaviour here; the "records no session" half of
  the rule is what mattered and it is now unreachable.
- Deviation (2026-07-25, owner): the adjust row is **+1 / +5 / −1 / −5**, not
  ±2/±5 — the small step is a one-minute nudge. Only the two labels and their
  deltas move; every rule about what ± *does* is untouched (mid-run they apply
  to `remaining` with `total` following, and ADR 32 owns the no-run-in-flight
  case). Read every "±2" in this ADR, in ADR 21's retraction example and in
  ADR 28's repro as "±1"; the singular button also drops the plural from its
  accessible name ("Subtract 1 minute").
- Amended: 2026-07-25 — **the ± rule below is scoped to a run in flight**
  (ADR 32). Running or paused it is unchanged, word for word. At `idle` or
  `finished` there is no run to trim, so ± writes `selectedDuration` as well and
  the preset row shows the result as an eighth, custom rung. The two faults that
  forced it — `remaining` being 0 at `finished`, and `start()` re-arming from
  `selectedDuration` — are both still correct in isolation; only together did
  they silently discard every adjustment made at 00:00.

## Context

PLAN.md defines the whole visible product: a pomodoro countdown with a circular
progress ring, preset durations, ±minute adjustments, environment toggles, and a
reserved top-right area for a future Todoist integration — tablet-first, sometimes
half-tablet width, dark/light both first-class. ADR 01 provides the scaffold
(Next 16 + Mantine 9.4, `basePath: '/glu'`, SSR-safe `auto` color scheme).

**Prerequisite: ADR 01 must be Implemented before this ADR starts.**

PLAN.md is silent on several behaviors a developer would otherwise have to invent
mid-implementation. This ADR pins them down as decisions so the code has one
defensible interpretation.

## Decision

### Timer engine

- **We will keep time from timestamps, not tick counting.** Running state stores
  `endAt` (epoch ms); the UI recomputes `remaining = endAt - now` **once per
  animation frame** (2026-07-25 amendment; originally a 50 ms interval).
  `setInterval(count--, 1000)` drifts and freezes in backgrounded tabs; timestamp
  derivation is self-correcting — a throttled, coalesced or dropped callback is
  harmless here because every one of them recomputes from the clock rather than
  counting. The frame loop is a foreground display rate — the refresh rate the
  clock faces need — not a timekeeping mechanism; a hidden tab gets no frames at
  all, so a 1 s interval runs underneath it purely to land the end-of-run
  transition.
- **We will persist state to localStorage and restore it on load.** One versioned
  key (`glu:v1`) holding a JSON blob: timer status, `endAt`, `remaining`, `total`,
  selected duration, and the environment toggles — partial restoration (running
  timer but reset toggles) reads as a bug, and the cost of including toggles is
  zero. Writes happen **on state transitions only** (start/pause/stop/preset/
  adjust/toggle), never on the display tick — `remaining` is derivable from
  `endAt`, and a write per frame is pure churn. **Mechanism (per the Zustand amendment):**
  the `persist` middleware with `partialize` (the blob shape is exactly the
  persisted partition; tick-display state is excluded) and its built-in
  `version`/`migrate` (which is where the `glu:vN` migrations of ADRs 05/08/14
  now live). The discipline holds by construction: persist fires when store
  state changes, and ticks change nothing in the store's persisted partition. Restore semantics: `running` recomputes
  remaining from `endAt`, so the countdown effectively kept going while the site
  was closed or suspended; if `endAt` has already passed, the app loads directly
  into `finished` — **silently** (no catch-up sound; audio is deferred to ADR 04+
  regardless). `paused` restores its stored `remaining` exactly.
- **States: `idle`, `running`, `paused`, `finished`.** Start begins the countdown;
  Pause stores `remaining` and clears `endAt`; resume recomputes `endAt`;
  Stop resets to the selected duration, idle. At zero the timer enters `finished`
  (00:00, visually distinct) — **no sound or notification**; audible
  alerts need user-gesture-unlocked audio and PWA plumbing → deferred to
  ADR 04+ (materialized as **ADR 18**; this ADR's restore-path silence stands).
- **Default duration 20:00** — the closest preset to the classic pomodoro; the
  preset row (5/10/15/20/30/45/60) contains no 25.
- **A preset tap sets both total and remaining to the preset, preserving run
  state** (running stays running from the new value, idle stays idle). PLAN.md's
  "affect the current timer, if the user wants to" means: tapping is the consent;
  no confirmation dialog on a device you're touching mid-focus-session.
- **±2/±5 apply to `remaining`; `total` follows so the ring stays honest**
  (`total = max(total + delta, remaining, 1 min)`; remaining clamps to ≥ 0, and
  hitting 0 via −buttons completes the timer). Adjusting only `remaining` while
  leaving `total` would make the ring fraction lie. *(ADR 32: this is the rule
  for `running` and `paused`. Idle and finished select the next run instead.)*

### Environment toggles

- **Silence untoggles Music, Podcast, TV, and Noisy — and any of those untoggles
  Silence. Headphones is orthogonal** (equipment on your head, not a sound
  environment; noise-cancelling headphones in silence is a real state).
  This is the one deliberate interpretation of PLAN.md's "untoggle the rest";
  recorded here so it isn't relitigated.
- **Toggles are Mantine `Chip`s, size `lg`, in a wrapping group** — ≥ 44 px touch
  targets. Toggle state persists in the same `glu:v1` blob; recording session
  *history* remains the tracker's backend concern (ADR 04/05).

### Layout & theming

- **One breakpoint: Mantine `sm` (48em).** At/above: CSS grid, two columns —
  timer column (left half) and a right column split into reserved top-right
  space (empty, rendered as a real element so the layout doesn't reflow when
  Todoist arrives) and toggles bottom-right. Below 48em (half-tablet):
  single column, timer first, toggles below, reserved area not rendered.
  Two layouts, not three — per PLAN.md, tablet and half-tablet are the targets.
- **App shell is `100dvh`, no page scroll at either breakpoint.** `dvh`, not
  `vh` — tablet browser chrome makes `100vh` overflow and scroll. (Superseded
  below `sm` by **ADR 08**: clock owns the first viewport, page scrolls; the
  at/above-`sm` half stands.)
- **The timer display is a plain text widget** — large mm:ss (`Title`-scale,
  `tabular-nums`), the dominant element of the timer half at both breakpoints.
  PLAN.md's counter-around-a-circle is **deferred, not dropped**: the clock face
  will be hand-built in a future **ADR: custom clock UI**, and a `RingProgress`
  stand-in now is throwaway work the day that lands. The engine still tracks
  `total` so the future ring drops onto ready data.
- **Theme toggle is a compact `ActionIcon` (sun/moon) pinned to the extreme
  top-right corner**, explicitly outside the Todoist reservation; if something
  needs the corner, it moves then. (It does: **ADR 10** relocates it into the
  hidden header drawer — placement superseded, mechanics unchanged.) Uses
  `useMantineColorScheme`; Mantine's default localStorage color-scheme manager
  persists the choice across reloads for free, layered on ADR 01's SSR-safe
  `auto` default.
- **One Zustand store is the state layer** (owner decision 2026-07-24,
  reversing this ADR's original "no state library"): timer state machine,
  toggles, and every later persisted slice (sessions · 05, gallery/chrome
  prefs · 08/15, focused task + outbox · 14) live in the store; transitions
  are store actions. **Boundary rule, standing:** the store owns state that
  is persisted or observed by more than one surface; purely-local UI state
  (drawer/popover open, input focus) stays `useState` — a mandate for shared
  state is not a ban on local state. **The per-frame display value is derived
  from `endAt` outside the persisted partition** — it must never become
  persisted store state or the write-on-transition discipline dies.
  `page.tsx` stays a server component rendering a `'use client'` app shell.
- **Default Mantine theme + default blue primary.** Visual identity work is a
  future concern, not smuggled into this ADR.

## Options considered

- **`setInterval` countdown** — drifts, dies in backgrounded tabs. Rejected.
- **Web Worker timer** — solves throttling we don't have (timestamps already
  self-correct); complexity without payoff. Rejected.
- **`SegmentedControl` for presets** — 7 segments are cramped and sub-44 px at
  half-tablet width. Rejected for a wrapping row of toggle buttons.
- **`RingProgress` or custom SVG ring now** — pure presentation, unblocks
  nothing, and becomes throwaway the day the hand-built clock face lands
  (deferred by product decision to its own ADR). Rejected; text display wins.
- **State library (Zustand)** — originally rejected ("nothing here outlives
  one component tree"); **reversed by owner decision 2026-07-24** — with 19
  ADRs of state consumers on the board, the premise no longer held. Adopted.
- **No persistence (this ADR's first draft)** — reversed by product decision the
  same day: a tablet timer that forgets a running session on reload/close is
  broken in normal use. localStorage won.
- **IndexedDB** — async ceremony for one small JSON blob. Rejected.
- **Persisting on every tick** — 20 localStorage writes/sec to store a value
  derivable from `endAt`. Rejected; persist transitions only.

## Scope

### In scope

- Timer engine (timestamp-based, per-frame foreground tick) with
  idle/running/paused/finished, start/pause/stop.
- localStorage persistence (`glu:v1`) of timer + toggle state, with restore on
  load — including a timer that ran out while the site was closed.
- Preset row (5/10/15/20/30/45/60 min) and ±2/±5 adjustment buttons with the
  semantics decided above.
- Environment toggle group with Silence exclusivity and orthogonal Headphones.
- Two-breakpoint `100dvh` layout honoring the PLAN.md layout contract, including
  the rendered-but-empty Todoist reservation.
- Dark/light toggle; both schemes visually correct across all components.
- Touch targets ≥ 44 px on every interactive element.

### Out of scope

- Storybook, unit/component tests → **ADR 03** (build must still pass here).
- PWA, sounds, notifications, wake-lock → **ADR 04**.
- Session *history* (finished-session records for the tracker), any backend or
  `/api` → **ADR 04/05**. Current-state persistence is in scope above; history is not.
- Cross-tab sync — single active tab assumed, last write wins → future ADR if it
  ever matters.
- Todoist UI → future **ADR: Todoist integration** (its space is reserved, empty).
- Circular ring / clock-face visualization → **ADR 07** (clock components) +
  **ADR 08** (gallery integration); PLAN.md's counter-around-the-circle lands
  there.
- Custom visual identity/theme palette → future ADR if ever.
- Break/work cycle automation (auto-starting breaks) → future ADR if wanted;
  PLAN.md describes a single countdown, not a cycle scheduler.

## Implementation outline

1. **Timer store first** — the Zustand store with the state machine as
   actions (`endAt`/`remaining`, preset/adjust/start/pause/stop), plus a
   thin `useCountdown` hook selecting from it and running the display
   loop that recomputes from `Date.now()` (derived display value —
   never written back into the persisted partition). **Gotcha:** cancel the loop in
   `finished`/`paused`/`idle`, and recompute-on-mount from `endAt` so a re-render
   storm or visibility change never desyncs the display. Keep mm:ss formatting
   (`Math.ceil` of seconds — `floor` shows 19:59 the instant you start a 20:00
   timer, which reads as a bug). Keep the tick handler cheap — it runs once a frame.
2. **Persistence in the same step** — the `persist` middleware configured
   with `name: 'glu'`, `version`, `migrate`, and `partialize` to exactly
   the blob shape. Save on transitions only (holds by construction — see
   Decision). **Gotcha (SSR):** localStorage
   doesn't exist on the server; reading it during initial render causes a
   hydration mismatch. Hydrate with defaults, then load persisted state in a
   mount effect — the sub-100 ms swap is acceptable; gate the timer panel behind
   the mounted flag if it visibly flickers. **Gotcha (restore):** the
   ran-out-while-away path (`endAt` in the past → `finished`, silent) is its own
   branch at load, not something the tick loop discovers.
3. **App shell + grid** — `100dvh` grid at both breakpoints, placeholder boxes
   proving the layout contract before any widget lands. Verify at ~1180 px and
   ~590 px (tablet / half-tablet) with devtools device emulation.
4. **Timer panel** — large mm:ss text + Start/Pause/Stop buttons (`size="xl"`,
   the primary touch targets). **Gotcha:** set `font-variant-numeric:
   tabular-nums` (or a monospace stack) on the time text, or the digits reflow
   horizontally every second and the panel shimmies. Keep `remaining`/`total`
   flowing through the panel's props so the future clock-face component is a
   drop-in swap.
5. **Preset row + ± buttons** wired to the hook per the decided semantics.
6. **Environment toggles** — `Chip` group with the Silence exclusivity rule in a
   single reducer-style handler (one function owns the rule; no per-chip logic).
7. **Theme toggle** — `ActionIcon` + `useMantineColorScheme`. **Gotcha:** the
   sun/moon icon depends on the resolved scheme; render it with
   `useComputedColorScheme` and only after mount (or via `light`/`dark` CSS
   classes) to avoid an SSR hydration mismatch on first paint.
8. **Dark/light pass** — flip through every component in both schemes; fix
   contrast with Mantine `light-dark()` CSS function rather than JS conditionals.
9. **Verify** — acceptance criteria below, then `npm run build`.

Honest sizing: 2–2.5 days. The hook + persistence/restore paths (steps 1–2) and
the two-scheme pass (step 8) are where the real time goes; the widgets are assembly.

## Acceptance criteria

- [x] At ≥ 48em: timer occupies the left vertical half; toggles sit bottom-right; top-right shows reserved empty space; no page scroll at 100dvh.
- [x] Below 48em: single column — timer, then toggles; no horizontal scroll at 590 px width.
- [x] Start counts down from the selected duration; Pause freezes; resume continues without losing time; Stop resets to the selected duration.
- [x] While running, the time text updates without layout jitter — digits do not shift horizontally as they change (tabular numerals).
- [x] Background the tab (or switch apps in device emulation) for ≥ 30 s while running: on return, the display shows the true remaining time, not a stale value.
- [x] Close the tab entirely with the timer running; reopen after ≥ 30 s: the timer is still running and shows the correctly reduced remaining time.
- [x] Close the tab with the timer running; reopen after the end time has passed: the app loads directly into the finished state (00:00) with no sound.
- [x] Reload while paused: still paused at the same remaining time. Environment toggles survive the reload unchanged.
- [x] localStorage (key `glu:v1`) is written on state transitions only — watching the Application panel during a running timer shows no per-tick writes.
- [x] A 60 s run measured against a wall clock ends within 1 s of real time.
- [x] (2026-07-25 amendment) The display value moves **within** a second, not only across one: sampling the active clock's geometry every frame for ~900 ms of a running timer yields a distinct value per frame (54 of 55 measured in Chromium), while the mm:ss text changes exactly once.
- [x] (2026-07-25 amendment) With `requestAnimationFrame` stubbed to never fire — the hidden-tab case — a run still reaches `finished`, on the 1 s interval alone.
- [x] Tapping a preset sets the timer to that duration, whether idle or running; run state is preserved.
- [x] +2/+5/−2/−5 change the remaining time by exactly that many minutes; subtracting past zero completes the timer (the internal `remaining ≤ total` invariant is ADR 03's to test).
- [x] Timer reaching 0:00 shows a visually distinct finished state; no sound plays.
- [x] Toggling Silence clears Music, Podcast, TV, Noisy; toggling any of those clears Silence; Headphones is unaffected by all of them.
- [x] Every interactive element measures ≥ 44 px in its smallest dimension (verify via devtools).
- [x] Theme toggle switches dark/light instantly; the choice survives a reload; first paint after reload shows the chosen scheme with no flash and no hydration warnings.
- [x] All components are legible in both schemes (no dark-on-dark / light-on-light).
- [x] `npm run build` completes with zero errors.

## Consequences

- Every ambiguous PLAN.md behavior now has one recorded interpretation — future
  disputes point at this ADR, not at code archaeology.
- The timer hook is pure logic, which makes ADR 03's tests cheap to write.
- The rendered-but-empty Todoist reservation means the Todoist ADR drops into a
  stable layout instead of reflowing everything.
- The timer survives reloads, closes, and suspensions by construction
  (`endAt` + localStorage) — "keeps counting while closed" costs nothing extra,
  but the ran-out-while-away restore path is a real branch that ADR 03 must test.
- The `glu:v1` blob is now a small schema contract; the version field is what
  keeps ADR 04/05's data model free to change it cheaply.
- The text display is a deliberate placeholder: the custom clock UI ADR swaps
  one component and inherits `remaining`/`total` untouched. Until it lands, the
  product is missing PLAN.md's circular counter — accepted and tracked, not
  forgotten.
