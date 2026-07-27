# ADR 18: Session-end alerts

- Status: Implemented (deviations noted)
- Date: 2026-07-24
- Amended: 2026-07-26 — **the Android escalation is taken** (ADR 33): a
  notification-only service worker now exists, the alert path is SW-first
  (`registration.showNotification()`, then the page constructor, then
  chime-only), and ADR 04's constraint was amended as this ADR priced. The
  platform truth table below stands as written for *page context*; the
  "no service worker registered" acceptance criterion is superseded.

- Amended: 2026-07-26b — **the chime is now one of nine sounds, and it has a
  length** (ADR 40, owner brief: "this app lacks a variety of sounds… as well as
  an option for their duration"). Three things here move and nothing else does.
  The hard-coded two-tone pattern becomes the `chime` entry of a registry and
  stays the **default**, so the shipped behaviour is byte-identical for anyone
  who never opens Settings. "Once — no looping alarm" becomes "**Once by
  default**, or a bounded 3 / 5 / 10 / 20 s"; the looping-alarm rejection below
  stands as written, because every rung ends by itself, none of them needs a
  dismissal UI, and any transport press cuts one short. And the sentence in
  *Audio* that sends chime-choice to the settings ADR is **discharged** — that
  is ADR 40's Alerts section. **Volume and mute did not move**: still the device
  rocker, still penciled on ADR 19. When alerts fire, the notification, the
  SW-first order and the three degrade layers are untouched.

- Deviation (2026-07-24, implementation): "a live tick crossing zero" is
  implemented as the **`running → finished` transition**, tracked by the hook's
  own previous-status ref. The restored-expired path mounts straight into
  `finished` without ever passing through `running`, so it is structurally
  unable to alert — and there is a test for it anyway.
- Deviation (2026-07-24, implementation): the backgrounded-tab criteria are
  verified with a Notification recorder and `visibilityState` emulation rather
  than a real OS notification; the click-to-focus and close-on-return behaviours
  are deferred to HUMAN-TODO.

## Context

A pomodoro that can't tell you time is up while you're looking away is half a
pomodoro. Deferred since ADR 02 because every prior sizing priced the *hard*
version — notifications from a closed PWA, meaning Push API, a service
worker, and server plumbing. Product decision (2026-07-24): v1 drops all of
that. **Gesture-unlocked audio chime + the plain Notification API for the
backgrounded-tab case** covers the realistic 90% — a dedicated tablet with
the app foregrounded (now kept awake by ADR 17) or a tab away — with zero
push infrastructure. Closed-app alerting stays explicitly out, so this ADR
never drags the backend beyond its permanent proxy scope (ADR 11).

**Prerequisites: ADRs 02 and 03 Implemented.** Independent of ADR 14 — the
alert consumes the same read-only status signal ADR 17 consumes (a live tick
reaching `finished`), not ADR 14's run-end event object; when 14 lands, both
consumers share whatever the engine exposes. Build order: right behind 17.

**ADR 14's lifecycle question, answered (the ADR 17 precedent format)**:
does this affect ran-time? **No** — read-only consumer; it also never
transitions state (no auto-restart, no auto-anything), spy-tested.

## Decision

### When alerts fire — and when they must not

- **The alert fires only when a live tick crosses zero** — the timer
  completing while the page is open (foreground or backgrounded tab).
  It does **not** fire on: manual Stop / `s` / `Ctrl+C` (the user is
  touching the app), `n` restart (same), or **the restored-expired path**
  (ADR 02/14's silence stands — a chime hours late, at the exact moment the
  user is already looking at the screen, is noise wearing a feature's
  clothes).
- **Foreground finish → chime only.** The finished state (ADR 02) plus the
  wake-locked screen (ADR 17) *is* the visual alert; an in-app toast adds
  nothing.
- **Backgrounded-tab finish → chime + one Notification** ("GLU — time's up",
  body = the finished duration), with a `tag` so repeated finishes replace
  rather than stack; clicking it focuses the app; it closes itself on
  return to visibility. Never notify a visible page.

### Audio

- **The chime is WebAudio-synthesized** (short two-tone envelope, ~1.5 s,
  once — no looping alarm): no asset to source or license, no fetch for a
  beep, trivial volume shaping. One `AudioContext` for the app's lifetime.
- **Unlock rides the Start gesture**: the context is created/resumed inside
  the Start tap handler — the gesture browsers require, at the only moment
  that guarantees one. **Gotcha:** iOS requires the `resume()` inside the
  handler's synchronous span; and create *one* context ever (iOS caps
  concurrent contexts) — prime once, reuse forever.
