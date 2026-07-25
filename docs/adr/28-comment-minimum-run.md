# ADR 28: Minimum run before a time comment — the threshold becomes a setting

- Status: Implemented (deviations noted)
- Date: 2026-07-25
- Amended: 2026-07-25b — **the minimum is inclusive: `ranMs >= threshold`**
  (owner report: "doesn't seem to work if the timer is exactly 1 minute — 5
  minutes and −2 twice"). The first cut inherited ADR 14's strictly-greater
  comparison unexamined, on the reasoning that only the right-hand side was
  moving. That reasoning was wrong the moment the number got a label: a row
  reading **Minimum time to log · 1 min** promises that a one-minute run is
  enough, and `>` broke that promise on the *default* setting, for the
  smallest run the app can produce. A 1-minute timer run to 0:00 accumulates
  **exactly** 60 000 ms — `accumulatedRanMs` caps the stretch at `endAt`, so it
  is not 60 001 and never will be — which made the one value the strict
  comparison rejects also the one value this repro produces every time.

  Two rules fall out and are recorded. **A threshold the user can see is a
  minimum, not a bar to clear** — inclusive is the only reading of the word,
  and any future numeric setting should assume it. And **a comparison
  inherited from a constant deserves re-deriving when the constant becomes a
  control**: nothing about `>` was wrong while 60 s was invisible, and nothing
  about it survived being labelled. This supersedes ADR 14's "60 s exactly does
  not post" (amended there); every other rule — rounding, the strictly-once
  outbox, the run-end read — is untouched.

- Deviation (2026-07-25, implementation): the resolver runs on **read as well
  as write**. Resolving only in the setter was the first cut, and it leaves a
  hand-edited blob rendering a ladder with no rung selected — the control looks
  broken rather than defaulted. `SettingsContent` resolves what it renders and
  `qualifies` resolves what it compares, so a junk value is invisible in both
  directions.
- Deviation (2026-07-25, implementation): the 44 px assertion measures the
  rung's `<label>`, not the text inside it. Mantine wraps each segment's words
  in an inner span, so `getByText` returns a 21 px node — the tappable surface
  is its parent, and asserting on the wrong one would have passed a control
  nobody's thumb could hit.

## Context

Owner brief (2026-07-25): **Settings gets an option for the minimum time a run
must last before GLU logs a comment in Todoist, defaulting to 1 minute — and
whatever the app does today should follow that setting.**

What it does today is ADR 14's line: post when `ranMs > 60 s`, written as
`COMMENT_THRESHOLD_MS = 60_000` and never referenced anywhere else. The number
was never wrong; it was just never the user's. One minute is right for someone
running 5-minute presets on a single task and wrong for someone who starts and
abandons the timer a dozen times a morning and does not want twelve `[1m]`
comments on a task they barely touched.

Two prior decisions shape this more than they look like they should:

- **The threshold gates the comment, not the pomodoro.** ADR 14 already records
  that ADR 05's session count and ADR 14's minutes answer different questions
  with different rules (they disagree about `n` restart). This ADR widens that
  gap by one setting and must not let it leak: a completed run that lands under
  the threshold is still a session in the archive.
- **The gate can only live in the browser.** The proxy is permanently
  stateless (ADR 11) and never sees `ranMs` — the client sends a minute count
  it has already decided to send. A server-side threshold would need per-user
  storage, which is the one thing the backend is forbidden to grow.

**Prerequisites: ADRs 14, 19, 27 Implemented.** ADR 14 owns the threshold and
the outbox; ADR 19 owns the Settings section list; ADR 27 owns the section this
row joins. This ADR amends 14 and 19.

## Decision

### The setting

- **A fixed ladder — 1, 2, 5, 10, 15 minutes — not a number field.** The gate
  is a coarse "was that worth recording" judgment, and the ladder's rungs are
  the answers anyone actually has. A `NumberInput` on a tablet buys a keyboard,
  a validation surface, and values like `0` and `47`; a slider reads as
  continuous when five values is the whole useful range. Five ≥44 px rungs
  visible at once is the tablet-first shape (ADR 19's floor, ADR 12's segmented
  precedent).
- **Default 1 minute, which is exactly ADR 14's hard-coded 60 s.** The row
  exists to move off the shipped behaviour, not to establish it — the ADR 17
  pattern, where the defaults *are* the previous policy and the toggles are the
  escape hatch. Nobody who never opens Settings sees a change.
- **The comparison is inclusive** (amendment b — it shipped as ADR 14's strict
  `>` and lasted an afternoon). A run of exactly the chosen minute *has met the
  minimum*: `ranMs >= threshold`. The word on the row decides this, not the
  history of the constant.
- **Minutes, never seconds.** The artifact is `[Nm]` — a threshold expressed at
  a resolution the comment cannot carry would be a setting about a number the
  user can never see.
- **Read at run end**, with ADR 27's setting and toggles, in the same listener.
  The outbox retries on a backoff and may drain hours later; re-asking "does
  this qualify?" at drain time would let a threshold raised at lunch delete
  time that was already earned and queued. The queue holds decisions, not
  candidates.
- **`commentThresholdMinutes: number` in the blob**, additive, no version bump
  (ADR 19's pattern). **An unrecognised value reads as the default** — the blob
  is hand-editable and the ladder may gain or lose a rung between releases, so
  `resolveCommentThresholdMinutes` falls back the way `resolveClock` does for a
  clock id that no longer exists. A stored `0` must not become "post
  everything", and a stored `999` must not become "post nothing".

### Where it sits

- **First row of the existing "Time comments" section** (ADR 27), above "Say
  how you worked" and its previews. Whether a comment happens at all comes
  before what its sentence says, and the switch keeps its previews adjacent —
  they belong to it, not to the section.
- **A label, a one-line description, a ladder** — the first settings row that
  is not a switch. It borrows the switch's label typography so the section
  still reads as one list, and every colour on it is a chrome token: the
  indicator is `--glu-accent` and the active rung's text `--glu-on-accent`,
  both contrast-guaranteed by construction (ADR 15).
- **No preview.** ADR 27's previews show *what the comment says*; a threshold
  has nothing to render but its own number, which the ladder already shows.

### What it deliberately does not touch

- **The session archive.** A finished run under the threshold still counts as a
  pomodoro (ADR 05). The two counters keep disagreeing on purpose.
- **Comments already posted, and the totals badge.** The ledger is history: a
  threshold raised today never retro-silences a comment, and the totals route
  keeps summing every `[Nm]` comment it finds. Nothing about the wire format,
  the parse contract, or the DELETE guard moves.
- **The proxy's bounds.** `POST …/comment` still accepts `1 ≤ minutes ≤ 40320`.
  The threshold is a judgment about *what deserves a write*, made where `ranMs`
  lives; the server's bounds are a defence against a hijacked frontend, and one
  is not a substitute for the other.

## Options considered

- **A number input (or stepper)** — free-form entry needs validation, an error
  state, and a keyboard that covers half a tablet screen, to express values
  nobody wants. Rejected; the ladder is the same decision with none of the
  surface.
- **A slider with marks** — imprecise under a thumb and it implies a continuum.
  Rejected.
- **A select/dropdown** — one fewer visible control, one more tap, and it hides
  the range the setting even has. Rejected on tablet-first grounds.
- **A "log every run" rung (0 minutes)** — `commentMinutes` floors at 1, so a
  three-second misfire would post `[1m] You spent 1 minute on this`. That is
  not a permissive setting, it is a lie in the ledger. Rejected.
- **Seconds granularity** — see above; the artifact is minutes.
- **Enforce it on the proxy** — requires per-user server state (forbidden,
  ADR 11) and the server never sees ran time anyway. Rejected.
- **Re-check the threshold at drain time instead of run end** — simpler code,
  and it silently drops queued time when the user changes their mind. Rejected
  for the same reason ADR 27 snapshots the environment.
- **Let the threshold also hide short comments from the totals badge** — the
  badge sums what is in Todoist; a client-side filter would make GLU disagree
  with every other Todoist client about the same task. Rejected.
- **Per-task or per-preset thresholds** — a taxonomy, not a setting. Not
  pursued; would need its own brief.

## Scope

### In scope

- `COMMENT_THRESHOLD_CHOICES`, `DEFAULT_COMMENT_THRESHOLD_MINUTES`,
  `resolveCommentThresholdMinutes` and `commentThresholdMs` replacing
  `COMMENT_THRESHOLD_MS`.
- `commentThresholdMinutes` in the persisted blob (default 1) + its setter,
  which stores only resolved values.
- `qualifies(ranMs, thresholdMinutes)` and the run-end listener reading the
  setting at run end.
- The Settings row: label, description, ladder, chrome tokens, ≥44 px rungs.
- Tests: the at-least rule at the default and at a moved threshold (including
  the 1-minute run to 0:00 that amendment b was written for); off-ladder values
  resolving to the default in both directions; run-end-not-drain-time timing;
  the session archive staying untouched; the additive-blob round trip; a story
  for the ladder; an E2E that moves the setting through the real Settings
  surface and watches a 4-minute run go silent and a 6-minute run post.
- ADR 14 and ADR 19 amendments, UI.md, CLAUDE.md index and pencil list.

### Out of scope

- **Any other comment-posting policy** (per-task thresholds, quiet hours, a
  "don't post stopped runs" switch) → future brief. This ADR moves one number.
- **A threshold for the session archive** — ADR 05 counts what the timer
  finished; it is not a Todoist setting.
- **Retro-filtering the totals badge or existing comments** — see Decision.
- **The remaining penciled settings sections** (chrome direction · 15, archive
  export · 05, alert volume · 18, takeover threshold · 21) — unchanged.

## Implementation outline

0. **Re-derive the comparison, don't inherit it** (amendment b). ADR 14's `>`
   was written about an invisible constant; the row makes it a promise about
   the word "minimum". **Gotcha:** the failing case is not exotic — it is the
   default setting and a 1-minute timer, which `accumulatedRanMs` pins at
   exactly 60 000 ms.
1. **The constants first**, in `store/types.ts` next to the rest of ADR 14's
   numbers: the ladder, the default, the resolver, the ms helper. **Gotcha:**
   the resolver takes `unknown`, not `number` — its whole job is the value that
   was never a valid minute, and a `number` signature makes the caller cast
   before the guard runs.
2. **Store field + setter**, resolved on write; add it to `partialize`.
   **Gotcha:** the additive-blob pattern means there is no migration to write —
   `initialPersistedState()` through `migrate` supplies the default. Add the
   test that proves it, not the migration that doesn't exist.
3. **`qualifies` grows a parameter** and the run-end listener passes
   `state.commentThresholdMinutes` — the same `state` ADR 27 already reads its
   snapshot from. **Gotcha:** it must be the listener's `state`, not a fresh
   `getState()` at drain time; the whole timing rule is one argument.
4. **The Settings row.** **Gotcha:** the visible label is the accessible name —
   wire it with `aria-labelledby` rather than adding an `aria-label` copy that
   drifts. **Gotcha:** Mantine's segments are radios under transparent inputs;
   the 44 px floor belongs on the `<label>`, and both the label colour and the
   active-label colour must be set, or out-specifying one leaves the other
   painting page ink on the accent fill.
5. **Tests, story, E2E.** **Gotcha:** in Playwright, `"5 min"` is a substring of
   `"15 min"` — every name lookup on this control is `exact`.
6. **Docs in the same session**: ADR 14 amendment (the threshold is a setting
   now), ADR 19 amendment (the section's first non-switch row), UI.md's overlay
   description, CLAUDE.md's index.

Honest sizing: **two hours.** One number becoming a field is genuinely small;
what costs anything is the timing rule (run end, not drain) and the resolver,
and both are one test each.

## Acceptance criteria

- [x] The Time comments section's first row is "Minimum time to log" — a 1 / 2 / 5 / 10 / 15 minute ladder, each rung ≥44 px, with 1 min selected by default.
- [x] Its accessible name is the visible label alone (`radiogroup` named "Minimum time to log"), and the section still renders in both schemes and all three chrome directions without failing the contrast gate.
- [x] With the default untouched, ADR 14's behaviour is unchanged except where amendment b supersedes it: 59 s posts nothing, **60 s posts `[1m]`** (it did not before), 61 s posts `[1m]`.
- [x] **(amendment b)** The owner's repro passes end to end: preset 5m trimmed to 1m (−2 twice as reported; −1 four times since the row became ±1 on 2026-07-25 — ADR 02 deviation), run to 0:00 → exactly one `{taskId, minutes: 1}` post.
- [x] Picking 5 min and running 4 minutes on a focused task posts nothing and shows no undo bar; running 6 minutes posts exactly `{taskId, minutes: 6}` (asserted end to end through the real Settings surface).
- [x] The at-least rule holds at the chosen value too: with 2 min selected, a run just under 2 minutes posts nothing and a run of exactly 2 minutes posts.
- [x] The threshold is read at run end: raising it after a qualifying run ended but before the entry drains still posts that comment.
- [x] A finished run below the threshold still records a session in the ADR 05 archive.
- [x] `commentThresholdMinutes` lands in the `glu:v2` blob and survives a reload with no version bump; a blob written before the field reads as 1 minute.
- [x] An off-ladder value — `0`, `999`, `NaN`, `"5"` — gates at one minute and renders the ladder with 1 min selected; the setter refuses to store one.
- [x] `npm test` (both packages), `npm run lint`, `npm run build`, `npm run build-storybook` green; the ADR 09 E2E block is active and green.

## Consequences

- **ADR 14's threshold stops being a constant and starts being a preference**,
  which makes `qualifies` the only place in the comment path that reads user
  configuration. Any future ADR that adds a second posting rule inherits the
  question this one answered: *when* is it read? (Run end. Always run end.)
- **A user can now silence the feature without turning anything off.** Picking
  15 min with a 5-minute preset means no comment ever posts, and GLU will not
  warn about it — the previews say what a comment would look like, not whether
  one is coming. Recorded as accepted: it is an explicit choice on an explicit
  ladder, and the top rung sits below the 20-minute default preset so the
  shipped configuration always clears it.
- **Settings now has a row shape that is not a switch**, with tokenised
  typography the next section can copy. That is one more piece of the "richer
  treatment" UI.md parks as optional, arriving for free.
- **The gap between "a pomodoro" and "time worth reporting" is now
  user-visible.** ADR 14 recorded that the two counters disagree; this ADR
  hands the user the dial that widens the disagreement, which is the honest
  place for it — support questions about a session that logged no comment now
  point at a setting instead of at a constant.
