# ADR 17: Screen wake lock

- Status: Implemented (deviations noted)
- Date: 2026-07-24

- Deviation (2026-07-24, implementation): status and visibility are handled in
  **one** effect. Two effects raced on mount — the visibility pass fired a second
  `request()` while the first was still in flight, orphaning a sentinel that then
  never got released. An `inFlight` guard plus a single policy pass fixes it.
- Deviation (2026-07-24, implementation): a hidden page gets neither an acquire
  (pointless) nor a release (the browser already did it, and the policy still
  holds) — the release/acquire decision is `wantsLock()`, evaluated fresh.
- Deferred to HUMAN-TODO: the on-device criteria (real tablet past the OS sleep
  timeout). Everything else is covered by the unit suite and two E2E lines.

## Context

The product is a tablet propped up showing a clock (PLAN.md; ADRs 08/15 made
the clock the visual hero) — and the screen sleeping mid-session kills the
core experience. Scheduled first from the future list (product decision
2026-07-24) because it's the highest value-per-hour item on the board: the
Screen Wake Lock API, a custom hook, and a hold policy. Half a day including
tests.

Ecosystem ground truth: `navigator.wakeLock.request('screen')` returns a
sentinel; **the browser auto-releases it whenever the page is hidden** — the
one real gotcha, handled by re-acquiring on `visibilitychange`. No permission
prompt; requires a secure context (prod HTTPS via ADR 16, localhost exempt).
Support is universal on the target devices (Chromium 84+, Safari/iPadOS
16.4+, Firefox 126+); absence degrades to today's behavior.

**Prerequisites: ADRs 02 and 03 Implemented.** Build order: slots right
after 16-B (go-live) — the moment a real tablet is actually propped up.

**ADR 14's mandatory question, answered on the record**: does this ADR
affect ran-time? **No.** The wake-lock hook is a read-only consumer of timer
status — it never transitions the state machine, never touches `runId` or
`ranMs`. (That question was written for exactly this kind of ADR; first one
to answer it.)

## Decision

- **One hold policy, one rule**: the lock is **held while `running`**, held
  through **`paused` and `finished` for a 5-minute grace**, and **released
  immediately on `idle`** (Stop). Reasoning: paused and finished are both
  "user is probably still here, the glanceable state matters" moments — the
  00:00 you came back to see, the 2-minute pause that shouldn't cost a
  wake-the-tablet round trip — but neither may pin the screen for hours on a
  forgotten timer. One grace constant, two consumers.
- **The grace is a deadline timestamp, not a bare `setTimeout`** — the
  ADR 02 `endAt` discipline again: on `visibilitychange` back to visible,
  the hook re-evaluates *policy* (running, or within a live grace deadline)
  and re-acquires only if the policy still wants the lock. A timeout-based
  grace dies with the hidden tab and re-acquires wrongly or not at all.
- **`useWakeLock(status)` is a custom hook** wrapping request/release/
  re-acquire (Mantine's `useDocumentVisibility` supplies the visibility
  signal; `@mantine/hooks` has no wake-lock hook to reuse).
- **Failure is silent and total**: feature-detect `'wakeLock' in navigator`;
  a rejected `request()` (battery saver, platform policy) is a debug-level
  log and nothing else. **The timer must never depend on the lock** — ADR
  02's timestamp engine already survives the screen sleeping; this ADR only
  makes the screen *try* to stay on.
- **No UI**: no indicator, no toggle. An opt-out ("let the screen sleep")
  is a one-line candidate for the future settings ADR, recorded there-bound
  — not smuggled in here.

## Options considered

- **Hold only while `running` (strict reading)** — releasing at 0:00 means
  the finished state the user glances back for is the exact moment the
  screen starts dying. Rejected; grace covers it.
- **Hold indefinitely through `paused`/`finished`** — a forgotten evening
  timer pins the screen all night; battery and OLED pay. Rejected; 5-minute
  grace.
- **NoSleep.js-style video-loop fallback for old browsers** — a fake-video
  battery drain for browsers the target devices don't run. Rejected;
  feature-detect and degrade.
- **A visible "screen locked awake" indicator** — chrome for a background
  guarantee nobody needs confirmed; the screen being on *is* the indicator.
  Rejected.
- **Settings toggle now** — the settings ADR owns settings content (ADR 10
  socket); one consumer more changes nothing. Rejected → recorded there.

## Scope

### In scope

- `useWakeLock` hook: acquire/release per the hold policy, deadline-based
  grace, visibility re-acquire, feature-detect, silent failure.
