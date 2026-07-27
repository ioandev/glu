# ADR 41: Three asks, then Settings — the notification permission stops nagging

- Status: Implemented (deviations noted)
- Date: 2026-07-26

- Deviation (2026-07-26, implementation): outline step 4's hook is built on
  **`useSyncExternalStore`**, not a mount read plus `useState`. The lint rule
  `react-hooks/set-state-in-effect` rejects the effect version on sight, and it
  is right to: the global *is* an external store, and the server-snapshot
  argument is what gives the row its one honest `pending` paint instead of a
  hydration guess. The subscription and its teardown are unchanged in substance.
- Deviation (2026-07-26, implementation): the row lives in its own component,
  `settings/NotificationRow.tsx`, rather than inline in `SettingsContent` — the
  ADR 40 precedent, and for the same reason: it owns a subscription, which is
  not something a list of sections should hold.
- Deviation (2026-07-26, implementation): ADR 40 shipped first, so it created
  the Alerts section and this ADR appended to it, exactly as the two ADRs
  agreed. Nothing had to be renegotiated.
- Deviation (2026-07-26, tests): the four row states are covered by **jsdom
  component tests plus four Storybook stories**, not by stories alone — `denied`
  and `unsupported` need a `Notification` global bent into a shape no real
  browser will hand you, and the story decorator that does it has to restore the
  real one or the next story inherits a fake browser.
- Amended (2026-07-26, subscription hardening): outline step 4's cleanup gotcha
  had a back door — unmount *before* `query()` resolves ran teardown with no
  status object yet, and the late resolve then attached the exact listener the
  teardown exists to remove. Fixed with a disposed flag checked at resolve
  time; unit-tested (`useNotificationPermission.test.tsx`, including the
  late-resolve race) and proven live in a real Chromium e2e that flips the
  permission both ways while Settings stays open and watches the row repaint
  without a remount. The e2e is Chromium-only: Playwright cannot flip a WebKit
  permission mid-page (probed — the change event never fires there), which is
  the "never load-bearing" clause earning its keep; WebKit rides the remount
  floor. Test-infrastructure truth recorded: headless Chromium pins
  `Notification.permission` to `denied` whatever the context granted while
  `permissions.query` tracks grants correctly, so the e2e shims the static
  getter to mirror the query state — and the shim must share the app's
  `PermissionStatus` object (listeners on one EventTarget fire in registration
  order; across two status objects the order is unspecified, and the stale
  read that follows was observed, not theorised).

- Amended (2026-07-26b, owner feedback — **the row becomes a switch, and it
  moves to the top of the section**): the owner blocked notifications in the
  browser, opened Settings and could not find them. Two separate mistakes, both
  mine, both reversed here.

  **It was buried.** The row shipped *last* in Alerts on the argument that the
  sound reaches everyone and the notification only the person who walked away.
  Measured at 1024×768 it sat at y≈1080 — off-screen behind a nine-button sound
  grid in a modal you have to scroll. It now leads the section, at y≈753, in
  the viewport when Settings opens. **A row nobody finds is a row nobody has**,
  and that beats any ordering rationale; the sentence about who is affected
  stands as reasoning and is simply outranked.

  **A sentence is not a control.** `denied` rendered "Blocked in your browser"
  with no button, on the correct reasoning that `requestPermission()` would
  resolve instantly and show nothing — and the result was a dead end that
  neither did anything nor said what would. The row is now a **switch** whose
  error explains *where* the browser's setting lives (the address-bar icon, or
  ⋮ → Site settings on Android) and what to set it to. Dismissal gets its own
  line; an absent API disables the switch and says the sound still plays.

  **And a switch has to have an off**, which is what makes this more than a
  relabelling. The web cannot revoke a granted permission, so GLU keeps its own
  half: `notifyOnSessionEnd` (additive blob field, default on), read at fire
  time in `notifyQuietly`. Off means no notification whatever the browser
  granted; the switch reads on only when *both* halves are true, because a
  switch that claims "on" while the browser says no is lying. This
  **discharges the notification half of ADR 18's volume/mute pencil** — the
  sound's volume and mute are untouched and stay penciled, because a run's
  sound is not something you walk away from.

  Two bugs the tests found on the way: the tap now re-reads
  `Notification.permission` **live** rather than trusting the render snapshot
  (on an engine without `permissions.query` — Safari — the blocked message
  sends you to change a setting the row could not then see you had changed),
  and a granted permission clears any standing error however it arrived.

