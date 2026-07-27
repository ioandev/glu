# ADR 43: Pull to refresh the task list — the gesture the tablet was missing

- Status: Implemented (deviations noted)
- Date: 2026-07-26

## Context

Brief (2026-07-26, owner): *"In tablet mode, swipe down on the list of todos,
and it should show an icon coming down, and if dragged a certain length, show
visible until refresh happens, spinning, and refresh the list, and then it goes
back up hiding."*

GLU is tablet-first, and the task list is the one region of the app a user
actually distrusts: Todoist is edited elsewhere — phone, laptop, the Todoist app
on the same tablet — and the list has **no polling** by design (ADR 12: battery
and rate limits, for a list glanced at between pomodoros). Freshness therefore
comes from exactly three triggers today, all of them already built:

- source change,
- window focus / `visibilitychange` (`useTodoistList`),
- the header's refresh button (ADR 12's manual refresh, `data-testid="task-refresh"`).

The button works. It is also a 44 px target in the top-right strip, next to the
source picker and under ADR 10's fixed corner arrow — the far corner of a 1180 px
tablet held in two hands. Pull-to-refresh is the gesture every touch user already
has in their fingers for exactly this question ("is this list current?"), and it
lands where the doubt is: on the list itself.

The substrate is already there, which is why this ADR is small. `useTodoistList`
exposes `reload()` and `refreshing`, and `refreshing` already means precisely
"a request is in flight *over an already-rendered list*" — the tasks stay put and
the header control spins instead of the list collapsing to skeletons. A pull
gesture is a second way to press the same button and a second way to render the
same `refreshing` flag. **No new fetch machinery, no new state in the store, no
backend change.**

Prior art in the repo, and it is load-bearing: ADR 08/25's clock gallery is
driven by **Pointer Events with pointer capture**, with a multi-touch bail-out
and a travel threshold before a drag counts. This ADR copies that shape rather
than inventing a second gesture idiom.

## Decision

**The task list region gets a pull-to-refresh gesture: touch only, from the top
of the list only, resolving to the same `reload()` the header button calls.**

### The gesture

1. **Arming.** A `pointerdown` arms the gesture when *all* of: `pointerType` is
   not `"mouse"`; it is the only active pointer; the list's scroll container is
   at `scrollTop === 0` (or there is no scroll container — the hint, error and
   empty states); a source is selected; and a refresh is not already in flight.
2. **Engaging.** The gesture *engages* only after **8 px of downward travel**
   with `dy > |dx|`. Below that it is a tap and the `TaskCard` underneath keeps
   it; a horizontal-dominant drag never engages. On engage the host takes
   pointer capture, so a finger that wanders off the panel still ends the
   gesture here.
3. **Tracking.** Engaged, the indicator's travel is `pull(dy)` — **half the
   finger's distance, clamped to 96 px**. Resistance is not decoration: a 1:1
   indicator on a container that cannot scroll up reads as a bug, and the clamp
   is what tells the finger the gesture has a ceiling.
4. **Arming the release.** At **64 px of indicator travel** the indicator is
   *armed*: it goes to full opacity and stops rotating with the finger. This is
   "dragged a certain length" from the brief, and it is a visual state, not just
   a number — a release below it must be visibly a no-op before it happens.
5. **Release.** Under threshold: the indicator springs back up (180 ms) and
   **nothing is fetched**. At or over threshold: the indicator snaps to a
   **rest position of 56 px**, starts spinning, and `reload()` is called.
6. **Retracting.** The indicator stays at rest, spinning, until `refreshing`
   goes false **and at least 400 ms have passed** since it started, then slides
   back up and unmounts. The floor is the gotcha that always gets skipped: a
   200 ms response makes a spinner flash once and the user reads it as "nothing
   happened", which is the exact doubt the gesture exists to answer.

### Where it lives

