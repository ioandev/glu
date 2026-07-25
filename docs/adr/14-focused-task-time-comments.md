# ADR 14: Focused task & time-tracking comments

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-23 — added the bottom undo bar: posts now go through a
  10-second grace window in the outbox, and Undo cancels the pending comment
  before it sends. Chosen over post-then-delete precisely so the proxy's
  write surface stays at one verb.
- Amended: 2026-07-24 — Zustand adoption (ADR 02): `focusedTask` and the
  outbox are persisted store slices; outbox enqueue/cancel/dispatch are
  store actions. Grace deadlines, `runId` idempotency, and all criteria
  unchanged.
- Amended: 2026-07-24 — the undo bar generalizes into the shared `UndoBar`
  host (**ADR 20**): message + action, one visible, newest wins.
  Commit-on-displace for comment entries is unchanged and now explicitly
  cross-type (a completion bar displacing a pending comment commits it).
- Amended: 2026-07-25 — **the outbox retries on a backoff, and drops writes
  that can never land** (security audit F-4). This ADR said a failed entry
  stays queued and retries, and said nothing about how often — so it retried
  every 2 s for as long as the tab stayed open. `attempts` was counted and
  never read. Now: `retryDelayMs` doubles from 2 s to a 5-minute ceiling, and
  a 4xx that is not 401/408/429 drops the entry, because a deleted task or a
  rejected body will not accept the write on the hundredth try either.
  "A network blip must never lose tracked time" is untouched — a network
  error is not an `ApiError`, so it still backs off rather than dropping.
- Amended: 2026-07-25c — **the undo window is two phases: post after 2 s, then
  5 s to delete** (owner decision). Ten seconds of "comment will be added" made
  the comment feel withheld rather than recorded — the tracker's whole point is
  that the time lands in Todoist — so the grace shrinks to **2 s** and a
  **5-second post-then-delete window** follows it. This **reverses the
  2026-07-23 amendment's bargain**: undo now costs a fourth write verb,
  `DELETE …/comment/:id`. It is not a delete-by-id passthrough — the route
  reads the comment first and refuses anything that is not **ours**
  (`posted_uid`) *and* **`[Nm]`-shaped**, so the capability the proxy gains is
  "delete a GLU time comment", not "delete comments". One bar spans both
  phases (same key, same `[Nm]` badge; the text flips "will be added" →
  "added") so the handover is a word change, not a dismiss-and-reappear.
  Two rules fall out and are recorded: the queued phase advertises the *whole*
  `grace + undo` window up front, so a slow POST cannot leave a hole in the
  middle of the bar; and **undo follows the gesture, not the queue** — only
  runs that ended in this session get the posted-phase bar, so an outbox entry
  drained on load (a blip retried hours later) posts silently instead of
  popping an unprompted Undo. `UNDO_GRACE_MS` splits accordingly into
  `COMMENT_GRACE_MS` / `COMMENT_UNDO_MS` here and `COMPLETION_UNDO_MS` in
  ADR 20, which is unchanged at 10 s.
- Amended: 2026-07-25b — **the backoff now counts from the last attempt, not
  from `postAfter`** (`OutboxEntry.lastAttemptAt`, additive and optional).
  The first cut measured the delay from the entry's fixed grace deadline,
  which cancelled the backoff in the two cases that matter most: past the
  5-minute ceiling, `postAfter + 300 s` is permanently in the past, so the
  *most* stuck entry went back to re-POSTing every 2 s; and
  `commitOutboxEntry` sets `postAfter` to 0 (commit-on-displace), where
  every delay is already elapsed, so a displaced entry never backed off at
  all. Found while scoping ADR 24, whose `/todoist/*` limiter answers 429 —
  a transient status this outbox retries into. No blob version bump:
  entries persisted without the field read as 0 and spend one immediate
  retry, which stamps them.

- Amended: 2026-07-25d — **the comment gained a second half: how the run was
  spent** (**ADR 27**). `[5m] You spent 5 minutes on this` becomes
  `[5m] You spent 5 minutes on this — with music, on headphones` when the
  environment toggles say so. Everything this ADR made load-bearing survives
  intact and deliberately: the suffix lands **after** the anchor, so
  `parseTimeComment`, the totals sum and the DELETE guard's ours-and-shaped
  check are untouched (ADR 27 re-verifies all three against decorated
  fixtures); and the write verb stays **not a text channel** — `POST …/comment`
  accepts `{taskId, minutes, environment?}` where `environment` is an array of
  *enumerated keys*, which the server filters, dedupes and orders itself before
  composing the only words that exist. The outbox entry carries the
  environment snapshotted **at run end**, because an entry that retries hours
  later must describe the room the run happened in, not the room it drained
  in. Off by user choice, or absent on an entry from before ADR 27, both mean
  undecorated; the sender never falls back to live state.

