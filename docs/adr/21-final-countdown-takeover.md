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
**No** — read-only consumer of `remaining`/status; the tap interaction
below never transitions the timer (spy-tested, per the ADR 17 precedent).

- Deviation (2026-07-24, implementation): the overlay animates via a
  `transform: scale()` keyframe on a fixed div positioned at the clock rect, with
  the reduced-motion branch swapped to an opacity crossfade — the compositor path
  the ADR called for, expressed in CSS rather than a JS animation loop.
- Deviation (2026-07-24, implementation): the finished-dissolve is keyed by
  `runId`, so dismissing the 00:00 takeover for one run does not suppress it for
  the next.
- Deviation (2026-07-25, bug fix): **engage stays edge-triggered; disengage is
  level-triggered.** Edge-triggering both sides meant a retract requested during
  the entrance could be undone by the entrance's own landing timer, stranding the
  overlay `on` — and a stranded overlay swallows every pointer event on the page.
  The level rule is guarded on phase, not on time left, so the display tick still
  cannot re-fire anything. Root cause of the entrance that started it: the ADR 02
  display value lagged a store transition by one commit, so pressing Start from
  `finished` briefly read `running` at 0 s and engaged a takeover on a fresh
  20-minute run; `useCountdown` now carries the transition in the same commit.
- Deviation (2026-07-25, bug fix): **the clock honours the tap too.** "Tap
  anywhere → peek/dissolve" was implemented on the overlay alone, which is
  unreachable below `sm`: ADR 08's full-bleed clock owns the entire first
  viewport and, by this ADR's own stacking rule, rides *above* the overlay — so
  on a phone the takeover had no pressable pixel and could not be dismissed at
  all. The clock slot now routes a press that resolved to no swipe into the same
  handler (peek while running, dissolve at 00:00); a swipe stays a flip, because
  browsing clocks on the distraction-free screen is not a request to end it.
- Deviation (2026-07-25, product call): **a page that loads into `finished`
  loads dismissed.** The 00:00 cover persists *through* the crossing it is the
  end of — and a page load has no crossing behind it, the same reason the
  entrance sweep is skipped on restore. Reopening the app after a session ended
  now shows the whole app, header and controls included, rather than an endgame
  screen for a run the user has already left. Restoring *into* the final minute
  is unchanged: it covers instantly and carries that cover through 00:00.
- Deviation (2026-07-25, product call): **the tap dissolves, it does not peek.**
  The 5-second peek re-covered the page every few seconds while the user was
  still working in the chrome it had just returned — a takeover that keeps
  coming back reads as a bug, not as a mode. A tap is now a decision about the
  *run*: the chrome returns and stays, through the rest of the final minute,
  through 00:00, through pause/resume and a `+5` that re-crosses. Only a new
  run covers again. `peeking`, `PEEK_MS` and the deadline timer are gone; the
  dismissal is the `runId`-keyed one the `finished` branch already had.
- Deviation (2026-07-25, product call): **no takeover below `sm`.** The overlay
  was built for the layout where chrome sits *beside* the clock. On the phone
  layout ADR 08 already hands the clock the entire first viewport, so there is
  nothing on screen for the background to flood — the toggles and the task list
  are below the fold, reached by a deliberate scroll. All a viewport-covering,
  pointer-capturing overlay could do there was swallow that scroll. The hook
  gates on `(min-width: 48em)`, the layout's own `sm`, read during the first
  client render so the restore path still paints covered without a sweep.
- Deferred to HUMAN-TODO: the on-device takeover check (a real tablet in a dark
  room). Everything else is covered by the unit machine and the E2E block.

## Decision

### Trigger and threshold

- **The takeover engages during the final 60 seconds of a running timer**
  ("about to finish", pinned — long enough to register as a mode, short
  enough that losing the chrome costs nothing; a constant in one place).
  Detection is **edge-triggered** (crossed from ≥60 s to <60 s), never
  level-triggered — the display tick must not re-fire the entrance every
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
- **`sm` and up only** (amendment 2026-07-25). The takeover is a statement the
  tablet layout can make and the phone layout cannot: at/above `sm` there is
  chrome beside the clock for the background to flood, while below `sm` ADR 08
  has already given the clock the whole first viewport and everything else is
  below the fold. There is nothing there to hide — a full-viewport overlay
  would cover a screen that is nothing but clock, and capture the scroll that
  reaches the rest of the page. The gate is the layout's own breakpoint
  (`min-width: 48em`), evaluated on the first client render so the restore
  path above still paints covered instead of sweeping one commit later; a
  rotation that narrows past `sm` mid-takeover retracts it like any other
  reason to be uncovered.

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
  dissolves it regardless). **Persists, not raises** (amendment 2026-07-25):
  a page that *loads* into `finished` loads dismissed, because the 00:00
  cover is the crossing's cover still standing and a load has no crossing
  behind it — the same reasoning that skips the entrance sweep on restore.
  A reload at 00:00 returns the user to the app, not to an endgame screen
  for a session they have already left.