- A new **`PullToRefresh`** component in `web/src/components/todoist/`, wrapping
  `<TaskList>` inside `TodoistPanel`. It owns the gesture, the indicator and the
  travel state. `TaskList` stays a pure renderer of the five list states.
- `TaskList` gains one prop, **`scrollRef`**, forwarded to its `.list` div. That
  is how the wrapper reads `scrollTop` without querying the DOM by test id, and
  it is `null` in the four non-list states — which is correct: those states do
  not scroll, so they are always "at the top" and always pullable.
- The indicator is `IconRefresh` in a round chip, absolutely positioned at the
  top of the host, translated by the current travel. It reuses the existing
  `glu-refresh-spin` keyframes and `--glu-*` chrome tokens (ADR 15) — no
  hardcoded colour, no second spin animation.

### Three rules that are easy to get wrong

- **`touch-action: pan-y` on the host, `overscroll-behavior-y: contain` on
  `.list`.** We do not `preventDefault` the scroll, so the browser must be told
  not to run its own rubber-band/page-pull underneath ours. This is also why the
  gesture uses Pointer Events and not React's `onTouchMove`: React attaches
  `touchmove` **passively** at the root, so a `preventDefault`-based
  implementation silently does nothing and then gets "fixed" with a native
  non-passive listener nobody remembers to remove.
- **The gesture is an enhancement, not an affordance.** The indicator is
  `aria-hidden`; the header refresh button remains the accessible, keyboard- and
  screen-reader-reachable path and keeps its `aria-busy`. A pull gesture has no
  accessible equivalent and this ADR does not pretend otherwise — it adds no
  capability that was not already reachable by a button.
- **An engaged gesture eats the click.** After a drag past the engage
  threshold, browsers still fire `click` on the element under `pointerup`. The
  host swallows exactly one click, in the capture phase, after an engaged
  gesture — otherwise a pull that started on a task card opens that task.

### Reduced motion

Under `prefers-reduced-motion: reduce`: no spin (the existing rule already
covers the shared keyframes) and no snap/retract transitions — the indicator
appears and disappears at its positions. Finger-tracked movement stays: it is
direct manipulation, not animation.

## Options considered

- **A bigger / repositioned refresh button.** Cheapest, but the button is not
  the problem — its distance from the content is, and the brief asks for the
  gesture by name.
- **Polling the list every N seconds.** Explicitly rejected by ADR 12 (battery,
  Todoist rate limits). Unchanged here.
- **A pull-to-refresh library (`react-simple-pull-to-refresh` et al).** A new
  dependency, its own DOM wrapper and its own scroll assumptions, for ~120 lines
  we already have the idiom for (ADR 08/25). Also drags in its own spinner,
  which would be the one thing in the panel that ignores the chrome tokens.
- **Touch Events with non-passive `preventDefault`.** The classic implementation,
  and the one that fights React's passive root listeners and iOS bounce. Pointer
  Events + `touch-action` + `overscroll-behavior` is the same result declaratively,
  and matches the gallery.
- **Making the gesture work with a mouse/trackpad (wheel overscroll).** A
  different interaction with different failure modes (momentum scrolling fires
  wheel events for a second after the finger lifts). Desktop has the button.
- **Pull-to-refresh in the source picker / gallery / settings too.** Nothing
  there is stale in the way a task list is stale. Out of scope.

## Scope

### In scope

- `PullToRefresh` component: gesture, travel state, indicator, click swallow.
- Pure helper `pull(dy)` — resistance and clamp — exported and unit-tested.
- `scrollRef` prop on `TaskList`; `PullToRefresh` wired around it in
  `TodoistPanel`.
- CSS in `todoist.module.css`: host, indicator, armed/spinning states,
  `touch-action`, `overscroll-behavior-y: contain` on `.list`, reduced-motion.
- Storybook: `PullToRefresh` stories at rest, mid-pull, armed, refreshing.
- Unit test for `pull()`; component test for the engage/arm/release/retract
  cycle including the sub-threshold no-op and the 400 ms floor.
