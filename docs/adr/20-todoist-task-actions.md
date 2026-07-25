# ADR 20: Todoist task actions — complete + undo

- Status: Implemented (deviations noted)
- Date: 2026-07-24

> **Todoist's by-id behaviour for a completed task — recorded (2026-07-24):**
> *unverified tonight.* No Todoist app was registered during the implementation
> run. Both outcomes already degrade acceptably: a served completed task renders
> with the circle filled, a 404 lands in ADR 13's gone-state. The empirical
> answer is a HUMAN-TODO item.

- Deviation (2026-07-24, implementation): the shared `UndoBar` takes a
  `{key, badge, text, until, error, onUndo}` message rather than a union of
  entry types — one host, one shape, and the two mechanics stay in their own
  hooks.
- Deviation (2026-07-24, implementation): `completingIds` filters *render* in
  `TaskList`, which is what makes a refetch landing mid-completion unable to
  resurrect the card.
- Deviation (2026-07-24, implementation): ADR 13's "nothing in the detail UI
  mutates anything" criterion is explicitly superseded here (annotated there).

## Context

The read-only wall built through ADRs 12/13 (and breached exactly once, by
ADR 14's shaped comment POST) comes down by one more brick. Product decision
(2026-07-24): **v1 is complete + undo-completion only** — tap the priority
circle, the task is done; an undo bar offers the way back. Everything else
(edit, reschedule, arbitrary comments, create) stays out: GLU is a focus
surface, and Todoist proper is one tap away for authoring.

This closes the loop the whole Todoist arc built toward: see the task (12),
read the task (13), work the task (14), **finish the task (20)**. It is also
the third arrival of the mutation question, so the TanStack Query evaluation
gets its final answer below.

**Prerequisites: ADRs 11–14 and 19 Implemented** (cards, detail, the undo-bar
host, the focused slot, the shared auth store). Build order: after 14 — last
on the board.

**ADR 14's lifecycle question, answered**: does this affect ran-time? **No.**
Completing a task never touches the timer — the run belongs to the user, not
to the task's lifecycle (interplay below).

## Decision

### The action

- **The priority circle is the complete button, everywhere it appears** —
  list cards, the detail header, the focused slot. One `TaskCircle`
  component, tap → complete, exactly the gesture Todoist trained. ≥44 px
  including the tap halo (the visible circle is small; the target is not).
- **Two new proxy verbs, shaped and named**:
  `POST /glu/api/todoist/task/:id/close` and `…/reopen` — no bodies, no
  passthrough, mapped to Todoist's own close/reopen endpoints. The
  allowlist grows to exactly three write routes (14's comment + these two);
  supertest proves everything else is still rejected.
- **Optimistic, Todoist-style**: on tap the circle fills and the card
  checks instantly, then leaves the list (counts update); the API call
  rides behind. Failure → revert + the card's error affordance; the list's
  focus-revalidate reconciles any drift.

### Undo

- **Immediate complete + undo-by-reopen** — deliberately *not* ADR 14's
  grace-delay. The grace existed because comments had no inverse short of a
  delete verb; completion has a native inverse (`reopen`), so the action
  lands instantly (the satisfying part) and undo is a real API call, not a
  cancellation. Same 10-second bar, different mechanics.
- **The ADR 14 bar becomes a shared `UndoBar` host** (message + action,
  one visible at a time, newest wins — amended there). Cross-type
  displacement composes with 14's rule: a completion bar displacing a
  pending *comment* bar **commits the comment immediately** (14's
  commit-on-displace, unchanged); a comment bar displacing a completion
  bar merely dismisses the undo affordance — the completion already
  happened and remains undoable only through Todoist proper. Recorded, not
  discovered.
- **Undo failure** (task deleted upstream meanwhile — rare): brief error
  text on the bar, then the existing gone-state paths reconcile. Never an
  error screen.
- **Not a @mantine/notifications trigger**: this reuses the existing custom
  host with one more message type — zero new toast machinery. ADR 18's
  standing rule ("third genuinely *new* toast-shaped need adopts it")
  stands untouched; preempting the review comment here.

### Focused-task interplay (the owner-delegated decisions)

- **Completing the focused task keeps it in the slot, shown completed,
  for the undo window; when the bar expires, it auto-unfocuses** (nothing
  returns to the list — a completed task doesn't belong to the source
  list anyway). Undo within the window restores focus exactly as it was.
- **A running timer keeps running.** The run measures *your* attention,
  not the task's lifecycle; complete the task at 12:00 remaining and keep
  working, refocus something else, or stop — your call, not the app's.
- **Time attribution follows ADR 14's existing rule unchanged**: the
  comment posts at run end to whatever is focused *then*. Complete +
  auto-unfocus mid-run means a later run-end posts nowhere — accepted;
  inventing a new post-at-completion trigger to chase that tail was
  considered and rejected (a second posting trigger doubles the
  idempotency surface for an edge the undo window already shrinks).
- **Detail view of a just-completed task** stays open showing a completed
  indication during the undo window; afterwards, whether Todoist serves
  completed tasks by id or 404s them is **verified at implementation**
  (both degrade acceptably: completed-state render or 13's gone-state) and
  the answer recorded here.

### The TanStack Query question — final answer

- **Declined, third and final time, with the adoption point named.** The
  full mutation surface is now three shaped verbs; the optimistic flow here
  is one list-item toggle with a single rollback path — ~30 lines in the
  existing hooks + store, against a library that would arrive duplicating
  Zustand's state and the refetch machinery 12/13/14 already built.
  **Standing rule replacing the per-ADR re-litigation**: TanStack (or
  equivalent) is adopted when a *form-shaped* write surface arrives (task
  creation/editing — multi-field, validation, server errors per field);
  until that ADR exists, the question is settled and closed.

## Options considered

- **Grace-delayed completion (ADR 14's pattern)** — hides the satisfying
  instant check and buys nothing: reopen exists. Rejected; the two undo
  mechanics differ *because* the APIs differ, recorded side by side.
- **Complete only in the detail view** — the list is where the circle
  lives in Todoist's own grammar; making users open detail to complete is
  a tax with no safety payoff (undo exists). Rejected.
- **Swipe-to-complete on cards** — collides with ADR 08's horizontal
  gallery swipe grammar and 12's scroll-intent handling. Rejected.
- **Post the pending time comment at completion moment** — a second
  posting trigger, new idempotency surface, for an edge case. Rejected.
- **New keyboard shortcut (e.g. `c`)** — ADR 06 owns the roster; four keys
  are memorable. Rejected; ADR 06 amendment if ever briefed.
- **Adopt TanStack now** — see Decision; final answer recorded.

## Scope

### In scope

- `TaskCircle` complete affordance on list cards, detail header, focused
  slot; optimistic check + removal; revert-on-failure.
- `close`/`reopen` proxy verbs (shaped, allowlisted, supertest-proven).
- `UndoBar` host generalization (ADR 14 amended) + completion undo with
  the cross-type displacement rules.
- Focused-slot completion flow (completed state → expiry auto-unfocus →
  undo restores).
- Tests per ADR 03's checklist (outline), stories (completing card,
  completed focused slot, both bars' displacement states), ADR 09 E2E
  block (stubbed proxy: complete → gone from list → undo → back).

### Out of scope

- Task creation, editing, rescheduling, priority changes, arbitrary
  comments → future **ADR: task authoring** if ever briefed — which is
  also the named TanStack adoption point.
- Completed-tasks browsing/history view — GLU shows work to do, not work
  done.
- Batch operations, multi-select — single-tap, single-task, single-undo.
- A `c` hotkey → ADR 06 amendment if briefed.

## Implementation outline

1. **Proxy verbs** — two routes mapping to Todoist close/reopen; extend
   the allowlist test matrix (three writes allowed, all else rejected).
   **Gotcha:** reopen after the undo window is *not* exposed anywhere in
   GLU — resist adding a "recently completed" affordance; that's the
   completed-browsing feature explicitly cut.
2. **`TaskCircle`** — extract from the card/detail/slot renderings (12/13/
   14 each render a circle today; one component now owns fill-on-tap,
   priority ring colors, and the 44 px halo). **Gotcha:** the halo overlaps
   ADR 14's focus button on cards — order and spacing so a complete-tap
   never lands on focus (44 px each, no overlap, test at 590 px).
3. **Optimistic flow** — store-side `completingIds` set: tap → add id +
   fire POST; success → remove from list data + show undo bar; failure →
   remove flag, revert, error affordance. **Gotcha:** the list's
   focus-revalidate racing the optimistic state — a refetch landing
   between tap and POST-success must not resurrect the card
   (`completingIds` filters render, not just the mutation path).
4. **Undo bar integration** — generalize the host per ADR 14's amendment;
   completion message "Completed · *task title* · Undo"; undo → POST
   reopen → restore list entry (refetch) and focus if it was the focused
   task. Cross-type displacement per Decision, tested both directions.
5. **Focused-slot flow** — completed rendering, expiry auto-unfocus,
   undo-restores-focus; timer independence (spy: no timer transition ever
   fires from completion paths — the lifecycle answer, verified).
6. **Detail-of-completed verification** — implement, observe Todoist's
   by-id behavior for completed tasks, record the one-line answer in this
   ADR.

Honest sizing: **~1 day.** The optimistic/refetch race (step 3) and the
two-bar displacement matrix (step 4) are the real work; the proxy verbs are
an hour.

## Acceptance criteria

- [x] Tapping the circle on a list card checks it instantly and removes it from the list without waiting for the network (stubbed slow POST); the undo bar appears with the task title.
- [x] Undo within 10 s restores the task to the list (stubbed reopen called exactly once); after 10 s the bar dismisses and no reopen fires.
- [x] A failed close (stubbed 500) reverts the card in place with an error affordance and no undo bar; a failed reopen shows the bar's error text and the list reconciles on next refetch.
- [x] The circle works identically in the detail header and the focused slot; all three route through one `TaskCircle` (verified by import).
- [x] Completing the focused task shows it completed in the slot; after the window it auto-unfocuses and the slot returns to empty/hint; undo within the window restores focus and slot exactly.
- [x] A running timer is unaffected by any completion path (remaining keeps decreasing; the no-transition spy passes).
- [x] Cross-type displacement: run-end comment bar displaced by a completion → the comment posts immediately (stub asserts); completion bar displaced by a run-end comment bar → no reopen fires, comment bar behaves per ADR 14.
- [x] A refetch landing mid-completion does not resurrect the card (race test with delayed fixture).
- [x] The proxy accepts exactly three write routes (comment, close, reopen) and rejects all other verbs/paths (supertest matrix extended).
- [x] Complete-tap and focus-tap targets are both ≥44 px and non-overlapping at 590 px.
- [x] Stories cover completing/completed/error states and both displacement directions, both schemes; `npm test`, `npm run build`, `npm run build-storybook` green; the ADR 09 block is active and green.
- [~] This ADR is updated at implementation with the observed Todoist behavior for fetching a completed task by id. — **[deferred → HUMAN-TODO]**; the ADR records "unverified tonight, both outcomes degrade acceptably" at the top.

## Consequences

- The Todoist arc is functionally complete: view → read → track → finish,
  with the write surface still enumerable on one hand (three shaped verbs)
  and every one of them undoable or idempotent.
- The `UndoBar` host is now shared infrastructure with a composed
  displacement contract — a third undo-type message someday slots in
  without a new bar, but *transient info toasts* still trip ADR 18's
  standing rule instead.
- The TanStack question is closed with a named reopening condition
  (form-shaped authoring), ending three ADRs of re-litigation.
- The board has no unnumbered features left. Twenty ADRs specify the
  entire product; every future change is an amendment or a brief. The only
  thing the plan still lacks is the only thing that matters: `/adr 01`.