- **Overlay stacking order, recorded**: Mantine portals (drawer/detail
  modal) > **UndoBar** > takeover > page chrome. The undo bar outranks the
  takeover because it's a 10-second data decision (ADRs 14/20) — aesthetics
  never outrank an expiring choice. An already-open drawer stays above; the
  takeover doesn't fight portals.

### Interaction while covered

- **Tap anywhere → the takeover dissolves for the rest of the run**
  (amendment 2026-07-25; it was a 5-second peek). The normal UI returns and
  *stays*: through the remaining seconds, through 00:00, through pause/resume
  and through a `+5` that lifts above the threshold and drops back. The final
  minute is exactly when someone reaches for +5 — hiding the chrome must never
  mean locking it, and a chrome that keeps being taken away again is the same
  lockout on a timer. Asking for the UI back is not a request to be shown the
  endgame screen four more times.
- **A new run covers again** — the dismissal is keyed by `runId` (the same
  key the `finished` dissolve already used), so the takeover is a per-run
  decision, not a preference. The permanent opt-out remains the ADR 19
  settings pencil.
- **ADR 06 hotkeys work throughout** — `s`/`Ctrl+C`/`p`/`n` are
  document-level and unaffected by the overlay; the keyboard user never
  needs the tap.
- The overlay is `aria-hidden` and captures pointer events (that's the
  dismiss trigger, and it prevents ghost-taps on covered controls). Tab-focus
  into covered controls is a known niche accepted for a single-user tablet
  app; recorded, revisitable.
- **"Anywhere" includes the clock** (amendment 2026-07-25). The clock is the
  one surface the overlay does not cover and therefore the one tap it never
  sees — the hero of the screen cannot be the one place the takeover ignores.
  A press on the clock that resolves to no swipe is the tap; a swipe is still
  a flip. (This rule was first written for the phone, where the clock was the
  only reachable pixel; the `sm` gate above has since removed the takeover
  from that layout entirely, and the rule stands on its own at tablet width.)
- **Nothing but a crossing engages it, and a dismissed run has no crossing
  left** — with the dismissal recorded against the run, the edge detector's
  "wanted" is false for the rest of it, so there is no timer, no deadline and
  no state that can put the overlay back up on its own.

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
  crossfade, `finished` persistence + dissolve, tap-to-dismiss interaction.
- Stacking-order integration (undo bar above; portals above; chrome
  below); `aria-hidden` + pointer capture.
- Tests per ADR 03's checklist (outline), stories (mid-takeover, dismissed,
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
   (`off | entering | on | retracting`; `peeking` was dropped by the
   2026-07-25 amendment) driven by
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
4. **Dismiss** — pointer on overlay → record the run as dissolved and go
   `off`; the run's eligibility is then false, so the edge detector has
   nothing left to fire on and the controls stay uncovered until the next
   run. (Amendment 2026-07-25 — this step *was* a `peeking` phase with a 5 s
   deadline timestamp and a re-entry; the re-entry was the bug, so the phase,
   the constant and the timer are all gone.) **Gotcha (found 2026-07-25):** "pointer on overlay" is
   not the same as "tap anywhere" — the clock is elevated *out* of the
   overlay by step 3, so the clock slot must route its own taps into this
   handler or the hero surface is the one place the takeover ignores.
   (This bit first when the takeover still ran below `sm`, where the clock
   was the *only* reachable pixel; the `sm` gate in step 4b retired that
   layout, not the rule.)
