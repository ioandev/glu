# ADR 21: Final-countdown takeover

- Status: Implemented (deviations noted)
- Date: 2026-07-24

## Context

Product brief (2026-07-24): **when the timer is about to finish, the entire
display fills with the background colour — everything except the clock —
via a nice animation that starts from the clock's own rectangle.** The
endgame of a focus session gets an endgame screen: chrome dissolves, the
clock is all there is.

The pieces this composes with are already specified: "the background
colour" is the two-layer token `--glu-page-bg` (chrome base × clock palette
× scheme, ADRs 08/15) — so the takeover is automatically correct across all
combinations; the clock is the hero component (ADRs 07/08); ADR 17 keeps
the screen awake through the moment; ADR 18 chimes at zero.

**Prerequisites: ADRs 02, 03, and 15 Implemented** (timer, tests, the token
that defines "the background colour"); ADR 08 recommended first (the
takeover of a clock beats the takeover of the interim text widget, but the
mechanism is identical). Build order: after 20 — last on the board.

**ADR 14's lifecycle question, answered**: does this affect ran-time?
**No** — read-only consumer of `remaining`/status; the peek interaction
below never transitions the timer (spy-tested, per the ADR 17 precedent).

- Deviation (2026-07-24, implementation): the overlay animates via a
  `transform: scale()` keyframe on a fixed div positioned at the clock rect, with
  the reduced-motion branch swapped to an opacity crossfade — the compositor path
  the ADR called for, expressed in CSS rather than a JS animation loop.
- Deviation (2026-07-24, implementation): the finished-dissolve is keyed by
  `runId`, so dismissing the 00:00 takeover for one run does not suppress it for
  the next.
- Deferred to HUMAN-TODO: the on-device takeover check (a real tablet in a dark
  room). Everything else is covered by the unit machine and the E2E block.

## Decision

### Trigger and threshold

- **The takeover engages during the final 60 seconds of a running timer**
  ("about to finish", pinned — long enough to register as a mode, short
  enough that losing the chrome costs nothing; a constant in one place).
  Detection is **edge-triggered** (crossed from ≥60 s to <60 s), never
  level-triggered — the 50 ms tick must not re-fire the entrance every
  frame.
- **Crossing back retracts it** (reverse animation): a +2/+5 during the
  final minute that lifts `remaining` above the threshold returns the
  normal UI — the takeover is a statement about time left, so it obeys
  time left.
- **Pause retracts it; resume re-engages it** (if still under threshold).
  Paused means the user is engaging with the UI; a takeover held through
  pause is a lockout, not a mood.
- **Restoring into the final minute** (reload with 40 s left) renders the
  takeover **instantly, without the entrance animation** — the animation
  narrates a crossing; a page load has none to narrate.

### The visual

- **A solid overlay in `var(--glu-page-bg)` expands from the clock's
  measured rectangle to the full viewport** (~700 ms, eased), sitting
  **above all chrome, below the clock** — the clock's own stacking context
  rides on top, so "everything except the clock" is literal. Mechanism:
  a contentless fixed `div` placed at the clock's `getBoundingClientRect`,
  non-uniformly `transform: scale()`d to viewport coverage — a solid color
  has no content to distort, which is what makes the cheap compositor-only
  animation correct. The origin rect matters only during the entrance;
  after it, the overlay is simply full-viewport (resize/rotation
  mid-takeover just stays covered, no re-measure choreography).
- **`prefers-reduced-motion`: crossfade instead of expansion** — same
  states, no sweep. Non-negotiable accessibility line.
- **At 0:00 the takeover persists through `finished`** — it *is* the
  distraction-free 00:00 display, on the screen ADR 17 is holding awake —
  until any interaction dissolves it (tap or hotkey; leaving `finished`
  dissolves it regardless).