- e2e test on the touch-enabled Playwright projects, over the existing Todoist
  route mocks.
- `hasTouch: true` on the two **tablet** Playwright projects — a tablet has a
  touchscreen, and the config saying otherwise is a pre-existing inaccuracy this
  ADR needs corrected to test its primary target.
- ADR 12 amendment (the fourth freshness trigger) and ADR 19 unchanged; the
  Todoist section of `DocsSections.tsx` gains one sentence, with `DOCS_UPDATED`
  bumped (ADR 29's contract).

### Out of scope

- Horizontal swipe actions on task cards (complete/focus by swipe). Future ADR
  if ever briefed — it would have to negotiate with this gesture's `dy > |dx|`
  rule, which is why the rule exists now.
- Pull-to-refresh anywhere else in the app.
- Haptics (Vibration API) on arming. Unsupported on iOS Safari, so it would be
  a half-shipped feel. Named future note only.
- A "last refreshed at HH:MM" line. A different question ("how old is this?")
  than the one the gesture answers.
- Wheel/trackpad overscroll.
- Changing anything about *when* the list revalidates on its own (ADR 12's
  no-polling decision stands).

## Implementation outline

1. **`pull(dy)`** in `PullToRefresh.tsx` (or `types.ts` alongside
   `sectionRuns`): `Math.min(Math.max(dy, 0) * 0.5, PULL_MAX)`. Constants:
   `PULL_ENGAGE = 8`, `PULL_THRESHOLD = 64`, `PULL_REST = 56`, `PULL_MAX = 96`,
   `PULL_MIN_SPIN_MS = 400`.
2. **`TaskList`**: add `scrollRef?: RefObject<HTMLDivElement | null>` and pass it
   to the `.list` div. No other change — the five states stay exactly as they are.
3. **`PullToRefresh`**: props `{ refreshing, onRefresh, enabled, scrollRef,
   children }`. Internal state `phase: "idle" | "pulling" | "armed" |
   "refreshing" | "retracting"` plus `travel`. Handlers `onPointerDown`,
   `onPointerMove`, `onPointerUp`, `onPointerCancel` on the host div, mirroring
   `ClockGallery`'s capture pattern; a `pointerId` ref so a second finger cancels.
4. **The refresh handshake.** On armed release: set `phase = "refreshing"`,
   record the start time (a ref, not state), call `onRefresh()`. An effect
   watches `refreshing`: when it flips true→false, schedule the retract for
   `max(0, PULL_MIN_SPIN_MS - elapsed)`. **Gotcha:** `reload()` bumps a nonce and
   `refreshing` becomes true on the *next* render, so a naive
   `if (!refreshing) retract()` fires immediately on the same tick. Only retract
   after having observed `refreshing === true` at least once (a `sawFlight` ref),
   and guard the timer against unmount.
5. **The click swallow.** A `swallow` ref set on engaged release; a capture-phase
   `onClickCapture` on the host that consumes and clears it.
6. **CSS.** Host is `position: relative; flex: 1; min-height: 0; display: flex;
   flex-direction: column; touch-action: pan-y` — it inherits `.list`'s place in
   the panel's flex column, so `TaskList` must not lose its `flex: 1`. Indicator:
   36 px round chip, `--glu-surface` + `var(--glu-border)`, `transform:
   translateY(var(--pull))`, opacity ramping to 1 at the threshold, `transition`
   only in the snap/retract phases (never while tracking a finger — a transition
   on a per-frame transform is what makes a pull feel laggy).
   Add `overscroll-behavior-y: contain` to `.list`.
7. **`TodoistPanel`**: wrap `<TaskList>`; `enabled` = `source !== null`;
   `onRefresh` = `list.reload`; `refreshing` = `list.refreshing`. The header
   button is untouched and both paths spin their own indicator.
8. **Tests.** Unit: `pull()` boundaries. Component (Testing Library, synthetic
   pointer events + fake timers): engage, arm, sub-threshold release calls
   nothing, armed release calls `onRefresh` once, indicator persists while
   `refreshing`, retracts after the floor, a `scrollTop > 0` container never
   arms, `pointerType: "mouse"` never arms.
9. **e2e** (`features.spec.ts`, next to the existing Todoist block): with the
   task routes mocked and a source picked, drive `page.touchscreen` /
   `page.mouse` with `hasTouch`, assert the indicator appears, the tasks request
   fires a second time, and the indicator goes away. Flip the tablet projects to
   `hasTouch: true` and run the **whole** suite — if any existing spec regresses
   under coarse-pointer media queries, revert that flip and gate the new spec to
   the half-tablet projects instead, and record the deviation.
10. **Docs.** One sentence in the Todoist section of `DocsSections.tsx` ("Pull
    the list down to refresh it — the button in the corner does the same
    thing."), `DOCS_UPDATED` → the implementation date. Amend ADR 12's freshness
    list with the fourth trigger, and CLAUDE.md's ADR index / build order.

Honest sizing: half a day for the component and CSS, half a day for the tests
and the Playwright touch plumbing, which is where the time actually goes.

## Acceptance criteria

1. On a touch tablet, dragging down from the top of the task list shows a
   refresh icon that follows the finger at half distance and stops at 96 px.
2. Releasing before 64 px of indicator travel retracts it and issues **no**
   network request.
3. Releasing at or past 64 px holds the icon at 56 px, spinning, until the
   refresh resolves — and for no less than 400 ms — then retracts it out of
   sight.
4. The armed state is visually distinct from the un-armed state before release.
5. A pull that starts on a task card neither opens nor focuses that task.
6. A drag started when the list is scrolled down scrolls the list and never
   shows the indicator.
7. A mouse drag on a desktop pointer never triggers the gesture; the header
   refresh button still does.
8. The page behind the panel never rubber-bands or pulls while the gesture runs.
9. The header refresh button and the pull gesture drive the same `refreshing`
   flag: both spin, and neither collapses the list to skeletons.
10. Under `prefers-reduced-motion: reduce`, nothing spins and nothing animates,
    and the gesture still refreshes the list.
11. The indicator carries no accessible name and adds no tab stop.
12. `npm test`, `npm run build`, `npm run build-storybook` and `npm run e2e` are
    green; `just lint` is clean.
13. `DocsSections.tsx` documents the gesture and `DOCS_UPDATED` matches the
    implementation date.

## Implementation notes (2026-07-26)

Shipped as `web/src/components/todoist/PullToRefresh.tsx` (+ stories, +
`pullToRefresh.test.tsx`), a `scrollRef` prop on `TaskList`, the wrapper in
`TodoistPanel`, the `pullHost`/`pullIndicator` block in `todoist.module.css`,
three e2e tests in `features.spec.ts`'s ADR 12 block, and one docs row.

**Deviations from the outline**

- **No `armed` or `retracting` phase.** State is `idle | pulling | refreshing`;
  *armed* is derived from `travel >= PULL_THRESHOLD`, and *retracting* is `idle`
  plus the CSS transition on an indicator that never unmounts. Two fewer states
  that could disagree with the number they are computed from.
- **`PULL_STALL_MS` (1200 ms) added.** Not in the outline: a `reload()` that
  never puts a request in flight would otherwise spin forever. If `refreshing`
  has not gone true within the stall window, the indicator retracts anyway.
- **`setPointerCapture` is wrapped in `try/catch`.** It throws on a pointer the
  browser does not consider active. Losing capture is a worse gesture; an
  exception mid-handler is a broken one.
- **The `enabled`-drop reset uses React's adjust-state-during-render pattern,
  not an effect.** The repo's `react-hooks/set-state-in-effect` rule forbids the
  effect form, and it is right to: the effect version paints one frame of a
  spinner belonging to a list that is already gone.
- **`hasTouch: true` on the tablet Playwright projects was dropped.** The e2e
  drives the gesture by dispatching real `PointerEvent`s at the host — Playwright's
  touchscreen taps but does not drag — so the tests run on **all four** projects
  as they are. Flipping `hasTouch` would have changed coarse-pointer media
  queries app-wide for no test gain, which is a worse trade than the one this
  ADR proposed.
- **Reduced motion is asserted via `page.emulateMedia`,** not the `reducedMotion`
  context option, which this suite's already-created context does not honour.
  Same approach as ADR 21's existing reduced-motion test.

**Acceptance criteria**

1–4, 10 — [x] e2e `pulling the list down refreshes it, and the icon rides the
finger` (all four projects) asserts opacity 0 at rest, `--pull` tracking at half
distance to the 96 px clamp, `data-armed` appearing at the line, the spinner
held at 56 px and then retracted; `still refreshes — it just does not spin or
slide` asserts `transition-property: none` and `animation-name: none` under
reduced motion with the refresh still landing. Stories `AtRest` / `Pulling` /
`Armed` / `Refreshing` / `ReleasedShort` cover the same states in both schemes.
2, 7 — [x] e2e `a short pull refetches nothing, and a mouse drag never pulls at
all` (request counter unchanged across both); units `costs nothing when released
short of the line`, `never arms for a mouse`.
5 — [x] unit `swallows the click a completed pull would otherwise land on a
task`, and exactly one.
6 — [x] unit `never arms when the list is scrolled down`.
8 — [x] `overscroll-behavior-y: contain` on `.list`, `touch-action: pan-y` on
the host.
9 — [x] e2e asserts `task-refresh` reports `aria-busy="true"` and
`task-skeletons` has count 0 while the *pull* is in flight — one flag, both
paths.
11 — [x] unit + story: `aria-hidden="true"`, `pointer-events: none`, no tab stop.
12 — [x] `npm run test:unit` 390/390 (the 15 new ones included), `npm run test:stories` and
`test:stories:dark` 186/186 each, `npm run build`, `npm run build-storybook`.
e2e: 12 failures across the four projects, **all three of them pre-existing** —
`seeded-state defaults` (an `alertPromptsUsed` key from ADR 41), `Ctrl+C stops`
and `clock gallery wraps at both ends` (ADR 42's roster) — identical before and
after this change; everything else green, including the three new tests on every
project. `just lint` is clean for this ADR's files; one pre-existing
`set-state-in-effect` error remains in ADR 41's `useNotificationPermission.ts`.
(Other ADRs were being implemented in parallel in the same tree; every number
above is from a run of this ADR's own change, and every failure named is one
that reproduces without it.)
13 — [x] `DocsSections.tsx` gains a "Refreshing the list" row; `DOCS_UPDATED`
was already 26 July 2026.

## Consequences

- **Easier:** the freshness question is answered where it is asked, with the
  gesture users already have. The list gains a fourth revalidation trigger at
  the cost of zero new network policy — ADR 12's no-polling decision is
  untouched and, if anything, better justified.
- **Harder:** the task region now owns a vertical gesture. Any future
  swipe-on-card feature has to negotiate with it, and any future scroll-position
  work (restoring scroll, sticky headers) has to keep the `scrollTop === 0`
  arming condition true. Both are called out here so the next brief starts from
  them rather than discovering them.
- **Committed to:** Pointer Events + `touch-action` as *the* gesture idiom in
  this repo (second use, after ADR 08/25). A future gesture that reaches for
  Touch Events and non-passive listeners is a review defect unless it says why.
- **Committed to:** `hasTouch` on the tablet Playwright projects, i.e. the e2e
  suite now models the primary target accurately. That is a correction, but it
  means coarse-pointer behaviour is exercised everywhere and any future
  hover-dependent styling will surface in CI rather than on the device.
