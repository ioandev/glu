# ADR 05: Session tracking — sessions per day, "New day" reset

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-23 — backend & sync renumbered ADR 06 → ADR 07 (ADR 06 is now
  keyboard control); references updated.
- Amended: 2026-07-23 — backend de-numbered after a third displacement (ADR 07
  is now clock designs): referenced as "the backend & sync ADR" until scheduled.
- Amended: 2026-07-24 — **backend & sync and history UI cancelled** (product
  decision): the archive is local-only permanently, the 90-day cap is standing
  data policy, and the recorded mitigation is an optional manual export in the
  future settings ADR.
- Amended: 2026-07-24 — Zustand adoption (ADR 02): the day/archive live as a
  persisted store slice; the v1→v2 migration is the `persist` middleware's
  `version`/`migrate`; `recordSession(runId)` is a store action. Semantics,
  idempotency contract, and all criteria unchanged.

- Deviation (2026-07-24, implementation): idempotency is a bounded
  `recordedRunIds` ledger (last 50) in the persisted blob rather than a single
  "last recorded run" — it survives reloads, which is all the contract needs,
  without growing forever.
- Deviation (2026-07-24, implementation): the finished transition and the
  session record land in **one** `set`, so ADR 02's one-transition-one-write
  discipline holds through recording.
- Deviation (2026-07-24, implementation): subtracting past zero from `idle`
  (no run in flight) enters `finished` without recording — there was no run to
  complete. Recorded in ADR 02 too.
- Deviation (2026-07-24, implementation): the confirm popover renders
  `withinPortal={false}` with a zero-duration transition — it keeps the confirm
  inside the timer column's stacking context and makes the a11y snapshot
  deterministic.

## Context

PLAN.md calls GLU a "pomodoro / **tracker**", but through ADR 04 nothing is
tracked — a finished countdown vanishes. Product direction (2026-07-23): support
**multiple sessions in one seating**, with a visible count and a **"New day"
button that resets it to 0**.

Sequencing note, recorded: PLAN.md penciled the backend for "ADR 04 or 05". This
definition of 05 needs no backend — count-and-reset works entirely on ADR 02's
localStorage layer — so **the Express backend slides to a future ADR: backend &
sync** (repeatedly displaced since; unnumbered until actually scheduled).
Shipping session value now without standing up a server is the
whole point of having built the versioned `glu:v1` blob.

**Prerequisites: ADR 02 and ADR 03 Implemented** (state layer and test suite —
the recording edge cases below are test-first territory). ADR 04 is independent;
either order works.

## Decision

### What counts as a session

- **A session is recorded when the timer reaches `finished` — and only then.**
  Stopping mid-run records nothing: the count is a record of completed focus
  blocks, not attempts. No partial credit (future ADR if ever wanted).
- **A session record is `{ endedAt, durationMs, environment }`** — `durationMs`
  is the run's `total` at completion, `environment` a snapshot of the toggles
  **at completion time**. PLAN.md's toggles were always "what the user was doing
  at the time"; this is where that data finally attaches to something.
  Mid-session toggle-change nuance (per-interval tracking) is out of scope.
- **Recording is idempotent, keyed by run.** Every run gets a `runId` at start;
  both paths into `finished` — the live tick and ADR 02's restored-while-away
  branch — funnel through one `recordSession(runId)` that records at most once.
  Reloading an already-`finished` state must not record again.
- **From `finished`, Start begins a new run** at the selected duration — that is
  the "multiple sessions in one seating" loop: finish, breathe, Start again;
  the count accumulates.

### The day ("seating") and its reset

- **The current day is a list of session records in the store; the visible
  count is its length.** "New day" empties it after a **confirmation popover**
  — it sits near other buttons on a touch screen, and wiping the visible count
  on a stray tap reads as data loss even when it isn't.
- **"New day" archives before it clears.** The outgoing day (if non-empty) is
  pushed to an `archive` array, capped at the most recent 90 days. This is 20
  lines of insurance, not scope creep: the product is a *tracker*, and a reset
  that destroys the only tracked data forever contradicts its reason to exist.
  The archive is local-only — the once-planned upload and history UI were
  cancelled 2026-07-24; a manual export may join the ADR 19 settings
  surface via a future amendment.
- **Manual reset only — no midnight auto-rollover.** A seating legitimately
  spans midnight; the button is the user declaring a new day, and an automatic
  split at 00:00 would lie about late-night sessions. (Auto-suggest on a new
  calendar day → future ADR if wanted.)
- **"New day" does not touch the environment toggles or the timer** — it resets
  the count, nothing else. A new day doesn't move the user to a new room.

### Storage & placement

- **Schema bumps to `glu:v2`**: v1's fields unchanged, plus
  `{ day: { startedAt, sessions: [] }, archive: [] }`. **On load, a v1 blob
  migrates in place** — day/archive added empty, timer and toggle state
  preserved. The version field exists precisely so an upgrade never wipes a
  running timer.
- **The session strip (count + "New day") lives in the timer's left half,
  below the ± row** — it is timer-adjacent state, and the top-right stays
  reserved for Todoist per the layout contract. Presentation: one dot per
  session with a numeric label; dots cap at 12 with a "+N" overflow so a heroic
  day can't break the half-tablet layout.

## Options considered

- **Backend now (original 04/05 pencil)** — a server, auth story, and deploy
  surface to increment an integer; localStorage already owns durable state.
  Rejected — and later made permanent: the backend that eventually arrived
  (ADR 11) is a stateless Todoist proxy; the archive stays local.
- **Discard on "New day" (literal reset)** — irreversibly deletes the only
  tracked data in a tracker. Rejected for silent archive + cap.
- **Midnight auto-reset** — splits late-night seatings and surprises the user.
  Rejected; manual button only.
