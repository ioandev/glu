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

- **One focused task, persisted** (`focusedTask: {id, title, priority}`,
  additive blob field, ADR 08 pattern), rendered as a card **above the list**
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
- **Threshold and format**: post when `ranMs > 60 s`. Content is exactly
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

- **Every qualifying run end enqueues the comment with a 10-second grace
  deadline; nothing posts before the deadline.** While the newest entry is
  in grace, an **undo bar slides up from the bottom of the screen** —
  "[5m] comment will be added · **Undo**" — and **Undo deletes the entry
  from the outbox before it ever sends**. This is why undo costs zero new
  server capability: cancelling an unsent post needs no delete verb, and the
  proxy stays append-only with exactly one write route.
- **The bar is a small custom component** (fixed bottom-center, Mantine
  `Transition` slide-up, Undo button ≥44 px, auto-dismisses when the grace
  expires). Not `@mantine/notifications` — one use case doesn't buy a
  notification system; re-evaluated in **ADR 18** — declined again; standing
  rule: a third toast-shaped need adopts it.
- **Edge rules, decided**: a second qualifying end while a bar is pending
  **commits the pending entry immediately** and shows the bar for the new
  one (queue-of-one, commit-on-displace — undo always refers to the thing
  you just did). **Reload or close during grace commits**: the entry is
  already persisted in the outbox, posts via the normal retry path on next
  load, and the undo opportunity lapses — closing the site is not an undo,
  and tracked time must not depend on a 10-second race. No undo hotkey
  (ADR 06 owns the roster; possible amendment there if wanted).

### The write verb, narrowly

- **`POST /glu/api/todoist/comment`** — the allowlist's first non-GET, and
  it is **not a general comment API**: the server accepts only
  `{task_id, minutes}` and *composes the comment text itself*, validating
  `1 ≤ minutes ≤ 40320` (28 days). Even a hijacked frontend can only post
  well-formed time comments with sane bounds. The blast radius of write #1
  stays a scratch.

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
  outcome with zero new capability. Rejected.
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
  persisted retry outbox and the 10-second grace window.
- The bottom undo bar (slide-up, Undo cancels the pending entry,
  commit-on-displace, commit-on-reload).
- `POST …/comment` (validated, composing) and `GET …/task/:id/time-total`
  (full pagination, author filter, bounds, clamp) on the proxy.
- Post-success invalidations (total; ADR 13 comments when open).
- ADR 11 `status` extended with user id (amendment there).
- Tests: engine `ranMs` across pause/±/restore paths; threshold edge (60 s
  no, 61 s yes); idempotency across reload-with-pending-outbox; supertest on
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
- Editing/deleting our posted comments on unfocus or mistake → future
  amendment if wanted; v1 posts are append-only.
- Live sync of totals from other devices → refresh-on-post/focus only.

## Implementation outline

