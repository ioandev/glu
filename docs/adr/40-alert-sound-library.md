# ADR 40: A sound library for the end of a run — nine sounds and how long they play

- Status: Implemented (deviations noted)
- Date: 2026-07-26

- Deviation (2026-07-26, implementation): the two rows live in their own
  component, `settings/AlertSoundRows.tsx`, rather than inline in
  `SettingsContent`. The section owns local state (what is playing), a timer ref
  and an unmount effect; inlining that would have put a fifth concern into a
  component that is otherwise a list of sections.
- Deviation (2026-07-26, implementation): `lib/chime.ts` was **deleted**, not
  extended — the registry and the engine ship as one module, `lib/alertSounds.ts`,
  and `chime()` no longer exists. The one hard-coded pattern it held is the
  `chime` entry, tone for tone.
- Deviation (2026-07-26, implementation): the "any transport press" rule is
  wired at **two** UI edges, not one — `TransportControls` (both buttons) and
  `useTimerHotkeys` (`p`, `s`, `n`, `Ctrl+C`). The outline assumed a single
  handler; Stop and the keyboard never went through the primary one.
- Deviation (2026-07-26, e2e): the length ladder is clicked by its **label**,
  not its `radio` — Mantine's rungs are transparent inputs, so the role query
  finds an element Playwright will not click (ADR 28 hit this first, recorded
  again because it cost a run). And a spec that closes Settings and then touches
  the timer has to press **Escape** afterwards: the drawer's overlay survives the
  modal and eats every click behind it.

## Context

Owner brief (2026-07-26): **"This app lacks a variety of sounds. Add to settings
5–10 sounds to make at the end, as well as an option for their duration."**

What ships today is ADR 18's single chime: two sine tones a fifth apart, ~1.2 s,
once, hard-coded in `lib/chime.ts` and fired by `useSessionAlerts` on the live
`running → finished` transition. It has no name, no alternative and no dial. Two
prior decisions constrain the answer more than they look like they should:

- **No audio assets.** ADR 18 rejected a bundled file for a two-tone beep
  (sourcing, licensing, a fetch for a beep), and ADR 26's Privacy copy now states
  as fact that the end-of-session sound is *generated in the browser* and that
  nothing is downloaded. Nine mp3s would turn a settled sentence in a legal
  document into a lie, and would put audio bytes into two image builds (ADR 22).
  **Every sound in this ADR is synthesized**, same as the one it joins.
- **This is not an alarm clock.** ADR 18 rejected "looping alarm until dismissed"
  because a loop needs a dismissal UI this product does not have. A *bounded*
  duration is a different thing: it stops on its own, so it needs no dismissal,
  and the ceiling is what keeps it from becoming the rejected feature. The
  rejection stands as written; this ADR does not reopen it.