- **Record sessions on Stop too (partial credit)** — muddies what the count
  means; the user asked for sessions, not attempts. Rejected.
- **Environment snapshot at session start** — start-state is stale the moment
  the user toggles mid-run; completion snapshot is at least the freshest truth.
  Rejected (per-interval tracking → future ADR if the data ever matters).
- **Press-and-hold instead of confirm popover** — undiscoverable; a popover is
  one extra tap and self-explanatory. Rejected.

## Scope

### In scope

- Session recording on `finished` (both entry paths), idempotent per run.
- `finished` → Start → new run loop.
- Day model, session strip UI (count + dots + "New day" with confirmation),
  archive-on-reset with 90-day cap.
- `glu:v1 → v2` migration preserving all v1 state.
- Tests per ADR 03's behavior-checklist precedent (list in outline) and
  stories for the strip's states.

### Out of scope

- Express backend, `/api`, cross-device sync, uploading the archive —
  **cancelled 2026-07-24**: the backend (ADR 11) is a stateless Todoist proxy
  only; the archive is local-only.
- History/stats UI over the archive — **cancelled 2026-07-24**; revisit only
  with a fresh brief.
- Partial-credit sessions, per-interval environment tracking, midnight
  auto-suggest → future ADRs, named above.
- Session-end alerts (still the PWA-adjacent future **ADR: session-end
  alerts**) — recording a session makes no sound.
- Todoist area — still reserved, still empty.

## Implementation outline

1. **Schema + migration first** — extend the storage module: version check on
   load, v1 → v2 in-place migration, v2 write path. **Gotcha:** migrate on
   *read*, write back as v2 once; a migration that runs on every load will
   eventually double-apply somewhere. Corrupt/unknown versions still fall to
   clean defaults (ADR 03 already tests that path for v1).
2. **`recordSession` in the timer layer** — `runId` minted on every
   idle/finished → running transition; `finished` transition calls
   `recordSession(runId, snapshot)`; the store ignores a `runId` it has already
   recorded. **Gotcha:** the restored-expired path (ADR 02) enters `finished`
   without a live tick loop — it must pass through the same function, and the
   *persisted* `finished` state must carry `runId` so a second reload is a
   no-op. This is the bug farm; the idempotency tests are not optional.
3. **Session strip UI** — dot row + count + "New day" `Button` with Mantine
   `Popover` confirm, below the ± row. Dots cap at 12 + "+N". Touch targets
   ≥ 44 px including the popover's confirm button.
4. **Wire "New day"** — archive non-empty day (push, trim to 90), reset
   `day`, persist — one transition, one write, per ADR 02's write discipline.
5. **Tests** (behavior checklist):
   - finish via live tick → exactly one session; Stop mid-run → none.
   - restore-expired → `finished` + exactly one session; reload again → still one.
   - finished → Start → finish → count 2.
   - record contents: `endedAt`, `durationMs` = total at completion,
     environment snapshot matches toggles at completion (change a toggle
     mid-run, verify completion state wins).
   - New day: archive gains the day, count 0, toggles/timer untouched;
     cancel path changes nothing; archive trims beyond 90.
   - v1 blob → v2: running timer and toggles preserved, count 0, no crash.
6. **Stories** — strip at 0, 3, 12, and 20 sessions (overflow), popover open;
   both color schemes; both viewports (the strip must not wrap the layout at
   590 px).

Honest sizing: ~1 day. Steps 1–2 and their tests are the substance; the UI is
an afternoon. The restored-expired idempotency case will eat any time saved by
skipping its tests.

## Acceptance criteria

- [x] Completing two short countdowns back-to-back (finish → Start → finish) shows a count of 2; each completion incremented by exactly 1.
- [x] Stopping a run mid-countdown leaves the count unchanged.
- [x] Close the site with a timer running; reopen after its end time: the app shows `finished` and the count incremented exactly once; two further reloads leave it unchanged.
- [x] The stored session record (inspectable in devtools → localStorage `glu:v2`) contains `endedAt`, `durationMs` equal to the run's total, and the environment toggles as they stood at completion.
- [x] "New day" opens a confirmation; confirming resets the count to 0, moves the previous day into `archive`, and leaves timer state and toggles untouched; cancelling changes nothing.
- [x] After "New day" and a reload, the count is still 0 and the archive still holds the prior day.
- [x] With a hand-planted `glu:v1` blob containing a running timer, the app loads: timer continues correctly, toggles preserved, count 0, key now `glu:v2`.
- [x] Archive length never exceeds 90 days (plant 91, confirm trim).
- [x] The session strip renders in the timer's left half below the ± controls; top-right reserved space is untouched; at 590 px width a 20-session day shows dots capped with "+N" and no layout overflow.
- [x] All interactive elements of the strip, including the popover confirm, are ≥ 44 px.
- [x] Strip stories exist (0/3/12/20 sessions, popover open) and pass in both schemes; `npm test`, `npm run build`, `npm run build-storybook` all green.

## Consequences

- GLU starts earning the "tracker" half of its name: completed sessions become
  durable data with environment context attached.
- The versioned archive and migration pattern remain useful local machinery
  (the pattern already earned its keep in ADRs 08/14); the once-planned upload
  consumer is cancelled.
- The `runId` idempotency contract becomes load-bearing; any future ADR that
  adds a path into `finished` (alerts, auto-cycles) must route through
  `recordSession` or it double-counts.
- The 90-day cap means untouched archives eventually shed data — now
  permanent policy (no upload is coming); a manual export in the settings ADR
  is the recorded mitigation if the trade ever hurts.
- The left half gains its final planned occupant; the layout contract is now
  fully allocated except the reserved Todoist area.