1. **Engine first** (ADR 02's hook): `ranMs` accumulation on every
   running→(paused|stopped|finished) edge, run-end event carrying
   `{runId, ranMs, endKind}`. **Gotcha:** the restored-expired path (closed
   while running) must compute `ranMs` up to `endAt`, not to "now" — hours
   of closed-tab time are not attention. **Gotcha:** persist accumulated
   `ranMs` in the blob with the run so reload-mid-run doesn't zero it.
2. **Proxy routes** — the composing POST (bounds, exact text, singular/
   plural) and the totals GET (cursor-follow all pages with a sane page
   bound ~2000 comments + distinct log if exceeded, author filter, parse,
   clamp). **Gotcha:** the parse regex anchors at start with the trailing
   space (`^\[(\d+)m\] `) — unanchored parsing turns "[5m] …" quoted inside
   someone's reply into counted time.
3. **Outbox** — additive blob field, `runId`-keyed entries carrying a
   `postAfter` grace deadline; the sender only dispatches entries past
   their deadline; retry on load/focus, drop-with-log past cap; badge count
   on the focused card. **Gotcha:** the grace timer is a deadline timestamp
   in the entry, not a `setTimeout` — a reload mid-grace must resume the
   countdown from the persisted deadline (same reasoning as ADR 02's
   `endAt`).
4. **Undo bar** — fixed bottom-center, slide-up `Transition`, shows while
   the newest entry is in grace; Undo removes the entry (nothing ever hits
   the network); displacement commits the previous entry immediately.
   **Gotcha:** the bar overlays the bottom-right toggles for up to 10 s —
   bottom-*center* placement and a compact width keep the toggles reachable;
   verify at 590 px.
5. **Focused slot UI + list exclusion + focus buttons** — exclusion is a
   client-side filter by id on ADR 12's already-fetched list (no new query).
6. **Invalidations** — post success → refetch total; detail-open-on-task
   → refetch comments (ADR 13's hook exposes a refetch handle; no query
   library).
7. **Tests/stories/E2E** per scope. The E2E flow is the whole loop:
   focus → `page.clock` runs 5 minutes → stop → undo bar appears →
   fast-forward past the grace → stubbed POST asserted with `{minutes: 5}`
   → badge shows `[5m]`; and the undo branch: stop → Undo → fast-forward →
   zero POSTs.

Honest sizing: **4–4.5 days** (undo added ~half a day) — the biggest feature
ADR since the clocks.
Engine + outbox correctness is day one; the two proxy routes with their
validation/pagination discipline are day two; UI is day three; the test
matrix (this ADR touches timer, storage, auth identity, and two prior
Todoist surfaces) is the rest. Anyone sizing this "a day, it's one comment"
hasn't met the restored-expired path.

## Acceptance criteria

- [x] Each list card shows a focus button; focusing moves the task to the slot above the list and out of the list; unfocusing returns it; the choice survives reload.
- [x] With a focused task, a run of 5 clock-minutes ended by Stop posts exactly one comment `[5m] You spent 5 minutes on this` **after the 10-second grace expires** (stubbed upstream asserts the composed body; tests fast-forward the clock); reaching 0:00 and `n` restart also post; a 59-second run posts nothing; a 61-second run posts `[1m] You spent 1 minute on this`.
- [x] Ending a qualifying run slides the undo bar up from the bottom; pressing Undo within the grace results in zero POSTs ever (fast-forward past the deadline and assert); the bar dismisses itself when the grace expires.
- [x] A second qualifying run end during a pending grace commits the first comment immediately and shows the bar for the second.
- [x] Reload during the grace: the comment posts once via the outbox on next load (no undo bar reappears, no duplicate).
- [x] At 590 px the undo bar does not cover the environment toggles or the timer controls (bottom-center, compact).
- [x] With no focused task, no POST occurs on any run end.
- [x] Pausing mid-run excludes paused time: run 3 min, pause 10 min (clock), run 2 min, stop → `[5m]`.
- [x] A run with +5 applied posts its actual ran time, not `total − remaining`.
- [x] Kill the network (stub failure), end a run → outbox badge shows 1; restore network, refocus the app → the comment posts once and the badge clears; reloading between failure and retry does not duplicate the post (runId idempotency).
- [x] The focused card shows the summed badge from fixture comments; comments by a different `posted_uid` with identical format are ignored; a fixture comment `[999999m]` is ignored; a sum exceeding 40320 displays `[28d]`.
- [x] After a successful post, the badge updates without manual refresh; with ADR 13's detail open on the focused task, the new comment appears without pressing its refresh button.
- [x] The POST route rejects `minutes: 0`, `minutes: 40321`, and any attempt to supply free-text content (supertest); all other write verbs remain rejected.
- [x] The totals route follows pagination past 100 comments (fixture with 150 time comments sums all 150).
- [x] Focused-task-gone (stubbed 404) shows the gone-state with working unfocus; timer behavior unaffected throughout.
- [x] Stories cover the slot states (normal, badge, pending, gone) in both schemes; a11y passes; `npm test`, `npm run build`, `npm run build-storybook` green; ADR 09 block active-or-skipped-naming-09.

## Consequences

- The pomodoro and Todoist halves of GLU finally touch: time spent lands in
  Todoist itself, visible in every Todoist client — the comment ledger *is*
  the sync, no backend-&-sync ADR required for this data.
- Undo-by-grace keeps the server append-only: the proxy still cannot delete
  anything, which is a security property worth more than instant posting —
  and the 10-second delay is invisible in Todoist-glancing practice.
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