- Wiring to the timer status in the app shell.
- Tests per ADR 03's checklist (list in outline); a line in the ADR 09 E2E
  suite asserting the app runs clean where the API is absent/mocked away.

### Out of scope

- User-facing opt-out toggle → the **ADR 19** settings surface, via a
  future amendment there (19's v1 is Todoist-auth-only; pencil holds).
- Any timer-behavior change — explicitly none; read-only consumer.
- Keeping the screen on outside timer states (e.g. while browsing tasks) —
  the timer is the reason the tablet is propped up; anything more is a new
  brief.
- Non-target-browser fallbacks (NoSleep-style). Rejected above.

## Implementation outline

1. **`useWakeLock(status)`** — internal state: sentinel + grace deadline.
   Transitions: → `running`: request; → `paused`/`finished`: set
   `deadline = now + 5 min`, keep sentinel, schedule release at deadline;
   → `idle`: release, clear deadline. **Gotcha:** the sentinel's own
   `release` event fires on hidden-release *and* on our explicit release —
   distinguish them (a flag around explicit release) or the re-acquire
   logic fights itself.
2. **Visibility re-acquire** — on visible: re-request iff `running` or
   `now < deadline`. On hidden: nothing (the browser released it; our
   policy state is untouched). **Gotcha:** re-request must await user-agent
   readiness — fire-and-forget the promise with the same silent-failure
   path; never throw into React.
3. **Tests** (jsdom mock of `navigator.wakeLock` + fake timers +
   `setSystemTime`):
   - start → one `request('screen')`; stop → release; no lock in `idle`.
   - pause → sentinel kept; advance 5 min → released; resume within grace →
     kept, deadline cleared.
   - finish → kept; advance past grace → released; Start again within
     grace → kept running.
   - hidden (mock release event) then visible while running → re-request;
     visible after grace expiry → no re-request.
   - `wakeLock` absent → no throw anywhere; `request` rejecting → no throw,
     state machine unaffected.
   - the hook never calls any timer-transition function (spy — the ADR 14
     answer, verified).
4. **E2E line** — app boots and a timer runs with `navigator.wakeLock`
   deleted via init script (absence tolerance in a real browser).

Honest sizing: **half a day including tests**, as briefed. The only genuinely
subtle part is step 1's explicit-vs-browser release disambiguation.

## Acceptance criteria

- [~] On a real tablet (or DevTools sensor emulation): start a timer, don't touch the screen past the OS sleep timeout — the screen stays on while running. — **[deferred → HUMAN-TODO]** (needs a real tablet; the equivalent policy is unit-tested against a mocked sentinel)
- [~] Stop the timer (idle): the screen sleeps on the OS schedule (lock released — verify via the sentinel in DevTools). — **[deferred → HUMAN-TODO]** (needs a real tablet; the equivalent policy is unit-tested against a mocked sentinel)
- [~] Finish a timer: the 00:00 state stays visible for 5 minutes, then the screen may sleep. — **[deferred → HUMAN-TODO]** (needs a real tablet; the equivalent policy is unit-tested against a mocked sentinel)
- [~] Pause: same 5-minute grace; resuming within it keeps the screen on with no flicker in lock state (single sentinel retained). — **[deferred → HUMAN-TODO]** (needs a real tablet; the equivalent policy is unit-tested against a mocked sentinel)
- [~] Switch away from the app and back while running: the lock is re-acquired (sentinel active again) without user action. — **[deferred → HUMAN-TODO]** (needs a real tablet; the equivalent policy is unit-tested against a mocked sentinel)
- [x] With `navigator.wakeLock` absent (init-script delete) and with `request()` rejecting (mock): zero console errors, timer behavior byte-identical.
- [x] The unit suite covers every case in outline step 3, including the spy proving no timer transition is ever called from the hook.
- [x] No new UI elements exist; no blob/schema changes were made.
- [x] `npm test`, `npm run build`, `npm run build-storybook` green; the ADR 09 absence-tolerance lines are active and green.

## Consequences

- The tablet finally behaves like the appliance PLAN.md describes: prop it
  up, start a timer, the clock stays lit — and the finished 00:00 waits for
  the glance it exists for.
- The lock is a best-effort courtesy with zero coupling: every platform
  refusal degrades to exactly today's behavior, and the timestamp engine
  (ADR 02) means correctness never depended on the screen anyway.
- ADR 14's lifecycle question now has its precedent answer format; future
  run-lifecycle-adjacent ADRs (session-end alerts is next) copy this
  section or explain why not.
- The settings ADR's pencil grows one line (wake-lock opt-out) — recorded
  there, owed by it.