The settings pencil has carried "alert volume/mute/chime · ADR 18" since ADR 19.
This ADR discharges the **chime-selection** third of it and **leaves volume and
mute penciled** — the brief asked for sounds and a length, and a volume slider is
a different control with a different failure mode (ADR 18's answer is still the
device's volume rocker).

**Prerequisites: ADRs 18, 19 Implemented.** This ADR amends both — 18 owns the
alert policy, 19 owns the Settings section list.

## Decision

### The library — nine synthesized sounds, one shape

- **Nine sounds** (top of the brief's 5–10 range, because they cost a data
  literal each): **Chime** (today's, the default), **Bell**, **Wood**, **Rise**,
  **Settle**, **Pulse**, **Digital**, **Glass**, **Deep**. The set spans the
  three reasons someone changes this setting: *nicer* (Bell, Glass), *sharper /
  harder to miss* (Pulse, Digital, Wood), *quieter in a shared room* (Deep,
  Settle).
- **One data shape for all nine.** A sound is `{ id, label, tones[], period }`,
  where a tone is `{ frequency, startsAt, duration, type?, gain? }` — the exact
  vocabulary ADR 18's chime already used, promoted from two hard-coded entries to
  a registry. Nothing about a sound is code; adding a tenth is a literal, and the
  engine never learns its name.
- **`period` is the sound's own length, and it is what "once" means.** It is also
  the repeat interval, which is why it is stated rather than derived from the last
  tone's end: the gap between repetitions is part of a sound's character (Wood
  wants space, Bell wants to ring out) and deriving it would flatten all nine into
  the same rhythm.
- **The default is `chime`, byte-identical to ADR 18's tones.** Defaults *are* the
  previous policy (the ADR 17/28 pattern): nobody who never opens Settings hears a
  change.
- **Peak gain stays ≤ 0.25 per tone and sounds stack at most four partials**, so
  no combination clips. Volume remains the device's (ADR 18); this ADR must not
  smuggle one in through amplitudes.

### The duration — a ladder in seconds, whose first rung is "Once"

- **A five-rung ladder: Once · 3 s · 5 s · 10 s · 20 s**, default **Once**. Same
  control and same reasoning as ADR 28's ladder — a coarse judgment with five
  real answers, five ≥44 px rungs visible at once, no keyboard, no validation
  surface, no continuum implied.
- **"Once" is the shipped behaviour, not a zeroth value.** It is stored as `0` and
  named `ALERT_DURATION_ONCE`, and it means *play the pattern one time*. A blob
  reading `0 seconds` would otherwise be a small lie about a sound that plays for
  1.2 s.
- **Repetition rule: a repetition that starts before the deadline plays in
  full.** Starts land at `0, period, 2·period, …` for as long as they are strictly
  under the chosen seconds, so `repeats = ceil(seconds / period)` and the audible
  tail may run past the number on the rung by up to one period. The alternative —
  cutting the last repetition off mid-tone — makes every sound end like a dropped
  call. The rung is how long GLU *keeps alerting*, not a stopwatch on the speaker.
- **20 s is the ceiling, deliberately.** It is long enough to catch someone who
  left the room and short enough that it can never become the alarm ADR 18
  rejected: it ends by itself, with no dismissal UI, on every rung.
- **Any transport press stops a sound in flight.** Start, Pause, Resume, Stop and
  their keys (`p`, `s`, `n`, `Ctrl+C`) all silence it: pressing one *is* the
  acknowledgment, and a 20-second sound that keeps playing after you have walked
  back and touched the app is an app arguing with its user. The call sits at the
  two UI edges — the transport handlers and the hotkey hook — and deliberately
  **not** in the store: a state container that makes noise is a state container
  every test has to mock an `AudioContext` for.

### Settings — the fourth section, and the first one you can hear

- **A new "Alerts" section**, after Screen, before Time comments. Two rows: the
  sound grid, then the length ladder — you pick the sound before you decide how
  long to hear it. **ADR 41 adds a third row to this same section** (the
  session-end notification switch); it shipped below these two and moved
  **above** them the same day, because it was unfindable down there — the
  sound rows are unaffected, and either ADR could have shipped first:
  whichever does creates the section, the other adds to it.
- **The sound row is a grid of nine tap-to-hear buttons**, not a select or a
  segmented control. Nine rungs do not fit a half-tablet segmented control, and a
  dropdown would hide the choice behind a tap — but the real reason is that
  **choosing a sound you cannot hear is choosing blind**. The grid is a
  `radiogroup` of ≥44 px buttons: two columns below `sm`, three above.
- **Every tap in the section previews exactly what the alert will play** — the
  selected sound, for the selected length — because a preview that is not the
  artifact is ADR 27's lesson unlearned. Changing the ladder re-previews for the
  same reason: the rung is a claim about length, and the only way to check it is
  to hear it.
- **Any tap cancels the preview in flight, tapping the playing sound stops it, and
  closing Settings stops it.** That trio is what makes a 20-second preview safe to
  offer at all; the playing button carries a visible playing state so the stop tap
  is discoverable.
- **Two additive blob fields, no version bump** (ADR 19's pattern):
  `alertSoundId: string` (default `chime`) and `alertDurationSeconds: number`
  (default `0`). Both resolve **on read as well as on write** (ADR 28's
  deviation, adopted as the rule): an id from a release that shipped a sound this
  one dropped, or a hand-edited `999`, falls back to the default rather than
  rendering a control with nothing selected or silencing the alert entirely.

### What this deliberately does not touch

- **When the alert fires.** ADR 18's rules are untouched: only a live
  `running → finished` transition, never Stop / `s` / `Ctrl+C` / `n`, never the
  restored-expired path, never a visible page for the *notification*.
- **The notification.** Title, body, tag, the SW-first order (ADR 33) and the
  degrade chain are unchanged. The sound is the layer *below* the notification,
  and it stays best-effort: no WebAudio, no sound, finished state still renders.
- **Volume and mute.** Still the device's rocker, still penciled on ADR 19.
- **The environment chips.** ADR 18's "Silence is data semantics, never an audio
  mute" is restated here, because a sound-selection ADR is exactly where someone
  would try to wire it.

## Options considered

- **Ship audio files (mp3/ogg) for real instruments** — better timbre, at the
  price of licensing, two build contexts carrying binaries, a fetch on the one
  code path that must work when the network does not, and a rewrite of a
  published Privacy sentence. Rejected; ADR 18 already made this call once.
- **A free-form number input or slider for the duration** — a keyboard on a
  tablet, a validation surface, and values like `0` and `47`. Rejected, same as
  ADR 28.
- **A dropdown / native `<select>` for the sound** — hides the range the setting
  has and cannot preview on hover. Rejected on tablet-first grounds.
- **Preview only on an explicit ▶ button next to each name** — doubles the tap
  targets in the densest row of the modal to protect against a sound the user
  asked to hear. Rejected; the cancel-on-next-tap rule solves the same problem
  with no extra chrome.
- **Preview the pattern once regardless of the ladder** — safer, and it makes the
  ladder unauditable: the one thing you cannot check is the setting you just
  changed. Rejected.
- **Loop until dismissed / a snooze** — ADR 18 rejected it, this ADR did not
  reopen it, and the 20 s ceiling is the line that keeps the bounded version from
  drifting into it.
- **Per-preset or per-task sounds** (a different sound for a break) — a taxonomy,
  not a setting; and GLU has no break concept (ADR 02's scheduler is still out).
  Not pursued; future brief.
- **A "random each time" option** — cute for a day, then it is a bug report about
  an inconsistent alert. Rejected.
- **Reusing the sound for the final-countdown takeover (ADR 21) or a start tick** —
  new alert *moments*, which is a different brief from new alert *sounds*.
  Out of scope.

## Scope

### In scope

- `lib/alertSounds.ts`: the nine-sound registry, `ALERT_DURATION_CHOICES`,
  `resolveAlertSound`, `resolveAlertDurationSeconds`, `alertRepeatCount`, and the
  WebAudio engine (`primeAudio`, `playAlertSound`, `stopAlertSound`) — replacing
  `lib/chime.ts`, whose single hard-coded pattern becomes the `chime` entry.
- `alertSoundId` + `alertDurationSeconds` in the persisted blob, their setters
  (resolved on write), and `partialize`.
- `useSessionAlerts` reading both at fire time; `TransportControls` stopping a
  sound in flight.
- The Settings "Alerts" section: the nine-button grid, the five-rung ladder, the
  preview/cancel/stop-on-close behaviour, chrome tokens throughout, ≥44 px
  everywhere.
- Tests: registry invariants, the repeat arithmetic, resolvers in both
  directions, the hook firing the *selected* sound for the *selected* length,
  cancel-and-stop, the additive-blob round trip, stories for the section, and an
  ADR 09 E2E line that changes both settings through the real modal.
- Docs in the same session: ADR 18 and ADR 19 amendments, `DocsSections.tsx`
  (the manual's Alerts section), the Privacy sentence's plural, UI.md's overlay
  description, CLAUDE.md's index and pencil list.

### Out of scope

- **Volume, mute, and a per-sound level** → still ADR 19's pencil, still ADR 18's
  rocker.
- **Sounds at any other moment** — start, pause, the last-minute takeover
  (ADR 21), a tick — → future brief.
- **Uploading or importing a custom sound** — a file input, storage of user
  binaries in localStorage, and a licensing question. Not pursued.
- **Changing the notification, its text, or when alerts fire at all** (ADR 18).
- **Break-cycle automation** — still ADR 02's out-of-scope; an alert is not a
  scheduler.

## Implementation outline

1. **Registry first, engine second, in one module.** The nine literals, then
   `resolveAlertSound` / `resolveAlertDurationSeconds` taking `unknown` (ADR 28's
   gotcha: a `number` signature makes the caller cast before the guard runs).
   **Gotcha:** `period` must be ≥ the last tone's end for every entry or a
   repetition overlaps its own tail — assert it in a test rather than trusting
   nine hand-written numbers.
2. **The engine.** Keep ADR 18's one-context-forever rule and the in-gesture
   `resume()` verbatim. Add a **per-playback master `GainNode`** every oscillator
   routes through: that node is what makes cancellation a two-line operation
   instead of a bookkeeping exercise. **Gotcha:** stopping must ramp to zero
   (~50 ms) before `stop()`, or cutting a sine mid-cycle produces exactly the
   click this ADR is trying to avoid. **Gotcha:** `exponentialRampToValueAtTime`
   throws on a zero target — ADR 18 already ramps to `0.0001`, keep it.
3. **Store fields + setters**, resolved on write, added to `partialize`. No
   migration exists to write (additive-blob); add the test that proves the
   default arrives, not the migration that doesn't.
4. **Hook + transport.** `useSessionAlerts` reads `useGluStore.getState()` at fire
   time — not through a selector, because the hook must not re-render on a
   settings change. `TransportControls` calls `stopAlertSound()` next to its
   existing `primeAudio()`.
5. **The Settings section.** **Gotcha:** the grid is a `radiogroup` of buttons,
   so each button owns `role="radio"` + `aria-checked`, and the group is named by
   the visible label via `aria-labelledby` (ADR 28's rule — never a duplicated
   `aria-label`). **Gotcha:** the module's `.module.css` is unlayered and
   outranks Mantine (ADR 37), so a button that paints a selected state paints it
   in every state unless hover/active are restated. **Gotcha:** stop the preview
   in an unmount effect — the modal unmounts its children on close, which is the
   only "Settings closed" signal this component gets.
6. **Docs, UI.md, CLAUDE.md, ADR 18/19 amendments** — same session, per the
   manual-is-a-contract rule (ADR 29).

Honest sizing: **half a day.** The nine literals are an hour of ear-tuning, the
engine's cancellation path is the only genuinely fiddly code, and the section is
an afternoon of the ADR 28 shape done twice.

## Acceptance criteria

- [x] Settings shows a fourth section, "Alerts", between Screen and Time comments, with a nine-button sound grid (`radiogroup` named "Sound") and a five-rung ladder (`radiogroup` named "How long it plays" — Once / 3 s / 5 s / 10 s / 20 s), every control ≥44 px in both schemes and all three chrome directions, passing the a11y contrast gate.
- [x] Chime and Once are selected by default, and a finish with the defaults untouched plays exactly ADR 18's two-tone pattern, once — the shipped behaviour is byte-identical for anyone who never opens the row.
- [x] Tapping a sound selects it *and* plays it; tapping another cancels the first mid-play and starts the second; tapping the playing one stops it; closing Settings stops it.
- [x] Changing the ladder re-previews the selected sound for the new length: at 5 s a sound whose period is 1.6 s starts four times, and the last one is never cut off mid-tone.
- [x] A live finish plays the *selected* sound for the *selected* length; Stop, `s`, `Ctrl+C`, `n` and the restored-expired path still play nothing at all.
- [x] Pressing any transport control while an alert sound is playing stops it.
- [x] `alertSoundId` and `alertDurationSeconds` land in the `glu:v2` blob with no version bump and survive a reload; a blob written before the fields reads as Chime / Once.
- [x] An unknown sound id and an off-ladder duration (`"loud"`, `999`, `NaN`) resolve to Chime / Once in both directions — the controls render a selection, the alert still sounds, and the setters refuse to store either.
- [x] Every sound's `period` is at least as long as its last tone's end, and no sound's summed peak gain exceeds 1.0.
- [x] No audio file exists in `web/public` or the bundle; the Privacy claim "generated in the browser, nothing downloaded" is still literally true.
- [x] The manual's Alerts section names the sound library and the length setting, and `DOCS_UPDATED` reflects the session.
- [x] `npm test` (both packages), `npm run lint`, `npm run build`, `npm run build-storybook` green; the ADR 09 E2E block is active and green.

## Consequences

- **The alert stops being a constant and becomes a preference with a preview** —
  the first setting in GLU whose effect you verify with your ears rather than by
  reading a description, and the first row whose control *does something* on tap
  besides storing a value.
- **A tenth sound costs a data literal**, and the engine never has to know. That
  is the whole point of promoting the pattern to a registry instead of adding a
  `switch` with nine cases.
- **The alert can now last 20 seconds**, which is the closest this app has come to
  the alarm ADR 18 rejected. The line held is that it always ends by itself: no
  dismissal UI, no snooze, and any transport press cuts it short. A future brief
  that asks for "until I dismiss it" is reopening ADR 18's decision, not extending
  this one.
- **ADR 19's pencil is down to volume/mute, chrome direction, archive export and
  the takeover threshold** — and the section list absorbed a fourth section with
  no layout renegotiation, for the fourth time.
- **The Privacy Policy's audio sentence is now load-bearing for a library, not a
  beep.** Any future "let me upload my own sound" brief has to answer it first.
