# ADR 25: Clock flip animation — directional slide

- Status: Implemented (deviations noted)
- Date: 2026-07-25

- Deviation (2026-07-25, implementation): the hook also exposes `flipSeq`, a
  count of flips since mount, beyond the outlined
  `{ outgoingClockId, direction, flip }`. It is the layers' React key —
  remounting is what replays a one-shot CSS animation, and `flipSeq === 0` is
  what keeps first paint from sliding in. Without it an interrupting flip
  reuses the DOM node and the second slide silently does not play.
- Deviation (2026-07-25, verification): "flipping works while the takeover
  covers the page" is verified **by swipe**, not by chevron. ADR 21's overlay
  covers the chevrons on purpose and only the clock rides above it, so the
  swipe is the flip path while covered — the criterion holds, by the route
  ADR 21 leaves open.

## Context

ADR 08 built the gallery and parked the polish: *"Only the active clock
renders… Slide/crossfade polish is optional later; correctness first"*, and
its Out-of-scope list names **"Switch animations (slide/crossfade) → polish
follow-up, not blocking."** This is that follow-up.

Today `ClockGallery` detects a swipe and calls `flipClock()`, and the clock
swaps between two frames. There is no animation of any kind. The gesture
carries direction — the user physically pushed the clock left or right — and
the app throws that information away at the moment it would mean the most.
On a tablet, where the swipe *is* the primary interaction (ADR 08), an
instant swap reads as a glitch rather than a gallery.

The reference behaviour is `/repos/dragonbydragon`
(`src/components/LandingChrome.tsx` + `src/app/(landings)/layout.tsx`): a
direction-aware slide — the outgoing view translates to `-100%` while the
incoming enters from `+100%`, mirrored when going back — at `.42s` on
`cubic-bezier(.4, 0, .2, 1)`, with the chrome lifted out of the moving layer
so the arrows stay put, and a `prefers-reduced-motion` escape hatch. That is
the behaviour we want; §"Options considered" records why we do not import its
*mechanism*.

Two gesture defects surfaced while reading the handler, and they belong here
because they are the same three lines of code:

- **A swipe that leaves the slot is silently dropped.** `onPointerUp` is bound
  to the slot, and without pointer capture the `pointerup` of a drag that ends
  outside the slot is delivered to whatever element is under the finger. The
  slot is `max-width: 520px` inside a half-screen column — a swipe that ends
  past its edge is the *natural* gesture, not an edge case.
- **Multi-touch counts as a swipe.** A two-finger gesture or a stray palm
  contact produces a second pointer stream that overwrites `start` and can
  resolve into a flip.

**Prerequisites: ADRs 07, 08, 15 and 21 Implemented.** ADR 21 matters because
the takeover lifts the clock's container above the overlay — flips must keep
working, and looking right, while covered.

## Decision

- **Every flip animates, whatever triggered it.** Swipe and both chevrons
  route through one `flip(step)` entry point, so a chevron tap and a swipe are
  indistinguishable on screen. One code path, or the two drift.
- **The animation is a directional slide of two layers inside the slot.** For
  the duration of the flip the slot renders the outgoing clock and the
  incoming clock, absolutely positioned and stacked; the outgoing translates
  out in the direction of travel, the incoming enters from the opposite edge.
  Dragging left moves forward — the carousel convention `swipeIntent()`
  already encodes.
- **Timing is the reference's**: 420 ms, `cubic-bezier(.4, 0, .2, 1)`. Long
  enough to read as a gallery, short enough that a run of flips does not feel
  like waiting on the UI.
- **The slot clips.** `overflow: clip` on the slot is what keeps the slide a
  clock-sized event instead of a clock sliding across the environment toggles.
  This is the local equivalent of the reference giving its arrows their own
  `view-transition-name` so they sit out the transition.
- **At most two clocks are ever mounted, and only during the flip.** ADR 08's
  "only the active clock renders" was a decision about 18 live ticking
  subtrees; a second subtree for 420 ms is not that, and it is the minimum a
  paired in/out slide can cost. The outgoing layer is torn down on landing —
  never accumulated.
- **Input is never dropped; a flip in flight restarts.** The reference guards
  with a `busyRef` and ignores clicks mid-transition, because a route
  transition genuinely cannot be interrupted. Ours can: a second flip commits
  immediately and restages the slide from the clock that was on screen. Rapid
  chevron taps step through the roster at the speed they are tapped, which is
  the responsive reading; swallowing a tap is not.
