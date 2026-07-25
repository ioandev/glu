# ADR 32: Custom durations — ± off the ladder, and the row that shows it

- Status: Implemented
- Date: 2026-07-25

## Context

Owner report (2026-07-25): **"When the timer has finished (00:00) and I press
−2, then start it again, it doesn't start at 3 minutes."**

The repro is a 5-minute preset run to completion, then two taps of `−1` (ADR 02
amendment), then Start. The expectation is a 3-minute run. What happens is a
5-minute run. Two separate faults produce it, and only fixing both fixes it:

1. **`adjust()` at `finished` has nothing to subtract from.** ADR 02 defines ±
   against `remaining`, and a finished run's `remaining` is `0`. `max(0, 0 − 1
   min)` is `0`, so the branch that treats hitting zero as completion fires,
   `finish()` early-returns because the timer is already finished, and the only
   thing that moved was `total` — a number the next run never reads.
2. **`start()` from `finished` deliberately discards `total` and `remaining`.**
   It re-arms from `selectedDuration`, which is correct (ADR 05: the run that
   just ended must not seed the next one with its own trimmed length) and which
   also means *every* adjustment made at 00:00 is thrown away, including one the
   user made specifically to shape the next run.

The same shape is visible one state earlier, without the second fault masking
it: at `idle`, `−1` moves the clock to 19:00 while the preset row still shows
**20m** highlighted. The clock and the row disagree, and the row is wrong. Stop
then "resets to the selected duration" — back to 20:00 — which reads as the app
undoing a choice the user made deliberately.

Underneath both is one unstated assumption: **that ± only ever means "nudge the
run I am in"**. That is true while something is running. It is false at `idle`
and at `finished`, where there is no run to nudge and the only thing ± can
sensibly mean is "the next one should be this long". The store had no way to say
that, because the *only* field Start, Stop and `n` read — `selectedDuration` —
could only be written by tapping a rung of a fixed seven-value ladder.

Owner's second half of the brief: **"add a custom button at the top with the
custom timer and keep it when I press play."** That is the missing half of the
same fix. A duration you can select but cannot see selected is a duration you
cannot trust; the preset row is where selection is displayed, so an off-ladder
selection belongs in the preset row.

## Decision

**A duration that ± walks off the ladder is a selection like any other. It
lands in `selectedDuration`, and the preset row grows a rung to show it.**

### ± means two different things, decided by whether a run is in flight

- **`running` / `paused` — unchanged, ADR 02 stands.** ± applies to `remaining`,
  `total` follows so the ring stays honest, and subtracting past zero completes
  the run. `selectedDuration` is *not* touched: a `+5` to finish a thought is a
  nudge to this run, not a redefinition of the 20-minute preset you will want
  back tomorrow. Stop still returns to the rung you tapped.
- **`idle` / `finished` — ± selects the next run's length.** It writes
  `selectedDuration`, `total` and `remaining` together, so the clock, the row,
  Start, Stop and `n` cannot disagree. There is no run to trim, so there is
  nothing for the three fields to mean separately.

The base ± counts from is **whatever Start would give you at that instant** —
`remaining` while idle, `selectedDuration` once a run has finished. That
one-line rule is what makes the reported repro produce 3 minutes: at `finished`
the base is the 5 that Start was about to re-arm, not the 0 on the clock.

### Adjusting at `finished` returns the timer to `idle`

The state after the write is the same shape Stop produces from `finished`: idle,
no `runId`, no accumulated ran-time. This is not tidiness. Once `remaining` is
3 minutes, `finished` is a false statement about the timer, and it is one the UI
acts on — ADR 21's takeover stays flooded *because* the status is `finished`,
and ADR 07's clocks paint 00:00 in the finished treatment. A clock reading 03:00
under a "Done" label, inside a takeover that will not retract, is three lies for
the price of one boolean.

Nothing about the finished run is lost by this: its session was recorded and its
run-end event emitted inside `finish()`, both idempotent and both already done.

### The floor is one minute, not completion

ADR 02's "subtracting past zero completes the timer" is a rule about a run in
flight, and it stays that. With no run in flight there is nothing to complete,
so ± clamps at `MIN_TOTAL_MS` — the same one-minute floor `total` has always
had. This **supersedes ADR 02's 2026-07-24 deviation** ("subtracting past zero
from `idle` enters `finished` without minting a run"), which existed only
because `idle` had been folded in with `running` by accident. Entering
`finished` from `idle` was always a strange thing for the app to do: it lit the
done treatment for a run nobody ever started.

### The custom rung

`PresetRow` renders the ladder plus, **when and only when `selectedDuration` is
off the ladder**, one more button carrying that duration — inserted in sorted
position, not appended. The row reads as a ladder of lengths and a `3m` after
`60m` would read as "3 minutes is the longest option" to anyone scanning it.

It looks exactly like a preset, deliberately. An off-ladder duration is not a
different *kind* of thing — it is a length you can tap to re-select, which is
precisely what the other seven are. Giving it its own treatment would invite the
question "what is different about this one?", whose honest answer is "nothing".

It survives Start because it lives in `selectedDuration`: the run reads it, the
row keeps rendering it, Stop returns to it, `n` restarts at it, and the `glu:vN`
blob already persists it. It disappears the moment a preset is tapped, because
then the selection is on the ladder again and there is nothing left to show.

There is exactly one custom rung at a time. It is the *selection*, not a
history: a second off-ladder value replaces the first.

## Options considered

- **Make `start()` from `finished` read `total` instead of `selectedDuration`.**
  The smallest possible patch to the literal bug, and wrong. `total` at
  `finished` is the length of the run that just ended including every mid-run
  `+5`; re-arming from it would make a run that was nudged to 25 minutes silently
  become a 25-minute *preset*. It also leaves `−1` at 00:00 doing nothing at all,
  since `adjust` never reaches a state where it can move anything.
- **Have every ± write `selectedDuration`, in every state.** One rule instead of
  two, and it breaks the useful half of ADR 02: a mid-run `+5` would redefine the
  preset, so Stop would return to 25 and the row would show a custom rung for a
  nudge the user thought was temporary.
- **A number input, or a long-press editor, for arbitrary durations.** A real
  feature and a bigger one — it needs a keypad, validation, and a decision about
  seconds. The brief asks for the ± buttons to work where they already are; a
  duration picker can be its own ADR if the ladder plus ± is ever not enough.
- **Append the custom rung at the end of the row.** A stable position while ±
  is being tapped repeatedly, at the cost of a row that no longer reads in
  order. The user is not tapping the custom rung while adjusting — they are
  reading it — so ordering wins.

## Scope

### In scope

- `adjust()` gains its not-in-flight branch: writes `selectedDuration`, `total`,
  `remaining`; leaves `finished` for `idle`; clamps at one minute.
- `durationOptions()` in `web/src/lib/time.ts` — the ladder, plus the custom
  rung in sorted position when the selection is off it.
- `PresetRow` renders that list; the custom rung is marked `data-custom` for
  tests and any future styling, and is otherwise identical to a preset.
- The manual (ADR 29) gains the custom rung and the two meanings of ±.
- ADR 02 amended: its `idle` deviation is superseded, its ± rule is scoped to
  runs in flight.

### Out of scope

- **Arbitrary duration entry** (keypad, long-press, seconds). See options.
- **More than one custom rung / a recents row.** The row shows the selection,
  not a history.
- **Changing what ± does to a running timer.** ADR 02's rule is correct there
  and is untouched, including the complete-at-zero behaviour.
- **A settings row for the ladder itself.** The seven presets stay source
  constants (ADR 02).

## Implementation outline

1. `web/src/lib/time.ts` — `isPresetDuration(ms)` over a `Set` built from
   `PRESET_MINUTES`, and `durationOptions(selectedMs)` returning
   `{ ms, label, custom }[]` sorted by `ms`. The label is `${minutes}m` for a
   whole minute and `mm:ss` otherwise, so a hand-edited blob cannot produce two
   rungs with the same accessible name.
2. `web/src/store/gluStore.ts` — the `idle`/`finished` branch at the top of
   `adjust()`, before the existing in-flight path.
3. `web/src/components/timer/PresetRow.tsx` — map `durationOptions`, key by
   `ms`, `data-custom` on the custom rung.
4. `PresetRow.stories.tsx` — a story for the custom rung's position and
   pressed state.
5. `DocsSections.tsx` — the presets paragraph and the ± paragraph.
6. Tests: store units for both states and the floor; a `PresetRow` render test
   for appearance, position and disappearance; an e2e that runs the owner's
   exact repro end to end.

## Acceptance criteria

- [x] Run a 5-minute preset to 00:00, tap `−1` twice, tap Start: the run is
      3 minutes. (The reported repro, asserted in `e2e/core.spec.ts`.)
- [x] After those taps and before Start, the preset row shows a `3m` button,
      pressed, sitting before `5m`.
- [x] The `3m` rung is still there and still pressed while the run is going,
      and after Stop the clock returns to 03:00.
- [x] Tapping `5m` removes the custom rung.
- [x] At `idle`, `−1` moves the clock *and* the row together; no state shows a
      highlighted rung that disagrees with the clock.
- [x] Subtracting below one minute from `idle` or `finished` stops at 01:00 and
      does not enter `finished`.
- [x] A `+5` during a run still moves only that run: `selectedDuration` is
      unchanged, no custom rung appears, and Stop returns to the tapped preset.
- [x] Adjusting at `finished` leaves `finished`, so ADR 21's takeover retracts
      and the clock drops the done treatment.

## Consequences

- **`selectedDuration` is now written by two actions, not one.** Anything that
  reads it as "the preset the user tapped" is reading it wrong; it means "the
  length the next run will be", which is what Start, Stop and `n` always used it
  for anyway.
- **The preset row's length is no longer fixed at seven.** It wraps already
  (ADR 02), so the eighth rung costs a layout that was always going to wrap on a
  narrow screen — but any future work that assumes seven buttons is wrong.
- **`finished` is now a state the user can leave without starting or stopping.**
  Three surfaces read it (ADR 21's takeover, ADR 07's clock treatment, ADR 18's
  alert edge); the first two are the reason for the transition and the third
  fires on entry, not on exit.