- Amended: 2026-07-25e — **the posting threshold is a setting** (**ADR 28**).
  "Post when `ranMs > 60 s`" becomes "post when `ranMs >` the minute the user
  picked", from a fixed ladder (1 / 2 / 5 / 10 / 15) in Settings whose
  **default is this ADR's 60 s** — so the shipped behaviour is the default and
  nothing changes until the row is touched. `COMMENT_THRESHOLD_MS` is gone;
  `qualifies` takes the threshold as an argument and the run-end listener
  passes the store's value. **The comparison also flips to `>=`** (ADR 28
  amendment, same day): "post when `ranMs` is **at least** the chosen minute".
  This ADR's "60 s exactly does not post" is **superseded** — it was
  defensible while the number was a constant nobody could see, and indefensible
  next to a row labelled *Minimum time to log*. The case that proved it is the
  smallest run GLU can make: 5 minutes, −2 twice (`MIN_TOTAL_MS` is one
  minute), run to 0:00 — `accumulatedRanMs` caps the stretch at `endAt`, so it
  is exactly 60 000 ms, and `>` silently threw it away. This ADR's other
  rule holds: the threshold is read **at run end**, with ADR 27's snapshot — the
  outbox holds decisions already taken, so raising the bar at lunch cannot
  silence time queued this morning. The gate remains client-side by
  construction: the proxy never sees `ranMs`, and its `1 ≤ minutes ≤ 40320`
  bounds are unchanged. ADR 05's session count is untouched — a finished run
  under the threshold is still a pomodoro, which widens the divergence this
  ADR already records at the bottom of its Consequences.

- Amended: 2026-07-25f — **the focused card keeps the description line** (owner
  report: focusing a task hid its description). The focused slot's snapshot was
  `{id, title, priority}`, so pinning a task silently dropped the one
  ellipsized description line ADR 12 gives every list card — the pinned task
  showed *less* about itself than the ones below it. `FocusedTask` gains an
  optional `description` snippet, capped at 200 characters on the way into the
  blob (`focusedDescription`): the card clamps to **two** lines where a list
  card gets one, because this is the task being worked on and the card has the
  room. Additive, no version bump — a blob written before this field, and a
  task without a description, both render as no line. The snippet is a
  **snapshot**, stale until re-focus, exactly like the title and priority
  beside it; the detail view (ADR 13) remains the live read.

- Amended: 2026-07-25g — **a run that ended while the app was closed keeps its
  comment** (owner report: no undo bar, no comment, no change to the task's
  total). The restored-expired path emitted its run end into an empty room:
  `rehydrate()` calls `settleAfterRehydrate()` → `finish()` → `emitRunEnd`
  *during* hydration, and the app shell — carrying this ADR's `onRunEnd`
  listener — now mounts one render **later**, because the gate in front of
  `/glu` renders nothing until hydration resolves. ADR 05's half never broke:
  the session is recorded inside the store action, so the run counted, the
  comment vanished, and nothing on screen said so. **The run-end bus now
  buffers events emitted while nothing is subscribed and replays them to the
  first listener** (once — a later second listener must not re-receive them).
  A buffer rather than a re-ordering, deliberately: the ordering was never
  ours to promise, and any future gate, splash or lazy boundary would
  reintroduce the same race. What this does *not* change is the older rule
  from amendment c — an entry merely **drained** on load still posts silently;
  it is the *end* of a run, discovered at load, that gets the bar, exactly as
  it did before the gate existed.

  The rule this leaves behind: **an event bus with exactly one consumer, fed
  from inside hydration, is a mount-order bet.** If a fact must survive
  regardless of who is listening, it belongs in the store's own state or in a
  buffer — not in a fire-and-forget emit.

- Deviation (2026-07-24, implementation): the outbox drains on load, on window
  focus, and on a 2 s interval while entries exist — the interval is what lets a
  grace deadline expire into a post without a user gesture.