- **`prefers-reduced-motion: reduce` swaps instantly** — no transform, no
  second layer, no crossfade. Unlike ADR 21's takeover, which fades because it
  narrates an event the user did not cause, a flip is the direct answer to the
  user's own gesture and needs no narration. Matches the reference, which
  collapses its transition to `.01ms`.
- **The slot keeps reporting the incoming clock immediately.** `data-clock-id`
  and the ADR 15 palette are driven by the store, not by the animation state,
  so the page repaint (ADR 08) leads the slide rather than trailing it, and
  ADR 09's assertions stay honest about what is active.
- **The gesture is hardened in the same change**: the slot captures the
  pointer on `pointerdown` so a drag that ends anywhere still resolves, and
  only the primary pointer is tracked so multi-touch cannot flip.

## Options considered

- **View Transitions API + `flushSync`** — the reference's mechanism. It fits
  *there* because a route change replaces the whole document, so naming the
  root and sliding it is free and the only work is opting the arrows out.
  Here the flip is one panel inside a fixed layout: the snapshot
  pseudo-elements are children of the document root, so a ±100% slide of the
  clock group paints over the chevrons and the environment toggles unless
  clipping on `::view-transition-image-pair` holds — precisely the kind of
  cross-browser detail that regresses silently, on the tablet, in a
  presentation layer no test watches. Rejected: identical result, less
  control.
- **React 19.2 `<ViewTransition>` / Next's `experimental.viewTransition`** —
  same shape, and it is flagged experimental. ADR 01 already decided this repo
  does not build on experimental flags (it is why we are on TS 5, not 7).
  Rejected.
- **Mantine `Transition`** — built for one element entering or leaving. A
  paired slide needs two elements moving in opposite directions with a shared
  clock. Rejected; it would be fought, not used.
- **A real carousel: all 18 mounted in a strip, translate the strip** — the
  physics come free and drag-follow becomes trivial. ADR 08 rejected this on
  18 live subtrees and Aurora's blur layers running off-screen, and that
  reasoning has not changed. Rejected; two layers is the bounded version.
- **Crossfade instead of a slide** — cheaper and direction-free, which is the
  problem: the gesture's whole content is its direction. Rejected.
- **Animating on a `key` change alone (CSS-only)** — nothing in CSS knows
  which way the user swiped. Rejected.

## Scope

### In scope

- `useClockFlip` — the flip state machine (current, outgoing, direction,
  landing timer) and the single `flip(step)` entry point.
- Two-layer directional slide in the clock slot, clipped, 420 ms, both
  directions, wired to swipe **and** both chevrons.
- Reduced-motion path: instant swap, no second layer.
- Gesture hardening: pointer capture, primary-pointer-only.
- Tests: unit coverage of the flip lifecycle (direction, restart-on-interrupt,
  landing teardown, reduced-motion short-circuit), a story showing the
  animation, and an ADR 09 e2e assertion that a flip animates and settles to
  exactly one clock.
- ADR 08 amendment noting its deferred polish landed here.

### Out of scope

- **Live finger-tracking** (the clock following the finger 1:1 before the
  threshold, with a rubber-band release) — a genuinely different interaction
  with its own physics, velocity handling and cancel semantics. Future
  **ADR: gallery drag physics**, on evidence that commit-then-slide feels
  detached on the real tablet.
- **Arrow-key flipping** — still an ADR 06 amendment if ever wanted, exactly
  as ADR 08 left it.
- **Dots/position indicator** — still ADR 08's "revisit on evidence".
- **Animating the ADR 08 palette repaint** (cross-fading the page background
  along with the clock) — the repaint is a token-layer concern owned by
  ADR 15; blending it is a separate decision, not a free rider on this one.
- **Any change to the flip's semantics** — order, wrapping, persistence, and
  `swipeIntent`'s 40 px / horizontal-intent rule are ADR 08's contract and are
  untouched.

## Implementation outline

1. **`web/src/components/clock/useClockFlip.ts`** — owns
   `{ outgoingClockId, direction, flip(step) }`. `flip` reads the currently
   displayed clock id, calls `flipClock(step)`, and stages that id as the
   outgoing layer with the direction. A timer clears the outgoing layer after
   `FLIP_ANIMATION_MS`. **Gotcha:** the landing timer must be cleared and
   re-armed on *every* flip — otherwise the first flip's timer fires mid-way
   through an interrupting second flip and pops the outgoing layer early. Same
   class of bug as ADR 21's edge-triggering, and the reason that hook keeps
   its own refs.
