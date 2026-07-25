# ADR 08: Clock gallery — flip-through, site theming, mobile layout

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-24 — theming is now two-layer (**ADR 15**): the active
  clock's palette drives the page color family *through the active chrome
  module's background/surface tokens* (chrome owns shape/material and the
  page-base pair; clock owns accent/tint). The "clock repaints the page"
  behavior and this ADR's criteria stand, applied via that token layer.
- Amended: 2026-07-24 — Zustand adoption (ADR 02): `activeClockId` and
  `showSessionOnClock` are persisted store fields; "additive with defaults"
  is implemented as `persist` `migrate`/merge defaults. Semantics unchanged.
- Amended: 2026-07-25 — the switch animation this ADR parked ("Slide/crossfade
  polish is optional later"; Out of scope: "Switch animations") shipped as
  **ADR 25**: flips slide in the direction of travel. "Only the active clock
  renders" now carries one bounded exception — two layers for the 420 ms of a
  flip, never the 18-wide strip this ADR rejected. Flip semantics (order,
  wrapping, 40 px threshold, horizontal intent, persistence, palette repaint)
  are untouched.

- Deviation (2026-07-24, implementation): palette propagation goes through
  ADR 15's static token stylesheet keyed on `[data-chrome][data-clock]`, with the
  bootstrap script setting both attributes before first paint. That satisfies
  "no flash" and "re-resolves with the scheme without a JS re-render" more
  strongly than root variables written from JS would.
- Deviation (2026-07-24, implementation): the preset row sits above the clock at
  tablet and below it on the phone. DOM order is the phone order (clock first —
  the ADR's own first-viewport rule) and CSS `order` lifts the presets at/above
  `sm`, which is what UI.md's tablet sketch shows.
- Deviation (2026-07-24, implementation): ADR 02's `TimerDisplay` component was
  deleted rather than left unused; the clock stories now carry the
  idle/running/paused/finished state coverage ADR 03 asked of the timer panel.

## Context

ADR 07 delivers 18 pure clock components, a registry, and per-clock
`{ light, dark }` palettes — components and Storybook only, by design. This
ADR (penciled as 08 in the ADR 07 brief) puts them in the app:

- a **gallery-like feature** the user can **flip through** (with arrows, per
  the brief's "optional arrows");
- **the website reacts to whichever clock is active** — page background and
  text accents come from the active clock's palette;
- **on mobile, the clock becomes the first viewport** of the screen,
  everything else below it.

This is also the ADR that **replaces ADR 02's placeholder text display** —
the swap seam (`remaining`/`total` through props) was built for exactly this
moment — and the one that changes ADR 02's no-scroll contract *on mobile only*
(amendment recorded there).

**Prerequisites: ADRs 02, 03, and 07 Implemented.** ADR 05 (sessions) is not
blocking: without it, clocks receive `session = 0`. If ADR 09 is implemented,
this ADR's E2E flow block activates as part of its definition of done; if
ADR 10 is implemented, the drawer/arrow chrome coexists untouched (the gallery
lives in the timer half, the drawer overlays from the right edge).

## Decision

### Gallery mechanics

- **The clock slot itself is the gallery.** No separate picker screen: swipe
  horizontally on the clock (primary, tablet-first) or tap flanking chevron
  arrows (the brief's arrows — always visible but visually quiet, ≥44 px) to
  move through the registry in order, wrapping at the ends. One interaction
  surface, zero navigation.
- **Only the active clock renders.** 18 mounted clocks means 18 ticking
  subtrees and Aurora's blur layers running off-screen; switch is an
  unmount/mount fed by the same props. Slide/crossfade polish is optional
  later; correctness first.
- **The active clock persists** as an **additive field** in the storage blob
  (`activeClockId`, default `halo`) — additive-with-default needs no schema
  version bump and no migration beyond "missing → default" (the storage module
  owns the rule; coordinates cleanly whether ADR 05's v2 landed first or not).
  **Halo is the default**: the classic ring — PLAN.md's original
  "counter that goes around the circle", finally delivered.
- **A dot/position indicator is not shipped.** 18 dots under a clock is
  clutter; the clock designs are self-identifying. Revisit only if real use
  proves people get lost (future note, not a promise).

### Site theming

- **The active clock's palette repaints the app** — page background, text
  accents — via CSS variables set at the app-shell root from the registry's
  theme export, resolved against the current Mantine color scheme (dark/light
  keeps working exactly as before; the clock picks the palette, the scheme
  picks which half of it). Mantine components continue reading Mantine's
  variables; the clock palette layers page-level colors, it does not fork the
  design system.
- **Environment toggles, session strip, and controls must stay legible on
  every clock's background in both schemes** — that is 36 combinations, and it
  is the real cost of "the website reacts". The a11y/contrast criterion covers
  chrome-on-palette, not just clock-on-palette (ADR 07 already covered that).

### Session visibility

- **The `showSession` toggle (ADR 07's "toggle outside the clock area") ships
  here**: a small labeled switch near the session strip in the timer half —
  it is a display preference about session data, so it lives with the session
  UI, not in ADR 10's chrome drawer. Persisted as an additive blob field
  (`showSessionOnClock`, default `true`), same no-migration rule.

### Mobile layout (below `sm`)

- **The clock owns the first `100dvh` viewport; everything else stacks
  below and the page scrolls.** This supersedes ADR 02's "no page scroll at
  either breakpoint" for the below-`sm` case only (ADR 02 amended; the
  at/above-`sm` contract — timer left half, toggles bottom-right, Todoist
  reservation top-right, no scroll — is unchanged). **Gotcha:** `dvh` on
  mobile browsers means the first viewport resizes as browser chrome
  collapses on scroll — that's the correct behavior, and it's why it's `dvh`
  and not `vh` or a JS-measured height.

### Explicitly not changing

- **No new keyboard shortcuts** (arrow keys to flip clocks is tempting) —
  ADR 06 owns the shortcut roster; that's an ADR 06 amendment if ever wanted.
- **The retired text display is not registered as a 19th clock** — tempting
  and nearly free, but "clock roster" is ADR 07's contract; adding one is an
  ADR 07 amendment. Future note, not smuggled in.

## Options considered

- **Separate picker screen/modal (grid of 18 thumbnails)** — a navigation
  detour for a flip decision; the in-place gallery is one gesture. Rejected
  (a thumbnail grid could join the future settings ADR if the roster grows).
- **Render all clocks in a horizontal strip (carousel with real neighbors)** —
  smooth swipe physics, but 18 live subtrees including blur-heavy ones;
  memory and jank on the actual tablet. Rejected; active-only.
- **Mantine Carousel** — built for multi-item content strips; we need one
  full-bleed item with wrap and swipe, which is a `useSwipe`-style handler and
  two buttons. The dependency outweighs the code it saves. Rejected.
- **Theming via Mantine theme override per clock** — regenerating the Mantine
  theme object 18 ways forks the design system; CSS variables layered at the
  root are scoped, cheap, and scheme-aware. Rejected.
- **Persist gallery position separately from `activeClockId`** — they are the
  same fact. Rejected.
- **Dots indicator** — see Decision. Rejected for now.

## Scope

### In scope

- Gallery in the clock slot: swipe + wrap-around chevrons, active-only
  rendering, `activeClockId` persistence with default `halo`.
- Text-display replacement: active clock receives
  `remainingSeconds`/`totalSeconds`/`session`/`showSession`/`state` from the
  ADR 02 hook (and ADR 05's count when present).
- Palette propagation to page background/text accents via root CSS variables,
  scheme-aware.
- `showSession` switch near the session strip; `showSessionOnClock`
  persistence.
- Mobile first-viewport layout below `sm`; ADR 02 amendment for the scroll
  contract.
- Stories (gallery at several clocks, mobile layout, chrome-on-palette
  spot-checks), unit/story tests per ADR 03's checklist, ADR 09 E2E flow block
  (activated or skipped-with-reason per ADR 09's status).

### Out of scope

- Clock accent customization UI → future **ADR: settings** (socket ships in
  ADR 10).
- Arrow-key flipping → ADR 06 amendment if wanted.
- Registering the retired text display as a clock → ADR 07 amendment if
  wanted.
- Switch animations (slide/crossfade) → polish follow-up, not blocking.
  **Shipped in ADR 25** (2026-07-25).
- Dots/position indicator → revisit on evidence.
- Per-clock Mantine theme forks — permanently out; CSS variables are the
  mechanism.

## Implementation outline

1. **Palette plumbing first** — root CSS variables
   (`--glu-page-bg`, `--glu-page-fg`, accents) set from
   `registry[activeClockId].theme[scheme]`; app shell and chrome consume them.
   **Gotcha:** resolve the scheme via Mantine's `data-mantine-color-scheme`
   attribute/`light-dark()` so the variables flip with the scheme *without JS
   re-render* — a JS-only mapping reintroduces the theme-flash class of bugs
   ADR 01 killed.
2. **Gallery container** — replaces the text display in the timer panel:
   renders `registry[activeClockId]` with the ADR 02 hook's props; chevrons +
   horizontal swipe (pointer events; ~40 px threshold; wrap with modulo —
   `(i + n) % n`, the negative-index classic). Persist on change (one
   transition, one write, per ADR 02's discipline). **Gotcha:** the swipe
   handler must not eat taps on the clock area or interfere with vertical
   page scroll on mobile — horizontal-intent detection (`|dx| > |dy|` after
   threshold) before claiming the gesture.
3. **Storage additions** — `activeClockId` + `showSessionOnClock`, additive
   with defaults; unknown `activeClockId` in the blob (a clock renamed or
   removed later) falls back to `halo`, never crashes.
4. **`showSession` switch** near the session strip (hidden if ADR 05 isn't
   implemented yet — no session data, nothing to toggle).
5. **Mobile layout** — below `sm`: clock section `100dvh`, content stacks
   below, page scrolls; at/above `sm`: unchanged ADR 02 grid. Verify at
   ~590 px and ~1180 px.
6. **Chrome-on-palette pass** — flip through all 18 clocks in both schemes
   checking toggles/buttons/strip legibility; fix with the palette's fg
   variables, not per-clock special cases.
7. **Tests** — registry-driven: flipping cycles all 18 and wraps both
   directions; persistence round-trip; unknown-id fallback; swipe
   threshold/intent unit-tested on the handler; `showSession` plumb-through;
   mobile layout snapshot at 590 px. **E2E block (ADR 09):** flip → palette
   change asserted via computed background → reload → same clock; swipe on
   touch project; mobile first-viewport geometry.

Honest sizing: **1.5–2 days.** Steps 1 and 6 are the real work — palette
propagation done right and 36 combinations of chrome legibility. The gallery
mechanics are an afternoon.

## Acceptance criteria

- [x] The timer half shows a clock (default Halo on first load), not the text display; the text display is gone from the app.
- [x] Chevron taps and horizontal swipes flip through all 18 clocks and wrap at both ends; a vertical scroll gesture on mobile never flips a clock.
- [x] The page background and text accents change with every flip, correctly for the current scheme; toggling dark/light re-resolves the same clock's palette with no flash.
- [x] The chosen clock survives a reload; a hand-planted unknown `activeClockId` falls back to Halo without error.
- [x] Timer behavior is untouched by flipping: a running timer keeps counting across flips (assert remaining continues decreasing).
- [x] The `showSession` switch shows/hides the session display on clocks that render one, persists across reload, and sits outside the clock area.
- [x] Below `sm` (~590 px): the clock fills the first viewport (`100dvh`), everything else stacks below, and the page scrolls; at ~1180 px the ADR 02 layout contract is unchanged and the page does not scroll.
- [x] All chrome (toggles, buttons, session strip, ADR 10 arrow if present) passes contrast checks on every clock's background in both schemes (a11y addon on the chrome-on-palette stories; spot-check the darkest and lightest palettes manually).
- [x] Arrows are ≥44 px; swipe works with touch emulation.
- [x] Stories exist (gallery on at least 3 visually distinct clocks, mobile layout, chrome-on-palette); tests from outline step 7 pass; the ADR 09 E2E block is active-and-green (ADR 09 landed later in the same run — see its suite).
- [x] `npm test`, `npm run build`, `npm run build-storybook` all green.

## Consequences

- PLAN.md's circular counter ships, 18 times over — and the app's visual
  identity becomes a user choice, which retires the "default blue placeholder"
  caveats in ADRs 01/02/04.
- ADR 02's mobile no-scroll contract is superseded below `sm` (amended there);
  the tablet contract stands.
- Every future piece of chrome inherits the obligation to be legible on 36
  palette-scheme combinations — the CSS-variable layer is what makes that a
  rule instead of 36 special cases.
- The blob gains two additive preference fields; the additive-with-default
  pattern is now the established alternative to version bumps for
  non-structural changes.
- Flip-through UX at 18 clocks is linear; if the roster grows past ~25, a
  picker grid becomes worth its screen (future settings ADR territory).