## Context

The sixth bug report. ADR 18 wrote the rule as *"permission is requested
lazily, once, from the first Start gesture … denied means never ask again (the
browser remembers; we don't nag)"*, and `useSessionAlerts.ts` still carries that
sentence in a comment. **The code does not implement it**, and the gap is
entirely in the word "denied":

```ts
export function requestAlertPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;   // ← the only guard
  void Notification.requestPermission();
}
```

`TransportControls.handlePrimary` calls this on **every** Start. Granting or
denying moves `Notification.permission` off `default` permanently, so those two
outcomes really are asked-once. **Dismissing does not.** A dismissed prompt —
the ✕, the Esc, the tap outside, which is what most people do to a permission
dialog mid-task — leaves the state at `default`, so the *next* Start asks
again, and the one after that, forever. "Once" is true for the two users who
answer and false for everyone else, which is the report.

Two adjacent facts make the fix cheap and set its shape:

- **Chrome already stops at three.** After three dismissals on an origin,
  Chrome quietly puts notifications into a blocked state and stops surfacing
  the prompt. Firefox and Safari have their own versions of the same
  patience. So the browser's own answer to nagging is roughly "three, then
  never" — and an app that keeps calling `requestPermission()` past that point
  is firing into a void it cannot see, because the promise resolves without
  anything being shown.
- **There is nowhere else to say yes.** Once the prompt stops appearing, a user
  who *wants* the alert has no door: the ask is welded to the Start gesture,
  and Settings — three sections and four penciled rows deep (ADR 19) — has
  never mentioned notifications. The ADR 18 pencil at that surface says
  "volume/mute/chime", not "the permission".

Owner brief, in full: *"a few asks for permission for notifications, after
which it is available only from settings."* Both halves are load-bearing — cap
the automatic ask, and give the capped user a deliberate door.

**Prerequisites: ADRs 18, 19 and 33 Implemented.** This ADR amends 18's
permission bullet; ADR 33 is upstream only in that it owns the path a granted
permission ends up using.

**ADR 40 is Accepted but not built, and it names the same section.** Its sound
grid and length ladder land in a new Settings section called **Alerts** (after
Screen, before Time comments). This ADR's row belongs in that same section — a
fifth section called "Notifications" beside an "Alerts" section holding the
sound would be two names for one subject. So: **whichever of the two ships
first creates the section; the second one adds its rows to it.** Neither ADR
blocks the other, and the row order below is stated so they cannot disagree
about it.

## Decision

### The automatic ask is capped at three, and the cap is persisted

- **We will count the asks in the blob.** A new field,
  `alertPromptsUsed: number` (default `0`), rides the ADR 19 additive-blob
  pattern into `glu:v2` — no version bump, absent reads as `0`.
- **`requestAlertPermission()` asks only while
  `Notification.permission === 'default'` *and* `alertPromptsUsed < 3`**, and
  increments the counter in the same synchronous span as the
  `requestPermission()` call. Not on resolve: the promise for a dismissed
  prompt settles at an unpredictable time and, once Chrome has gone quiet,
  settles without anything ever having been shown. The thing we are metering
  is *our own attempts*, which is the only quantity we can observe honestly.
- **Three, because that is where the browser stops too.** Aligning the cap
  with Chrome's own dismissal budget means GLU goes quiet at approximately the
  moment the platform does, instead of continuing to call an API that no longer
  renders anything. It is also, in plain product terms, enough: a person who
  has waved the dialog away three times has answered.
- **Granting or denying still short-circuits on `permission`**, exactly as
  today — the counter is a *dismissal* budget in practice, and one field
  expresses both rules because a non-`default` permission never reaches it.
- **The counter is one-way and never resets.** Not on "New day" (ADR 05), not
  on logout (ADR 19), not on a fresh run. The only reset is a cleared profile,
  which is a new device as far as this app is concerned.

### After the cap, Settings is the door — and it is the door before the cap too

- **We will add one row, "Notify me when a session ends", to the Settings
  "Alerts" section** — the section ADR 40 also lands in, created by whichever
  of the two ships first. This is the brief's second half, and the row is
  deliberately *not* gated on the cap being reached — a row that appears only
  after three dismissals is a row nobody discovers. It is present from the
  first visit; it simply becomes the *only* remaining door once the budget is
  spent.
- **It sits last in the section, after ADR 40's sound grid and length
  ladder.** The ADR 28 precedent ("whether it happens at all comes before what
  it says") does not apply here and the temptation to apply it is the mistake:
  the permission gates *nothing* about the sound. The chime plays for every
  user on every finish; the notification is the extra that only reaches someone
  who has walked away from the tab. Section order follows who is affected —
  everyone, then the away case — not alphabetical proximity to the word alert.
- **The row renders the browser's four truths and nothing else**, because the
  permission is the browser's state, not ours:
  - **askable** (`default`) → a ≥44 px **"Turn on notifications"** button. The
    tap calls `Notification.requestPermission()` inside the handler's
    synchronous span (a real user gesture, which is what every browser wants
    for this call).
  - **on** (`granted`) → "On" plus one line: session-end notifications appear
    when the page is not visible, and turning them off is done in the
    browser's site settings.
  - **blocked** (`denied`) → "Blocked in your browser" plus the same pointer.
    **No button is rendered**: `requestPermission()` on a denied origin
    resolves instantly with `denied` and shows nothing, so a button there is a
    control that visibly does nothing — the worst kind.
  - **unsupported** (no `Notification` global — iPadOS Safari in a tab) → one
    line saying this browser has no notifications and the chime still sounds.
    Nothing to tap.
- **A tap on that button does not consume the budget.** The cap governs the
  *unprompted* ask; a tap on a control labelled "Turn on notifications" is a
  request, not a nag, and charging it would let the user exhaust their own
  door. Recorded here because it is the one rule a future reader will assume
  the other way round.
- **No local mute switch.** "Notifications are granted but I want them off
  today" is what is left of the ADR 18 pencil once ADR 40 takes the chime
  third — volume and mute — and it needs its own brief with the audio half
  beside it. This ADR moves *permission*, not *preference*. The `granted` row
  points at the browser rather than growing a second, weaker off switch that
  leaves the OS permission dangling.

### Reading a permission that React cannot see

- **`Notification.permission` is a global with no React binding**, so the row
  reads it on mount, again after its own request resolves, and — where
  available — subscribes to `navigator.permissions.query({name:
  'notifications'})`'s `change` event. The query is best-effort: it is absent
  or throws for this name on some browsers, and the mount read is the floor
  the section is correct against. Settings is a modal that mounts on open,
  which means the common case (change it in browser settings, reopen the
  modal) is covered by the floor alone.
- **The read is client-only.** `Notification` does not exist during SSR; the
  section resolves its state in an effect and renders the unsupported/pending
  shell for the first paint, like every other browser-capability read in this
  app.

## Options considered

- **Ask once, ever (what ADR 18's prose claims)** — one dismissal, possibly
  accidental, permanently costs the feature to a user who never made a
  decision. Rejected: the brief says "a few", and it is right.
- **Ask on every Start until the browser stops us (today's code)** — the bug.
  Rejected.
- **Let Chrome's own three-dismissal auto-block be the cap** — it is
  browser-specific, unobservable from script (`permission` stays `default`),
  and absent on other engines, so GLU would nag Firefox users forever and be
  unable to tell. Rejected: we cannot build a product rule on a state we cannot
  read.
- **Count dismissals rather than asks** — indistinguishable in practice (grant
  and deny both leave `permission`, which the guard already checks) and it
  would have to be inferred from a promise that resolves late and lies once the
  browser goes quiet. Rejected as the same rule with worse mechanics.
- **A pre-prompt ("GLU would like to notify you — OK?") before the real one** —
  the standard trick for protecting the browser budget, and a whole modal, its
  copy, its own dismissal state and a second thing to dismiss. Rejected for
  this app: the Settings row is the honest version of the same idea, and it
  costs one section.
- **Show the Alerts row only after the cap is spent** — a door that materialises
  once, silently, in a modal the user may not open for a week. Rejected;
  always present.
- **A local "notifications off" switch in the granted state** — the ADR 18
  pencil, and a second source of truth beside an OS permission. Out of scope,
  deliberately.
- **Move the ask off Start onto the welcome gate (ADR 31)** — asks for a
  capability before the user has seen a timer, which is the pattern every
  permission-UX guide names first. Rejected.

## Scope

### In scope

- `alertPromptsUsed` in the persisted blob (additive, no version bump) with its
  one-way action, and the three-ask guard inside `requestAlertPermission()`.
- One row in the Settings "Alerts" section — four states, ≥44 px, chrome
  tokens — plus the section itself if ADR 40 has not created it yet.
- ADR 18 amendment (its permission bullet and the matching criterion), ADR 19
  amendment (the section and this row's acceptance criteria), and a one-line
  note in ADR 40 recording the third row and its position.
- ADR 29 docs update — `DocsSections.tsx` and `DOCS_UPDATED`, since when GLU
  asks and where the user turns it on both change.
- Tests per ADR 03; stories for the section's four states × both schemes;
  an ADR 09 E2E line.

### Out of scope

- Which sound plays and for how long → **ADR 40**, same section, its own rows.
- Volume and mute → what remains of the **ADR 18 pencil** at ADR 19, still
  penciled, unchanged except that the section it will live in now exists.
- Revoking a granted permission from inside the app — not something the web
  platform offers; the row points at browser settings.
- Push / closed-app alerting → still ADR 18's named escalation, still requires
  its own brief.
- Any change to *when alerts fire*, the SW path (ADR 33), or the chime. This
  ADR touches the ask and the surface, never the alert.
- Asking from the keyboard Start path (`p`): the ask has always ridden the
  button alone, alongside `primeAudio()`. Left as is — moving it is an ADR 06
  question about which gestures prime, not a permission question.

## Implementation outline

1. **Store** — `alertPromptsUsed: number` in `GluPersistedState`
   (default `0`, listed in `initialPersistedState()` and `partialize`), plus
   `noteAlertPrompt()` incrementing it. Additive pattern: absent in an older
   blob → `0` via `initialPersistedState()` in `migrate`; `merge` needs no
   special case (unlike ADR 31's flag, absent-means-zero is the *correct*
   reading — a blob with no counter has spent no asks). **Gotcha:** a
   hand-edited or corrupt non-number must not disable the ask forever *or*
   re-enable it infinitely — resolve on read with
   `Number.isInteger(n) && n >= 0 ? n : 0`, the ADR 28 precedent.
2. **`requestAlertPermission()`** — guard on `permission === 'default'` **and**
   the resolved counter `< ALERT_PROMPT_LIMIT` (exported const, `3`); call
   `useGluStore.getState().noteAlertPrompt()` immediately before
   `Notification.requestPermission()`, inside the same try. The function stays
   fire-and-forget and un-awaited — ADR 18's rule that the timer starts now is
   untouched. **Gotcha:** the increment must not happen when the guard fails,
   or three Starts on a granted profile silently burn the budget that a later
   permission reset would need.
3. **`requestAlertPermissionFromSettings()`** — the same call *without* the
   counter and without the `default` guard's silence: it returns the resulting
   `NotificationPermission` so the row can re-render on the answer. Two
   functions, one line apart, because the two policies genuinely differ; a
   boolean parameter would hide the rule this ADR exists to state.
4. **`useNotificationPermission()`** — a small hook returning
   `'unsupported' | 'default' | 'granted' | 'denied'`: mount read, optional
   `navigator.permissions.query` subscription in a `try`, cleanup on unmount.
   **Gotcha:** `query({name: 'notifications'})` rejects rather than returning
   `undefined` on some engines, and its result object needs
   `removeEventListener` on teardown or the modal leaks a listener per open.
5. **Settings row** — inside `<section aria-label="Alert settings">` (title
   "Alerts", after Screen, before Time comments), created here if ADR 40 has
   not shipped it, otherwise appended below its two rows. One `classes.field`
   row (the ADR 28 shape: label, one-line description, control) whose control
   is the button or the status line. The button is the existing
   `classes.action` treatment, ≥44 px.
   **Gotcha (ADR 37's law):** `settings.module.css` is unlayered and outranks
   Mantine, so any state the button has — hover, focus-visible, disabled — must
   be restated, not assumed.
6. **Docs** — `DocsSections.tsx`: the alerts paragraph gains "GLU asks up to
   three times, then stops; you can turn notifications on any time from
   Settings → Alerts." No ADR numbers, and bump `DOCS_UPDATED`.
7. **Tests** — unit: first Start asks and increments; a fourth Start does not
   ask; `granted`/`denied` never ask and never increment; a corrupt counter
   reads as zero; the Settings call asks with the budget spent and does not
   increment. Component: the four row states render, the button appears only
   in `default`, the accessible name is the visible label alone (the ADR 19
   rule), granting re-renders to "On". Stories: four states × both schemes ×
   chrome tokens; a11y pass.
8. **E2E** (ADR 09) — a context with notifications *not* granted and a stubbed
   `Notification.requestPermission` recorder planted by init script: three
   Start→Stop cycles record three calls, the fourth records none; open
   Settings → Alerts → tap the button → a fourth call is recorded. The recorder
   is what makes the cap visible; a real prompt is not automatable.

Honest sizing: **half a day.** The guard is ten lines and the section is an
afternoon; the only genuinely fiddly part is step 4, and its floor (read on
mount) is correct on its own if `permissions.query` misbehaves.

## Acceptance criteria

- [x] On a fresh profile, three separate Start gestures each trigger exactly one permission request; the fourth Start triggers none. Verified with a request recorder, not by reading code. — the e2e runs **five** Start→Stop cycles against the recorder and sees three asks.
- [x] `alertPromptsUsed` reaches `3` in the `glu:v2` blob, survives a reload, and no blob version bump was required; a blob written before this ADR loads with the counter at `0`, and a hand-edited garbage value also reads as `0`. — blob read in the e2e; the pre-field load and the `-4` case in `gluStore.test.ts`.
- [x] With permission already `granted` or `denied`, no Start ever requests, and the counter never moves.
- [x] The timer still starts instantly on the Start that carries an ask — the request is not awaited (ADR 18's criterion re-verified, not assumed). — the e2e's stub returns a promise that **never resolves**, and the run is on the clock anyway.
- [x] Settings shows the "Alerts" section (after Screen, before Time comments) with a "Notify me when a session ends" row, present from the first visit — before any ask has been spent, not only after the cap. — **amended 2026-07-26b**: it is the section's **first** row, not its last, and it is a switch.
- [x] Its row renders the right one of four states: off and askable; on once granted; off with instructions once denied; disabled with an explanation where the API is absent. — **amended 2026-07-26b** (was a button plus three sentences).
- [x] Turning it on requests permission **even with the automatic budget spent**, and does not increment `alertPromptsUsed`. — asserted in both the component test and the e2e (fourth ask recorded, blob still at 3).
- [x] Granting from that tap moves the switch to on without closing or reopening the modal. — and the live-flip e2e proves the same for a grant made *outside* the app, in real Chromium.

### Added by the 2026-07-26b amendment

- [x] The switch turns **off** as well as on: with the permission granted, switching off writes `notifyOnSessionEnd: false` and a hidden finish then produces the sound and **no** notification.
- [x] `notifyOnSessionEnd` rides the additive-blob pattern (default on, no version bump) and is read at fire time, so a change mid-run applies to that run's finish.
- [x] The switch reads on only when the permission is granted *and* GLU's own half is on — never on the strength of one of them.
- [x] Blocked shows instructions naming where the browser's setting lives, marked `role="alert"`; dismissed says the prompt went unanswered; unsupported disables the switch and is **not** an alert (nothing the user did, nothing they can do).
- [x] A tap re-reads the live permission rather than the rendered snapshot, so unblocking in the browser and returning to an open modal works on engines with no permission change event.
- [x] The row is the first thing in the Alerts section and is in the viewport when Settings opens at 1024×768 (measured: y≈753, was y≈1080 behind the sound grid).
- [x] The row is ≥44 px, styled through chrome tokens in both schemes and all three chrome directions, passes the a11y contrast gate, and its accessible name is the visible label alone. — schemes and the gate are the two-scheme story run; **direction coverage is by construction** (the row adds no colour of its own: `.fieldStatus` and the reused `.action`/`.field` classes read `--glu-*` only).
- [x] `DocsSections.tsx` states the three-ask cap and names Settings → Alerts as the way in, with `DOCS_UPDATED` bumped in the same commit. — the date was already this session's.
- [x] ADR 18's "requested lazily, once … we don't nag" bullet and its permission acceptance criterion are amended to point here; ADR 19 records the row; ADR 40 records that the Alerts section carries a third row it does not own.
- [x] Nothing about *when* alerts fire changed: the ADR 18 and ADR 33 suites pass untouched, and `web/public/sw.js` is byte-identical.
- [x] `npm test`, `npm run build`, `npm run build-storybook` green; the new E2E line is active and green.
- [~] The real thing: on a fresh browser profile, three Starts raise three genuine OS prompts and the fourth raises none; the Settings button raises one after that. — **[deferred → HUMAN-TODO]**, the same boundary ADR 18 hit: a real permission dialog is not automatable, so every test here stands on a recorder.

## Consequences

- The comment in `useSessionAlerts.ts` becomes true. ADR 18 stated the right
  policy and shipped a guard that only implemented two thirds of it; the gap
  survived a year of reading because the *code* looks like the rule until you
  remember that dismissal is not denial. Recorded loudly, because the next
  browser-permission surface GLU adds will have exactly the same trap.
- The feature stops being reachable only through a dialog the browser may have
  stopped rendering. That is the real defect underneath the annoyance: a
  capability whose sole entrance can be silently removed by the platform.
- ADR 19's section list grows to four, and this ADR and ADR 40 now share one
  of them. That is the first time two live ADRs have co-owned a Settings
  section, and the rule that makes it safe is written down in both: **first one
  there creates it, the other appends** — the section skeleton ADR 19 built for
  exactly this.
- The blob gains its first *quota* field. Everything persisted so far has been
  a preference or a record; this is a budget, and budgets need the corrupt-value
  rule spelled out or they fail closed forever. The ADR 28 resolver pattern is
  the answer, reused.
- GLU now depends on a number — three — that no browser guarantees. If Chrome
  changes its dismissal budget, ours is still defensible on its own product
  terms, which is why the cap is stated as a product decision that *happens to*
  align rather than as an implementation detail of Chrome.