2. **`ClockGallery`** — extract the clock render into a local `layer` so the
   outgoing and incoming copies are provably identical, and drive the pointer
   handlers and both chevrons through `flip`. **Gotcha:** the outgoing layer
   must keep rendering the *outgoing* clock's component from the registry, not
   the new one; resolve it by id at render time.
3. **`clockGallery.module.css`** — `position: relative; overflow: clip` on the
   slot; `.layer` is `position: absolute; inset: 0`. **Gotcha:** ADR 07's
   `.frame` is `container-type: size`, so the layer must give it a definite
   box — `inset: 0` does, a bare `position: absolute` does not, and every
   `cqmin` size in all 18 designs silently collapses if it does not.
4. **Keyframes** mirroring the reference: `flip-out-left` / `flip-in-right`
   for forward, `flip-out-right` / `flip-in-left` for back, on
   `cubic-bezier(.4, 0, .2, 1)`; `will-change: transform` only on the layers,
   only while they exist. A `@media (prefers-reduced-motion: reduce)` block
   drops all of it — the belt to the hook's braces, so the animation cannot
   survive a hook regression.
5. **Gesture hardening** — `setPointerCapture(event.pointerId)` on
   `pointerdown`, an `event.isPrimary` guard, and `start` cleared on both
   `pointerup` and `pointercancel`. **Gotcha:** with capture set, `pointerup`
   is guaranteed to arrive at the slot, which is exactly what makes the
   existing `onPointerUp` resolution correct rather than lucky.
6. **Tests** — unit tests on the hook's lifecycle, a `ClockGallery` story with
   the flip visible, and one e2e that flips and asserts a single settled clock
   after the animation window.
7. **Verify** — `npm test`, `npm run build`, `npm run build-storybook`, and
   the ADR 09 suite; then flip by hand at ~590 px and ~1180 px, in both
   schemes, with the takeover engaged.

Honest sizing: **half a day.** The state machine is an hour; the rest is
making sure the second layer does not disturb ADR 07's container queries, the
ADR 15 tokens, or ADR 21's stacking — which is where a "just add a slide"
change actually goes wrong.

## Acceptance criteria

- [x] Flipping forward slides the outgoing clock left and the incoming clock
      in from the right; flipping back mirrors it. Verified by eye and by the
      direction attribute in tests.
- [x] A chevron tap and a swipe produce the same animation.
- [x] The slide is clipped to the clock slot: no frame of the animation paints
      over the chevrons, the session strip, or the environment toggles.
- [x] Exactly one clock is mounted before and after a flip; at most two during
      it, and the outgoing one is gone once the animation lands.
- [x] A second flip during an in-flight flip is honoured, not dropped, and
      restages the slide from the clock that was on screen.
- [x] With `prefers-reduced-motion: reduce`, the swap is instant, no second
      layer is mounted, and no transform is applied.
- [x] A swipe whose `pointerup` lands outside the slot still flips.
- [x] A non-primary (multi-touch) pointer never flips.
- [x] ADR 08's contract is unchanged: order, wrap-around, 40 px threshold,
      horizontal-intent rejection of vertical scrolls, persistence, and the
      palette repaint all behave exactly as before, with the repaint leading
      the slide rather than trailing it.
- [x] A running timer keeps counting across a flip and the countdown in the
      incoming clock is continuous (no restart at the animation boundary).
- [x] Flipping works, and looks right, while ADR 21's takeover covers the
      page (by swipe — see the deviation note).
- [x] `npm test`, `npm run build`, `npm run build-storybook`, and the ADR 09
      e2e suite are green.

## Consequences

- The gallery finally *reads* as a gallery: the direction the user pushed is
  the direction the content moves, which is the entire point of a swipe.
- ADR 08's "only the active clock renders" gains a bounded, written exception.
  Any future work that mounts a clock outside the active slot now has a
  precedent to point at — and a 420 ms ceiling to stay under.
- The slot becomes a clipping, positioned container. Anything a future clock
  design wants to paint outside its own frame (a glow, an overflowing shadow)
  is now doubly clipped; ADR 07's `.frame` already clips, so nothing changes
  today, but the constraint is now structural.
- Commit-then-slide is a deliberate stop short of a finger-tracking carousel.
  If the tablet says it feels detached, the drag-physics ADR is the answer,
  and this hook is the seam it plugs into.
- The pointer-capture fix makes the swipe reliable at the slot's edges, which
  is where a tablet-first app is actually swiped.