- Deviation (2026-07-24, implementation): `accumulatedRanMs` caps the in-flight
  stretch at `endAt`, so the restored-expired path records the run's real
  attention rather than hours of closed-tab time (the ADR's own gotcha, with a
  named test).
- Deferred to HUMAN-TODO: a real post against a real Todoist task (the composed
  text, the badge summing real comments). Both routes are covered by supertest
  against a mocked upstream, and the flow end-to-end by stubbed-proxy E2E.
- Deferred to HUMAN-TODO (amendment c): a real DELETE. `GET /comments/{id}` and
  `DELETE /comments/{id}` are taken from the API docs and exercised only
  against a mock — the same standing this ADR's other routes had before ADR 12
  found `GET /api/v1/filters` 404ing in reality. Treat the undo verb as
  unverified against live Todoist until that box is ticked.

## Context

Product brief (2026-07-23): above the ADR 12 list sits a **focused task** —
picked via an extra button on each list card, removed from the list while
focused. When a timer run ends with **more than 1 minute** on it, the app
**posts a comment** on the focused task ("[5m] You spent 5 minutes on this"),
the task's comments **auto-refresh** in the expanded view (ADR 13), and the
focused card shows a **corner total** ("[60m]") summed **from those comments**
— with **validation capping at 28 days** (comments can be faked) and counting
**only comments by the same author**.

This is the previously-named future ADR "task-linked sessions", and it crosses
a deliberate line: **the first write verb on the Todoist proxy** (ADRs 12/13
kept the server structurally read-only). The write lands as narrowly as the
reads did.

**Prerequisites: ADRs 02, 03, 11, 12, 13 Implemented.** One-line amendments
ride along: ADR 02 (engine tracks ran-time and emits a run-end event), ADR 11
(`status` returns the user id), ADR 12 (cards gain the focus affordance).
ADR 05/06 interplay is specified below — the divergence is deliberate and
recorded.

## Decision

### The focused slot

- **One focused task, persisted** (`focusedTask: {id, title, priority,
  description?}` — `description` added 2026-07-25f, additive blob field,
  ADR 08 pattern), rendered as a card **above the list**
  and **excluded from the list** while focused. Each list card gets a small
  focus button (Tabler target icon, ≥44 px); the focused card gets an
  unfocus button that returns it to the list. Tapping the focused card opens
  ADR 13's detail like any other card.
- **Focus is optional**: no focused task → timer behaves exactly as before,
  nothing posts anywhere.
- **A focused task gone upstream** (completed/deleted, detected on any
  fetch) renders a gone-state with the unfocus affordance — never an error
  screen (ADR 12/13 posture).

### What gets posted, and when