- **Overlay stacking order, recorded**: Mantine portals (drawer/detail
  modal) > **UndoBar** > takeover > page chrome. The undo bar outranks the
  takeover because it's a 10-second data decision (ADRs 14/20) — aesthetics
  never outrank an expiring choice. An already-open drawer stays above; the
  takeover doesn't fight portals.

### Interaction while covered

- **Tap anywhere → a 5-second peek**: the takeover fades to reveal the
  normal UI (controls usable), then re-engages if still under threshold.
  The final minute is exactly when someone reaches for +5 — hiding the
  chrome must never mean locking it.
- **In `finished`, a tap dissolves permanently** (no re-engage — the
  session is over; peek semantics apply only while running).
- **ADR 06 hotkeys work throughout** — `s`/`Ctrl+C`/`p`/`n` are
  document-level and unaffected by the overlay; the keyboard user never
  needs the peek.
- The overlay is `aria-hidden` and captures pointer events (that's the
  peek trigger, and it prevents ghost-taps on covered controls). Tab-focus
  into covered controls is a known niche accepted for a single-user tablet
  app; recorded, revisitable.

## Options considered

- **Clip-path hole animation (overlay with a shrinking cutout)** — the
  "true" inverse mask, but clip-path animation is not reliably
  compositor-driven across the target engines; a solid rect under the
  elevated clock achieves the identical visual on the compositor path.
  Rejected.
- **10-second threshold (takeover as climax sting)** — too short to be a
  mode, reads as a glitch; 60 s gives the endgame a room. Rejected.
- **Threshold at 5 minutes** — a quarter of the default session with hidden
  chrome; the takeover would *be* the app. Rejected.
- **Takeover survives pause** — lockout, see Decision. Rejected.
- **Auto-dissolve after N seconds in `finished`** — the whole point of
  persisting is the glanceable 00:00 (paired with ADR 17's grace); an
  interaction is the natural end. Rejected.
- **Blur/dim instead of solid fill** — the brief says *filled with the
  background colour*, and blur is GPU-expensive at viewport size on old
  tablets (the ADR 07 Aurora lesson). Rejected.
- **Hide the takeover behind a setting from day one** — ship the behavior,
  pencil the opt-out (ADR 19 pattern, consistent with 17/18). Rejected for
  v1.

## Scope

### In scope

- Takeover overlay component: edge-triggered engage/retract, entrance from
  the clock rect, reverse retract, instant-on-restore, reduced-motion
  crossfade, `finished` persistence + dissolve, peek interaction.
- Stacking-order integration (undo bar above; portals above; chrome
  below); `aria-hidden` + pointer capture.
- Tests per ADR 03's checklist (outline), stories (mid-takeover, peek,
  finished-takeover, reduced-motion, per scheme; blend-mode clock spot
  check), ADR 09 E2E block.
- CLAUDE.md pencil: "final-minute takeover opt-out/threshold" joins the
  ADR 19 settings pencil.

### Out of scope

- Opt-out or configurable threshold → ADR 19 settings pencil (added).
- Sound/haptics at threshold crossing — ADR 18 owns alerting; the takeover
  is silent by design.
- Per-clock bespoke takeover art (e.g. Tide flooding the page) — tempting,
  gorgeous, and 18 designs × custom animation; the solid-fill version is
  clock-agnostic. Future brief if ever; cut on sight.
- Any timer-behavior change — read-only consumer, per the lifecycle answer.

## Implementation outline

1. **State first**: a small derived takeover state
   (`off | entering | on | peeking | retracting`) driven by
   `{status, remaining}` with edge-triggered transitions. **Gotcha:** the
   threshold compare must use the same `Math.ceil` second the display uses
   (ADR 02) or the takeover and the visible "1:00" disagree by a frame;
   derive both from one source.
2. **Overlay component** — measure clock rect on `entering` (the gallery
   container ref, ADR 08), place fixed div, scale to viewport, ~700 ms;
   reverse for `retracting`; skip animation when mounting directly into
   `on` (restore path) and under reduced motion (crossfade). **Gotcha:**
   non-uniform scale is only safe because the div is contentless — if
   anyone later puts a message inside the overlay, it warps; enforce
   empty-by-lint-comment and put any future content in a separate
   non-scaling layer.
