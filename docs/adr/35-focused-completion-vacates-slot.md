# ADR 35: Focused completion vacates the slot — the fourth bug report

- Status: Implemented (deviations noted)
- Date: 2026-07-26

- Deviation (2026-07-26, implementation): restore-on-undo and restore-on-failure
  only fill the slot if it is still empty — a task the user deliberately focused
  meanwhile outranks the revert (the snapshot is dropped, not queued).
- Deviation (2026-07-26, implementation): there was no completed-slot story to
  delete — ADR 20's implementation had wired `completed` through the panel only;
  the removal was the prop, the panel effect, and the e2e assertions.
- Deviation (2026-07-26, implementation): the slot's error mark reuses the list
  card's `cardError` class and copy ("Could not complete"), rendered in the
  bottom row where the gone-badge lives — no new styling.

## Context

Bug report (2026-07-26, owner): *"when completing a focused task, it should
disappear from there."* ADR 20 decided the opposite, explicitly, as an
owner-delegated call: completing the focused task **keeps it in the slot,
shown completed, for the 10 s undo window**, and only auto-unfocuses when the
bar lapses. That decision has now met its user. The lingering completed card
reads as "the tap didn't work" — the circle fills, but the thing you just
finished stays pinned above the list as if it still wanted attention, for ten
seconds, in the most prominent spot the panel has.

The list already behaves the way the report asks for: a completed card checks
and leaves **instantly** (optimistic, `completingIds` filters render), and the
undo affordance lives on the `UndoBar`, not on the card. The focused slot is
the one place where completion parks the corpse in view. The asymmetry was
deliberate in ADR 20 but it is the slot, not the list, that turned out to feel
wrong — and nothing about undo actually requires the card to stay: the bar
carries the title, the countdown and the Undo button on its own.

This supersedes ADR 20's focused-task interplay bullet and its matching
acceptance criterion (annotated there). Everything else in ADR 20 — the 10 s
`COMPLETION_UNDO_MS` window, undo-by-reopen, cross-type displacement, timer
independence — is untouched.

**Prerequisite: ADR 20 Implemented.**

## Decision

- **Completing the focused task vacates the slot immediately, on tap** — same
  optimistic instant as a list card: circle fills, card leaves, the API call
  rides behind. The slot does not render a completed state at all any more;
  `FocusedTaskCard`'s `completed` prop and the panel's lapse-watching effect
  (`wasCompletingFocused`) go away rather than idle.
- **Undo restores focus exactly as it was.** The panel snapshots the focused
  task at complete-tap; a successful reopen within the window puts the
  snapshot back in the slot (and the refetch returns the card to the list,
  where it re-hides behind the exclusion — net effect identical to today's
  undo).
- **Failure restores focus too.** Optimistic UI reverts fully: a failed close
  puts the snapshot back in the slot with the circle's error affordance, the
  same revert-in-place grammar as a list card. `useTaskCompletion` grows an
  `onFailed(taskId)` callback to make that possible — today failure is
  internal to the hook.
- **The undo bar is unchanged** — 10 s, "Completed · *title*", reopen on
  Undo, ADR 20's displacement rules intact.
- **Time attribution is unchanged in rule, narrowed in effect** (ADR 14: the
  run-end comment posts to whatever is focused *then*). Completing the focused
  task mid-run now unfocuses at the tap instead of ten seconds later, so a
  run-end inside the old window no longer posts to the completed task. ADR 20
  already accepted "complete + auto-unfocus mid-run means a later run-end
  posts nowhere"; this moves the boundary, it does not create the gap. Undo
  restores focus and with it attribution.

## Options considered

- **Keep the lingering completed card (status quo)** — the report exists
  because it feels broken; the undo bar makes the card redundant. Rejected.
- **Vacate only after the POST succeeds** — leaves the card in the slot for a
  network round-trip, which on a bad connection is exactly the lag the
  optimistic list flow was built to hide. Rejected; tap is the moment.
- **Failure surfaces on the list card instead of restoring focus** — the card
  would reappear in the list with the error affordance (the machinery already
  does this once unfocus lifts the exclusion), but a network error silently
  costing the user their focus — and their run's attribution — is a revert
  that doesn't revert. Rejected.
- **A brief (~1 s) completed flash before vacating** — animation polish with
  a timer, a test, and a race for a state nobody asked to see longer.
  Rejected; the filling circle is the acknowledgement.

## Scope

### In scope

- Immediate unfocus on complete-tap in the focused slot; snapshot + restore
  on undo and on failure.
- `useTaskCompletion`: `onFailed` callback (additive; list behavior
  unchanged).