4b. **The `sm` gate** (amendment 2026-07-25) — fold `min-width: 48em` into
   the same "wanted" the threshold feeds, so `covered` stays honest and the
   clock is not elevated below `sm` either. **Gotcha:** read the media query
   during the first client render (`getInitialValueInEffect: false`), not in
   an effect — a width that lands one commit late reads as a crossing and
   sweeps the restore path that is supposed to paint covered.
5. **Tests**: edge-trigger (no re-fire across 20 ticks under threshold);
   +5 retract; pause retract / resume re-engage; restore-into-final-minute
   instant-on; finished persistence + dissolve-on-tap; **dismissal holds** —
   across 30 ticks, across 00:00, across pause/resume and a re-crossing `+5`,
   and lifts for the next `runId`; hotkeys fire while covered (`p` pauses →
   takeover retracts); reduced-motion branch; the no-transition spy. **E2E**
   (`page.clock`): cross the threshold → overlay visible and a control tap
   hits the overlay (dismiss) not the button; the page stays uncovered as the
   run keeps ticking; +5 afterwards → normal UI; run to zero → takeover
   persists; tap → dissolved. The overlay contracts are `sm`-and-up: the
   half-tablet projects instead own "nothing is ever covered", through the
   crossing, past it and at 00:00, with the below-the-fold chrome still
   usable.
6. **Stories** per scope; pencil line added to CLAUDE.md.

Honest sizing: **1–1.5 days.** The animation is an afternoon; the
interaction matrix (peek × pause × adjust × restore × finished) and the
stacking verification against blend-mode clocks are the real day.

## Acceptance criteria

- [x] With a timer running, at the 60 s mark the background colour sweeps outward from the clock's rectangle (~700 ms) until only the clock is visible; nothing re-animates on subsequent ticks.
- [x] `+5` during the takeover (via a hotkey-adjacent flow, or after a tap has dismissed it) retracts it with the reverse animation; dropping under 60 s again re-engages it — unless the run was dismissed, which holds for the whole run.
- [x] `p` while covered pauses the timer and retracts the takeover; resume under threshold re-engages it.
- [x] Reload with <60 s remaining: the takeover is present on first paint with no entrance sweep.
- [x] At 0:00 the takeover remains, showing only the clock at 00:00; the ADR 18 chime fires normally; any tap or hotkey dissolves it and it does not re-engage.
- [x] A tap on the **clock itself** dissolves the 00:00 takeover (and dismisses it while running) — the clock rides above the overlay, so it is the one tap the overlay never sees.
- [x] Below `sm` there is no takeover at all: through the crossing, past it and at 00:00 nothing covers the page, and the chrome stacked under the clock scrolls into reach and works.
- [x] A reload at 00:00 comes back to the whole page — no overlay, the header button and the transport pressable without a dismissal first.
- [x] While covered: tapping where a control would be dissolves the takeover (the control does not activate); every control then works, and the page stays uncovered for the rest of the run — no timer puts the overlay back.
- [x] The undo bar, if triggered while the takeover is active, renders above it and is fully operable; an open drawer/detail modal renders above it.
- [x] With `prefers-reduced-motion`, engage/retract are crossfades — no positional animation (DevTools emulation).
- [x] The overlay colour equals the current `--glu-page-bg` under any clock palette × chrome × scheme combination spot-checked (the three ADR 15 demo pairings minimum); the three blend-mode clocks render unchanged during takeover.
- [x] The takeover never appears when idle, paused, or above 60 s; the no-transition spy passes.
- [x] Stories cover the states in scope; `npm test`, `npm run build`, `npm run build-storybook` green; the ADR 09 block is active and green.

## Consequences

- The last minute of a session becomes the product's signature moment:
  chrome burns away and the chosen clock — on its own palette, in its own
  chrome's background — is the entire screen. Every prior theming decision
  (07/08/15) gets its payoff shot. On the phone layout that shot was already
  free (ADR 08 gives the clock the first viewport outright), which is why the
  2026-07-25 amendment can drop the overlay there without losing the moment.
- One more consumer of the derived-from-`remaining` pattern, and one more
  read-only status subscriber (with 17 and 18) — the timer engine now has
  an ecosystem, and still nothing but user actions transitions it.
- The stacking order is now a recorded contract (portals > undo bar >
  takeover > chrome); any future overlay must slot into it explicitly.
- The settings pencil grows again (opt-out/threshold) — ADR 19's future
  amendment queue is now five items, which is healthy: the surface exists,
  the demands are enumerated, none of them block anything.