3. **Stacking** — elevate the clock's container above the overlay for the
   takeover's lifetime. **Gotcha:** the blend-mode clocks (Pill/Tide/Field)
   rely on `isolation: isolate` (ADR 07); verify elevation doesn't create a
   new stacking context that changes their rendering — the dedicated story
   covers all three.
4. **Peek** — pointer on overlay → `peeking` (overlay fades, 5 s deadline
   timestamp — the ADR 02 discipline, surviving re-render), controls fully
   interactive; deadline → re-enter `on` if still eligible; adjustments
   during peek that cross the threshold cancel re-entry. `finished` + tap →
   `off` permanently.
5. **Tests**: edge-trigger (no re-fire across 20 ticks under threshold);
   +5 retract; pause retract / resume re-engage; restore-into-final-minute
   instant-on; finished persistence + dissolve-on-tap; hotkeys fire while
   covered (`p` pauses → takeover retracts); reduced-motion branch; the
   no-transition spy. **E2E** (`page.clock`): cross the threshold → overlay
   visible and a control tap hits the overlay (peek) not the button; +5
   during peek → normal UI; run to zero → takeover persists; tap →
   dissolved.
6. **Stories** per scope; pencil line added to CLAUDE.md.

Honest sizing: **1–1.5 days.** The animation is an afternoon; the
interaction matrix (peek × pause × adjust × restore × finished) and the
stacking verification against blend-mode clocks are the real day.

## Acceptance criteria

- [x] With a timer running, at the 60 s mark the background colour sweeps outward from the clock's rectangle (~700 ms) until only the clock is visible; nothing re-animates on subsequent ticks.
- [x] `+5` during the takeover (via peek or hotkey-adjacent flow) retracts it with the reverse animation; dropping under 60 s again re-engages it.
- [x] `p` while covered pauses the timer and retracts the takeover; resume under threshold re-engages it.
- [x] Reload with <60 s remaining: the takeover is present on first paint with no entrance sweep.
- [x] At 0:00 the takeover remains, showing only the clock at 00:00; the ADR 18 chime fires normally; any tap or hotkey dissolves it and it does not re-engage.
- [x] While covered: tapping where a control would be triggers the peek (the control does not activate); during the 5 s peek all controls work; after 5 s the takeover returns.
- [x] The undo bar, if triggered while the takeover is active, renders above it and is fully operable; an open drawer/detail modal renders above it.
- [x] With `prefers-reduced-motion`, engage/retract are crossfades — no positional animation (DevTools emulation).
- [x] The overlay colour equals the current `--glu-page-bg` under any clock palette × chrome × scheme combination spot-checked (the three ADR 15 demo pairings minimum); the three blend-mode clocks render unchanged during takeover.
- [x] The takeover never appears when idle, paused, or above 60 s; the no-transition spy passes.
- [x] Stories cover the states in scope; `npm test`, `npm run build`, `npm run build-storybook` green; the ADR 09 block is active and green.

## Consequences

- The last minute of a session becomes the product's signature moment:
  chrome burns away and the chosen clock — on its own palette, in its own
  chrome's background — is the entire screen. Every prior theming decision
  (07/08/15) gets its payoff shot.
- One more consumer of the derived-from-`remaining` pattern, and one more
  read-only status subscriber (with 17 and 18) — the timer engine now has
  an ecosystem, and still nothing but user actions transitions it.
- The stacking order is now a recorded contract (portals > undo bar >
  takeover > chrome); any future overlay must slot into it explicitly.
- The settings pencil grows again (opt-out/threshold) — ADR 19's future
  amendment queue is now five items, which is healthy: the surface exists,
  the demands are enumerated, none of them block anything.