- Removal of `FocusedTaskCard`'s `completed` prop, its story, and
  `TodoistPanel`'s `wasCompletingFocused` effect.
- Test updates: unit (panel flow), stories, and the ADR 09 E2E block that
  asserted the completed-slot render.
- ADR 20 annotations (interplay bullet + acceptance criterion superseded by
  this ADR).

### Out of scope

- Any change to the undo window length, the bar, displacement rules, or the
  list/detail completion flows — ADR 20 stands.
- Completed-task browsing, batch actions, authoring — ADR 20's cuts stand.
- Manual copy: the docs page never described the lingering behavior
  (checked), so `DocsSections.tsx` needs no change; if implementation proves
  otherwise, it changes in the same session per ADR 29.

## Implementation outline

1. **Snapshot ref in `TodoistPanel`** — on the slot's `onComplete`, stash
   `focusedTask` in a ref, call `setFocusedTask(null)`, then
   `completion.complete(...)`. **Gotcha:** unfocusing lifts `excludeId`, so
   the card would reappear in the list mid-flight — it doesn't, because
   `completingIds` filters list render (ADR 20's deviation note); do not
   "fix" the exclusion, it is already handled one layer down.
2. **`onFailed` in `useTaskCompletion`** — invoke after the revert
   (`completingIds` cleared, `failedIds` set). Panel: if the failed id
   matches the snapshot, restore focus and clear the snapshot. The restored
   slot's circle shows the error affordance via the existing `failedIds`
   plumbing — `FocusedTaskCard` needs the same `failed` wiring list cards
   have; check `TaskCircle`'s props before assuming it's free.
3. **Undo path** — in `onUndone`, if the undone id matches the snapshot,
   restore focus and clear the snapshot; the existing `list.reload()`
   brings the card back to the list where the exclusion re-hides it.
   **Gotcha:** clear the snapshot when the bar lapses or is displaced too
   (watch `completion.pending` going null/other), or a much-later undo of a
   *different* task could never match but a stale snapshot still leaks
   memory of the old task across sources.
4. **Delete the old machinery** — `wasCompletingFocused` effect, the
   `completed` prop on `FocusedTaskCard`, its story, and `onCompleted`'s
   focused-id special case (focus is already null by then; the reload can
   run unconditionally).
5. **Tests** — panel unit tests: tap → slot empty immediately (before the
   stubbed POST resolves); undo → snapshot restored exactly (title,
   priority, description snippet); failure → snapshot restored with error
   affordance; lapse → snapshot cleared, slot stays empty. Rewrite the E2E
   steps that asserted the completed slot render. Timer-independence spy
   stays green untouched.

Honest sizing: **half a day.** The snapshot lifecycle (step 3's
clear-on-lapse) is the only real thinking; the rest is deleting code ADR 20
wrote.

## Acceptance criteria

- [x] Tapping the focused task's circle empties the slot immediately, before the network responds (stubbed slow POST); the undo bar appears with the task title. *(E2E: 800 ms delayed close, slot count 0 before it resolves.)*
- [x] Undo within the window restores the focused slot exactly as it was — the snapshot object is restored whole (E2E asserts the title; priority/description/badge ride the same `FocusedTask`) — and the reopened task re-hides from the list behind the exclusion.
- [x] A failed close restores the focused slot with an error mark ("Could not complete", `focused-error`); no undo bar appears.
- [x] After the window lapses the slot stays empty and a later unrelated undo does not resurrect the old focus (E2E completes+undoes the *other* task and asserts the slot stays empty).
- [x] Completing from the list or the detail view is byte-for-byte unchanged (all pre-existing ADR 20 e2e tests still green, untouched).
- [x] A running timer is unaffected by any completion path (ADR 20's timer e2e still green).
- [x] `FocusedTaskCard` no longer accepts `completed` (a `failed` prop + `CompleteFailed` story arrived instead); `npm test` (154), `npm run build`, `npm run build-storybook` green; the ADR 09 block updated — 36/36 across all four projects.
- [x] ADR 20's interplay bullet and slot acceptance criterion are annotated as superseded by this ADR.

## Consequences

- The panel's completion grammar is finally uniform: everywhere a circle is
  tapped, the task leaves that surface instantly and the bar is the single
  undo home.
- The slot loses a rendered state (completed) and the panel loses an effect —
  net code deletion; the new complexity is one snapshot ref with a
  well-defined clear.
- Mid-run completion now always drops run-end attribution unless undone —
  the boundary ADR 20 accepted, moved from bar-lapse to tap.
- ADR 20's record stays honest: the owner-delegated decision is not erased,
  it is superseded with the reason a user gave.