- **Volume control is the OS volume rocker in v1** — this is a tablet
  appliance; in-app volume/mute/chime-choice goes to the settings ADR
  (pencil grows), not smuggled here. The Silence *environment toggle* is
  data semantics (what you were doing), never an audio mute — overloading
  it would corrupt tracked meaning; recorded so nobody "cleverly" wires it.

### Notifications — permission and platform truth

- **Permission is requested lazily, once, from the first Start gesture**
  while `Notification.permission === 'default'`; denied means never ask
  again (the browser remembers; we don't nag). No permission, no
  notification — chime still works.
  **Superseded 2026-07-26c by ADR 41.** "Once" was only ever true of the user
  who *answers*: a dismissed prompt leaves `permission` at `default`, so the
  guard this bullet describes re-asked on every Start, forever. The rule is now
  **at most three automatic asks**, counted in the blob, after which Settings →
  Alerts is the only door. Everything else in this bullet stands.
- **Platform truth table, recorded**: page-context `new Notification()`
  works on desktop-class browsers; **it throws `TypeError` on Android
  Chrome** (non-persistent notifications require a service worker there)
  and is unavailable in iPadOS Safari page context. **v1 wraps construction
  in try/catch and degrades to chime-only** on those platforms — which are
  exactly the wake-locked-foreground devices where the chime already lands.
  The escalation, if background-tab notifications on the tablet ever
  matter: a minimal notification-only service worker (no fetch handler —
  not offline machinery), which requires an **ADR 04 amendment** because
  its "no service worker anywhere" constraint is product law. Named, not
  taken. *Taken 2026-07-26 — ADR 33, exactly as priced.*
- **Punctuality bound, recorded**: Chrome's intensive throttling can delay
  a long-backgrounded tab's timers up to ~60 s, so a background finish may
  chime/notify up to a minute late. Accepted for v1; the escalation is a
  dedicated worker for the tick (workers dodge page-timer throttling) —
  ADR 02 rejected one for *timekeeping* correctness (timestamps already
  solve that); punctual *alerting* is the one job that could justify it
  later.

### The @mantine/notifications re-evaluation (owed by ADR 14)

- **Evaluated, declined again.** The trigger has now fired twice (undo bar,
  alerts) and both times the answer was "no in-app toast exists in this
  feature" — the undo bar is a custom component, and alerts are
  audio + OS-notification, not page chrome. Standing rule: a third genuinely
  toast-shaped need adopts the package; until then it stays out. (ADR 14's
  option line annotated.)

## Options considered

- **Push API + service worker + backend (the hard version)** — the full
  closed-app story; three systems for the 10% case on a device ADR 17 keeps
  awake anyway. Rejected; recorded escalation paths cover the gap.
- **Bundled audio file instead of WebAudio** — an asset to source, license,
  and ship for a two-tone beep. Rejected.
- **Looping alarm until dismissed** — an alarm-clock feature with a
  dismissal UI this brief doesn't contain. Rejected; future brief if wanted.
- **Notify even when visible** — double-alerting the person already looking
  at 00:00. Rejected.
- **Fire on restored-expired** — re-litigated and re-rejected (ADR 02's
  silence was right: the reopen *is* the acknowledgment).
- **In-app toast via @mantine/notifications** — see the re-evaluation.
  Declined.
- **Silence toggle as mute** — corrupts environment-tracking semantics.
  Rejected with prejudice.

## Scope

### In scope

- WebAudio chime module (single context, gesture-primed, synthesized tone),
  wired to live-finish only.
- Notification path (permission-on-first-Start, hidden-only, tag/replace,
  focus-on-click, close-on-visible, try/catch platform degrade).
- Tests per ADR 03's checklist (list in outline); ADR 09 E2E block
  (permission-granted context + stubbed Notification recorder).

### Out of scope

- Closed-app push, any service worker → escalation named above; requires an
  ADR 04 amendment first.
- Volume/mute/chime-selection UI → the **ADR 19** settings surface, via a
  future amendment there (19's v1 is Todoist-auth-only; pencil holds).
- Looping/repeating alarms, snooze → future brief if ever.
- Break-cycle automation (auto-starting the next timer) — still the ADR 02
  out-of-scope; an alert is not a scheduler.

## Implementation outline

1. **Chime module** — lazy singleton `AudioContext`; `primeAudio()` called
   in the Start handler (create + `resume()` synchronously in-gesture);
   `chime()` builds the two-tone envelope. **Gotcha:** context state can
   regress to `suspended` after long idle on iOS — check-and-resume inside
   `chime()` too, but the *fallible* resume there must not drop the
   notification path if audio fails.
2. **Alert coordinator** — subscribes to the same status signal as ADR 17's
   hook; fires on the live `running → finished` transition only (the
   restore branch enters `finished` without passing through the tick loop —
   structurally can't fire, which is the point; add the test anyway).
   Visible → chime; hidden → chime + notification (guarded construction).
3. **Permission flow** — in the Start handler, after `primeAudio()`:
   request iff `'default'`. **Gotcha:** don't `await` the permission
   promise before starting the timer — the timer starts instantly; the
   prompt resolves whenever the user gets to it.
4. **Tests** (mocked `AudioContext` + `Notification` + fake timers):
   - live finish → one chime; hidden live finish → chime + one notification
     with the fixed tag; visible finish → no notification.
   - Stop / `n` / restored-expired (seeded blob) → zero chimes, zero
     notifications.
   - first Start primes audio + requests permission once; second Start
     doesn't re-request; `'denied'` → never requested, chime unaffected.
   - `Notification` constructor throwing `TypeError` → caught, chime still
     fires, no console error.
   - spy: the coordinator never calls a timer transition (lifecycle answer,
     verified).
5. **E2E line** — Playwright context with notifications granted +
   init-script Notification recorder: `page.clock` a run to zero with the
   page hidden-emulated → recorder saw one; visible run → recorder saw none.

Honest sizing: **~1 day** — half of it the audio-unlock and platform-degrade
paths, not the happy case. With ADR 17's half day, the 1.5-day estimate for
the pair stands.

## Acceptance criteria

- [x] Foreground: a timer reaching 0:00 plays the chime exactly once; no notification appears.
- [~] Backgrounded tab (real browser): the chime sounds and one "GLU — time's up" notification appears; clicking it focuses the app; returning to the tab closes it; a second finish replaces rather than stacks (same tag). — **[deferred → HUMAN-TODO]** (recorder + visibility emulation prove one tagged notification per finish; click-to-focus and close-on-return need a real OS notification)
- [x] Manual Stop, `s`, `Ctrl+C`, and `n` produce no chime and no notification, at any remaining time.
- [x] Close the site mid-run, reopen after expiry: the finished state restores **silently** (ADR 02's behavior byte-identical).
- [~] The first Start after a fresh profile primes audio and triggers the browser's notification prompt exactly once; the timer starts without waiting for the prompt; declining leaves the chime working forever after with no re-prompt. — **[deferred → HUMAN-TODO]** (the ask-once/never-again logic is unit-tested; the real prompt needs a fresh browser profile). **Amended 2026-07-26c (ADR 41)**: "exactly once" reads as "at most three times, then never"; the un-awaited-prompt half is now proven in e2e by a stub that never resolves.
- [x] With `Notification` construction forced to throw (Android emulation or stub): finish still chimes, zero console errors.
- [x] With sound impossible too (context resume rejected): the finished state still renders — alerts are courtesy, never load-bearing.
- [—] No new UI elements, no blob/schema changes, no service worker registered (ADR 04's criterion still passes), no new dependency (`@mantine/notifications` remains absent from package.json). — **the no-SW clause is superseded by ADR 33** (notification-only worker, fetch-handler-free by tripwire); every other clause stands.
- [x] Unit suite covers outline step 4 including the no-transition spy; `npm test`, `npm run build`, `npm run build-storybook` green; the ADR 09 E2E lines are active and green.

## Consequences

- The pomodoro is finally whole: it can call you back. Paired with ADR 17,
  the tablet is an appliance — screen on through the session, a chime at
  the end, a notification if you wandered a tab away.
- Alerting is best-effort by construction, three degrade layers deep
  (notification → chime → visible finished state), and correctness never
  moved: the timestamp engine still owns truth.
- Two escalation paths are now *named with their price tags* (notification
  SW = ADR 04 amendment; punctual background alerts = dedicated worker) —
  future annoyance converts to a brief, not a debate.
- The @mantine/notifications question is settled with a standing rule
  (third toast-shaped need adopts it), ending the per-ADR re-litigation.
- The settings ADR's pencil grows again (volume/mute/chime) — it is now
  carrying four line items and should probably be the next thing briefed
  after the Todoist actions ADR.