- **"When a timer stops" means any run end**: reaching 0:00 (`finished`),
  manual Stop (button, `s`, `Ctrl+C`), or `n` restart. **The metric is
  actual running time (`ranMs`)** — accumulated across pauses, minted per
  run — **not** `total − remaining`, which lies the moment ±2/±5 exist
  (that's the gotcha that would ship). ADR 02's engine grows `ranMs` and a
  run-end event; both additive.
- **Deliberate divergence from ADR 05/06 semantics, recorded**: `n` abandons
  the *session count* ("that one didn't count") but still posts the time
  comment if >1 minute ran — the session is a completed pomodoro, the
  comment is a fact about attention spent, and 15 real minutes on a task
  don't stop being real because the pomodoro was abandoned. Owner can
  override this line; it's the one judgment call in the brief.
- **Threshold and format**: post when `ranMs > 60 s` — **now when `ranMs` is
  at least the minute chosen in Settings, of which 60 s is the default**
  (amendment e, ADR 28; the strict `>` is superseded, so a 1-minute run
  posts). Content is exactly
  `[Nm] You spent N minutes on this` (singular "minute" at 1), where
  `N = round(ranMs / 60s)`, minimum 1. **Minutes-only, always** — the
  bracket prefix is a parseable contract (`^\[(\d+)m\] `), and one format
  beats a pretty one.
- **Posting is idempotent per run**: an outbox entry keyed by `runId`
  (ADR 05's contract, second consumer) — a run posts at most one comment,
  across retries, reloads, and the restored-expired path.
- **A tiny persisted outbox, because silent time loss is worse**: post
  attempts that fail (network blip) persist in an additive blob field and
  retry on load/focus, capped at 20 entries; a quiet badge on the focused
  card shows pending count. This is a tracker — dropping the tracked thing
  on a dropped packet is not acceptable v1 behavior, and the outbox is ~a
  screen of code.

### Undo (the bottom bar)

- **Every qualifying run end enqueues the comment with a 2-second grace
  deadline; nothing posts before the deadline** (amendment c — it was 10 s,
  and that was long enough that the comment felt withheld). While the entry
  is in grace, an **undo bar slides up from the bottom of the screen** —
  "[5m] comment will be added · **Undo**" — and **Undo deletes the entry from
  the outbox before it ever sends**. Cancelling an unsent post still needs no
  server capability at all; that property is why phase one survives.
- **The post then lands, and the same bar offers 5 more seconds to take it
  back** — "[5m] comment added · **Undo**", where Undo is a real
  `DELETE …/comment/:id`. Same key, same badge, same position: the bar never
  leaves the screen between the phases, and which mechanic runs is decided at
  click time from live state, so a tap landing exactly on the handover still
  does the right thing. The queued phase advertises the full `2 s + 5 s`
  window from the start, so a slow POST cannot punch a hole in the middle of
  it; a POST slow enough to miss the window lets the bar lapse rather than
  resurrecting it.
- **Undo follows the gesture, not the queue.** Only runs that ended in this
  browser session get the posted-phase bar. An outbox entry drained on load —
  a network blip retried hours later — posts silently: an unprompted "Undo"
  for something the user did yesterday is a bug, not a feature.
- **The bar is a small custom component** (fixed bottom-center, Mantine
  `Transition` slide-up, Undo button ≥44 px, auto-dismisses when the grace
  expires). Not `@mantine/notifications` — one use case doesn't buy a
  notification system; re-evaluated in **ADR 18** — declined again; standing
  rule: a third toast-shaped need adopts it.
- **Edge rules, decided**: a second qualifying end while a bar is pending
  **commits the pending entry immediately** and shows the bar for the new
  one (queue-of-one, commit-on-displace — undo always refers to the thing
  you just did). A newer run also **ends an older comment's delete window**
  rather than stacking a second bar behind it — the same rule, one phase
  later; the older comment simply stays. **Reload or close during grace
  commits**: the entry is already persisted in the outbox, posts via the
  normal retry path on next load, and the undo opportunity lapses — closing
  the site is not an undo, and tracked time must not depend on a race. No
  undo hotkey (ADR 06 owns the roster; possible amendment there if wanted).

### The write verbs, narrowly

- **`POST /glu/api/todoist/comment`** — the allowlist's first non-GET, and
  it is **not a general comment API**: the server accepts only
  `{task_id, minutes}` and *composes the comment text itself*, validating
  `1 ≤ minutes ≤ 40320` (28 days). Even a hijacked frontend can only post
  well-formed time comments with sane bounds. The blast radius of write #1
  stays a scratch. It answers `{posted, content, id}` — the id is what makes
  the post undoable (amendment c); an upstream that omits it simply yields a
  comment the bar cannot offer to undo.
- **`DELETE /glu/api/todoist/comment/:id`** (amendment c) — write verb four,
  and the only destructive one. Shaped the same way: **an id is not
  permission to delete.** The route reads the comment first and refuses —
  403, with no delete issued — unless it is **ours** (`posted_uid` vs the
  ADR 11 user id, missing uid reads as ours, exactly as the totals route
  treats it) *and* parses as a `[Nm]` time comment. So the capability the
  proxy gains is "delete a GLU time comment", not "delete comments", and an
  XSS still cannot reach the account's comment history. Cost: two reads
  before the delete, on a rare user-initiated action.

### The total badge

- **The server computes totals**: `GET /glu/api/todoist/task/:id/time-total`
  follows **all** comment pages (unlike ADR 13's display cap of 100 — a
  gotcha called out so nobody "reuses" the capped fetch), filters to
  comments **authored by the authenticated user** (`posted_uid` vs the
  ADR 11 user id — shared projects mean other people's comments exist and
  can imitate the format), parses `^\[(\d+)m\] `, drops values outside
  1..40320, and sums. Invalid comments are *ignored*, never errors.
  Response: `{minutes, counted, ignored}`.
- **Display**: corner badge on the focused card; minutes up to 119
  (`[75m]`), then hours/days (`[2h 5m]`, `[3d 4h]`) — presentation only,
  storage and parsing stay minutes. **Sum clamps at 40320 and shows
  `[28d]`** when clamped — the 28-day rule applies to the total as well as
  to each comment.
- **Auto-refresh**: after a successful post, the total refetches and — if
  ADR 13's detail is open on that task — its comments refetch too. The
  brief's "automatically refreshed" is these two invalidations, not
  polling.
- **TanStack Query trigger fired, evaluated, declined**: ADR 12 named
  mutations as the trigger; the mutation set is one endpoint and the
  invalidation is two function calls. Plain hooks hold. The Todoist
  *actions* ADR (complete/edit) re-runs this evaluation with a real
  mutation surface.

## Options considered

- **Post only on natural finish (strict pomodoro reading)** — a 15-minute
  stopped run on a focused task posts nothing; the tracker under-reports
  reality. Rejected (recorded as the overridable call).
- **Elapsed = `total − remaining`** — wrong under ±2/±5 adjustments.
  Rejected for explicit `ranMs`.
- **Client-side total computation** — ships every comment to the browser and
  duplicates parse/validation in two codebases. Rejected; server owns the
  contract it writes.
- **General-purpose `POST /comments` passthrough** — write access shaped
  like the whole API instead of shaped like the feature. Rejected;
  `{task_id, minutes}` only.
- **No outbox (fire and forget)** — silent loss of the core artifact on any
  network blip. Rejected.
- **Undo via post-then-DELETE** — requires a comment-deletion verb on the
  proxy (write surface doubles, and a delete endpoint must verify it only
  deletes our own time comments); the grace window achieves the same user
  outcome with zero new capability. Rejected — **and adopted anyway in
  amendment c**, once a 10-second withhold proved to be the wrong trade in
  practice. The rejection's own condition ("must verify it only deletes our
  own time comments") is exactly what the route now does, so the price came
  out where this bullet predicted: one narrow verb, two reads, no
  passthrough.
- **`@mantine/notifications` for the undo bar** — a notification system for
  one snackbar; re-evaluated in **ADR 18** and declined again (standing
  rule recorded there). Rejected.
- **Todoist durations/other native fields for time tracking** — comments are
  the brief's chosen ledger and are visible in Todoist proper, which is the
  point. Not pursued.
- **Adopt TanStack Query now** — one mutation, three queries. Declined with
  the trigger honored on paper (see Decision).

## Scope

### In scope

- Focused slot UI (card, corner total badge, unfocus, gone-state, pending
  badge), focus buttons on list cards, list exclusion, persistence.
- Engine additions: `ranMs`, run-end event (ADR 02 amendment).
- Comment posting on qualifying run ends, `runId`-idempotent, with the
  persisted retry outbox and the 2-second grace window (amendment c).
- The bottom undo bar (slide-up, Undo cancels the pending entry, then deletes
  the posted one for 5 s more, commit-on-displace, commit-on-reload).
- `POST …/comment` (validated, composing, returns the id),
  `DELETE …/comment/:id` (ours-and-time-shaped or 403) and
  `GET …/task/:id/time-total` (full pagination, author filter, bounds, clamp)
  on the proxy.
- Post-success invalidations (total; ADR 13 comments when open).
- ADR 11 `status` extended with user id (amendment there).
- Tests: engine `ranMs` across pause/±/restore paths; threshold edge (60 s
  no, 61 s yes — **59 s no, 60 s yes** since amendment e); idempotency across reload-with-pending-outbox; supertest on
  both routes (bounds, author filter, format rejection, clamp, non-allowlisted
  verbs still rejected); parser property tests (imitation comments by other
  authors ignored); stories for the focused slot states; ADR 09 E2E block
  (stubbed proxy: focus → run ends via `page.clock` → post observed → badge
  updates).

### Out of scope

- Completing/editing tasks, arbitrary comments → future **ADR: Todoist task
  actions** (write verb #2+, and the TanStack re-evaluation).
- Multiple focused tasks / focus history → future ADR if briefed.
- Linking ADR 05 session records to task ids — cancelled with the history UI
  (2026-07-24); nothing would ever display it.
- Editing our posted comments, or deleting one past its undo window (on
  unfocus, or on noticing a mistake later) → future amendment if wanted.
  Amendment c bought exactly one delete, aimed at the comment you just made;
  it is not a comment manager.
- Live sync of totals from other devices → refresh-on-post/focus only.

## Implementation outline

1. **Engine first** (ADR 02's hook): `ranMs` accumulation on every
   running→(paused|stopped|finished) edge, run-end event carrying
   `{runId, ranMs, endKind}`. **Gotcha:** the restored-expired path (closed
   while running) must compute `ranMs` up to `endAt`, not to "now" — hours
   of closed-tab time are not attention. **Gotcha:** persist accumulated
   `ranMs` in the blob with the run so reload-mid-run doesn't zero it.
2. **Proxy routes** — the composing POST (bounds, exact text, singular/
   plural), the guarded DELETE (read-then-check-then-delete; 403 without
   touching the delete when the comment is somebody else's or not
   `[Nm]`-shaped) and the totals GET (cursor-follow all pages with a sane
   page bound ~2000 comments + distinct log if exceeded, author filter,
   parse, clamp). **Gotcha:** the parse regex anchors at start with the
   trailing space (`^\[(\d+)m\] `) — unanchored parsing turns "[5m] …" quoted
   inside someone's reply into counted time, and on the DELETE route that
   same laxness would turn a quoted bracket into permission to delete
   somebody's reply.
3. **Outbox** — additive blob field, `runId`-keyed entries carrying a
   `postAfter` grace deadline; the sender only dispatches entries past
   their deadline; retry on load/focus, drop-with-log past cap; badge count
   on the focused card. **Gotcha:** the grace timer is a deadline timestamp
   in the entry, not a `setTimeout` — a reload mid-grace must resume the
   countdown from the persisted deadline (same reasoning as ADR 02's
   `endAt`).
4. **Undo bar** — fixed bottom-center, slide-up `Transition`, shows while the
   newest entry is in grace *and* through the 5 s after it posts; Undo
   cancels in phase one and DELETEs in phase two; displacement commits the
   previous entry immediately. **Gotcha:** the bar overlays the bottom-right
   toggles for up to 7 s — bottom-*center* placement and a compact width keep
   the toggles reachable; verify at 590 px. **Gotcha:** keep the message
   *key* identical across the phases. A key change makes the host treat it as
   a new message, and the expiry bookkeeping then hides-then-reshows the bar
   mid-handover. **Gotcha:** with a 2 s grace and a 2 s drain tick, the
   interval alone would spend up to half the window still saying "will be
   added" — schedule one timer at the nearest deadline so the phase flip
   lands where this ADR says it does.
5. **Focused slot UI + list exclusion + focus buttons** — exclusion is a
   client-side filter by id on ADR 12's already-fetched list (no new query).
6. **Invalidations** — post success → refetch total; detail-open-on-task
   → refetch comments (ADR 13's hook exposes a refetch handle; no query
   library).
7. **Tests/stories/E2E** per scope. The E2E flow is the whole loop:
   focus → `page.clock` runs 5 minutes → stop → undo bar appears →
   fast-forward past the grace → stubbed POST asserted with `{minutes: 5}`
   → badge shows `[5m]`; the cancel branch: stop → Undo → fast-forward →
   zero POSTs; and the delete branch (amendment c): stop → fast-forward 3 s
   → POST landed and the *same* bar now reads "comment added" → Undo →
   stubbed DELETE asserted for that comment id.

Honest sizing: **4–4.5 days** (undo added ~half a day) — the biggest feature
ADR since the clocks.
Engine + outbox correctness is day one; the two proxy routes with their
validation/pagination discipline are day two; UI is day three; the test
matrix (this ADR touches timer, storage, auth identity, and two prior
Todoist surfaces) is the rest. Anyone sizing this "a day, it's one comment"
hasn't met the restored-expired path.

## Acceptance criteria

- [x] Each list card shows a focus button; focusing moves the task to the slot above the list and out of the list; unfocusing returns it; the choice survives reload.
- [x] **(amendment f)** Focusing a task with a description keeps that description on the focused card — clamped to two lines, inside the same tap target as the title, and still there after a reload; a task without one adds no line.
- [x] With a focused task, a run of 5 clock-minutes ended by Stop posts exactly one comment `[5m] You spent 5 minutes on this` **after the 2-second grace expires** (stubbed upstream asserts the composed body; tests fast-forward the clock); reaching 0:00 and `n` restart also post; a 59-second run posts nothing; a 61-second run posts `[1m] You spent 1 minute on this`. — **amended (ADR 28)**: a run of exactly 60 s posts too, since the threshold is now a labelled *minimum* rather than a bar to clear.
- [x] Ending a qualifying run slides the undo bar up from the bottom; pressing Undo within the grace results in zero POSTs ever (fast-forward past the deadline and assert); the bar dismisses itself when the whole window expires.
- [x] **(amendment c)** Fast-forwarding 3 s after a qualifying stop: the POST has landed, the bar is still up, its text now reads "comment added", and its badge is unchanged — one bar, not two. Pressing Undo there calls `DELETE …/comment/c1` exactly once and no second POST ever fires.
- [x] **(amendment c)** Letting the full window lapse deletes nothing: one POST, zero DELETEs, bar gone.
- [x] **(amendment c)** The DELETE route refuses a comment whose `posted_uid` is somebody else's, and one of ours that is not `[Nm]`-shaped — 403 each, with the upstream delete never called (supertest asserts the call count, not just the status).
- [x] A second qualifying run end during a pending grace commits the first comment immediately and shows the bar for the second.
- [x] Reload during the grace: the comment posts once via the outbox on next load (no undo bar reappears, no duplicate).
- [x] **(amendment g)** Reopening the app after a run ended while it was closed posts that run's comment exactly once — the run-end bus buffers an event emitted before anything subscribed and replays it to the first listener; a second listener mounting later receives nothing, and a blob already in `finished` re-emits nothing on any load.
- [x] At 590 px the undo bar does not cover the environment toggles or the timer controls (bottom-center, compact).
- [x] With no focused task, no POST occurs on any run end.
- [x] Pausing mid-run excludes paused time: run 3 min, pause 10 min (clock), run 2 min, stop → `[5m]`.
- [x] A run with +5 applied posts its actual ran time, not `total − remaining`.
- [x] Kill the network (stub failure), end a run → outbox badge shows 1; restore network, refocus the app → the comment posts once and the badge clears; reloading between failure and retry does not duplicate the post (runId idempotency).
- [x] The focused card shows the summed badge from fixture comments; comments by a different `posted_uid` with identical format are ignored; a fixture comment `[999999m]` is ignored; a sum exceeding 40320 displays `[28d]`.
- [x] After a successful post, the badge updates without manual refresh; with ADR 13's detail open on the focused task, the new comment appears without pressing its refresh button.
- [x] The POST route rejects `minutes: 0`, `minutes: 40321`, and any attempt to supply free-text content (supertest); the allowlist exposes exactly four write routes and every other verb/path pair — including `DELETE /comments/:id` and `DELETE /task/:id` — is a 404.
- [x] The totals route follows pagination past 100 comments (fixture with 150 time comments sums all 150).
- [x] Focused-task-gone (stubbed 404) shows the gone-state with working unfocus; timer behavior unaffected throughout.
- [x] Stories cover the slot states (normal, badge, pending, gone) in both schemes; a11y passes; `npm test`, `npm run build`, `npm run build-storybook` green; ADR 09 block active-or-skipped-naming-09.

## Consequences

- The pomodoro and Todoist halves of GLU finally touch: time spent lands in
  Todoist itself, visible in every Todoist client — the comment ledger *is*
  the sync, no backend-&-sync ADR required for this data.
- **The proxy is no longer append-only** (amendment c). That was a real
  security property and it is gone; what replaces it is a delete verb that
  can only reach comments matching *our own generated format*, authored by
  *us*, checked server-side before the delete is issued. The honest reading:
  the blast radius went from zero to "a hijacked frontend could delete the
  time comments GLU itself wrote". Any future audit should re-derive that the
  authorship *and* shape checks both still run before `todoistDelete`, since
  dropping either one silently widens the verb to the whole comment history.
- The proxy's write surface exists now, but shaped like the feature
  (`{task_id, minutes}`), not the API — the pattern write verb #2 will be
  held to.
- The `[Nm]` prefix is a public, forgeable format in shared projects —
  author filtering + bounds are the defense, and the parse contract lives
  server-side only, in one place, tested.
- The engine's `ranMs` is new load-bearing state: any future ADR touching
  run lifecycle (auto-cycles, alerts) inherits "does this affect ran-time?"
  as a mandatory question.
- ADR 05's count and this ADR's minutes now answer different questions
  ("how many pomodoros" vs "how long on this task") with different rules on
  `n` — recorded here and in both files' orbit; support questions about the
  mismatch point at this section.
