# ADR 06: Keyboard control

- Status: Implemented
- Date: 2026-07-23
- Amended: 2026-07-23 — backend de-numbered after a third displacement (ADR 07
  is now clock designs): referenced as "the backend & sync ADR" until scheduled.

## Context

Product direction (2026-07-23): the timer gets keyboard shortcuts — **Ctrl+C**
and **s** stop, **p** pauses, **n** starts a new timer of the same length
*without finishing the current one*. The tablet is the primary surface, but the
app also runs half-width next to a terminal, where hands are already on a
keyboard — Ctrl+C-to-kill is that muscle memory imported deliberately.

Sequencing note, recorded: ADR 06 was penciled as "backend & sync"; this
assignment displaced the backend again. ADRs 04 and 05 have been amended to
repoint their backend references (04's still said "ADR 05" — a stale reference
from before 05 became session tracking, caught and fixed in the same pass).
The backend has since been de-numbered entirely (see amendment above).

**Prerequisites: ADR 02 and ADR 03 Implemented** (the state machine these keys
drive, and the test suite that pins their edge cases). ADR 05's session
recording is not a prerequisite, but its interplay is specified below so
whichever lands second inherits no surprises.

## Decision

- **We will bind, at the app-shell level:**
  - **`s` and `Ctrl+C` → Stop** — identical to the Stop button: reset to the
    selected duration, idle. No-op when already idle.
  - **`p` → toggle running ↔ paused.** The request says "pauses"; a pause key
    that cannot resume forces reaching for the screen mid-flow, which defeats
    the feature — so `p` toggles, recorded here as the one interpretation.
    In `idle`/`finished` it does nothing: *starting* stays a deliberate act.
  - **`n` → abandon the current run and start a fresh one at the selected
    duration**, from any state. "Without finishing the last one" is load-bearing:
    the abandoned run never reaches `finished`, so per ADR 05 it records **no
    session** — `n` is "that one didn't count, go again."
- **`n` uses the *selected duration*, not the outgoing run's ±-adjusted total.**
  The selected duration is the only thing the state machine already calls "the"
  length (Stop resets to it); ± adjustments are corrections to one specific run,
  not a new default. `n` is exactly Stop + Start in one keystroke.
- **`Ctrl+C` only stops when the text selection is empty.** With a selection it
  remains the copy shortcut, untouched — the terminal convention, and the only
  way to hijack Ctrl+C without breaking copying. On macOS copy is Cmd+C, which
  we never touch.
- **Bare letters never fire with a modifier held, while typing in an editable
  element, or on key auto-repeat.** Ctrl+P stays print, Ctrl+N stays new-window;
  a held `n` must not machine-gun new runs. The editable-element guard is free
  future-proofing for the Todoist ADR's inevitable text inputs.
- **We will implement with `useHotkeys` from `@mantine/hooks`** — already a
  dependency, matches modifiers exactly (bare `s` won't fire on Ctrl+S), and
  ignores input/textarea/select by default. No new library for four bindings.
- **Discoverability via the existing buttons**: `Tooltip` («Stop — S») and
  `aria-keyshortcuts` on Stop/Pause. `n` is keyboard-only (it has no button and
  gets none — the touch flow is Stop then Start). A shortcut legend/overlay is
  not warranted at four bindings → future **ADR: shortcut help** if the roster
  grows.

## Options considered

- **`react-hotkeys-hook`** — capable, but a second hotkey idiom next to an
  already-shipped Mantine hook. Rejected.
- **Raw `keydown` listener** — hand-rolling modifier/input/repeat guards Mantine
  already ships. Rejected (except the one custom selection check Ctrl+C needs).
- **`p` as pause-only (literal reading)** — can't resume without touching the
  screen; wastes the key. Rejected, interpretation recorded.
- **`n` reuses the ±-adjusted total** — makes `n` non-deterministic after a
  fiddly run; "the selected duration" is the predictable contract. Rejected.
- **Binding Cmd+C on macOS** — breaks copy on the whole platform for symmetry's
  sake. Rejected.
- **New on-screen button for `n`** — the left half just reached its final
  planned layout (ADR 05); a keyboard-only power action costs no pixels. Rejected.

## Scope

### In scope

- The four bindings (`s`, `Ctrl+C`, `p`, `n`) with the guards above, mounted
  once at the app shell.
- Tooltips + `aria-keyshortcuts` on the Stop and Pause/Start buttons.
- Tests per ADR 03's behavior checklist (list in outline); a story
  demonstrating shortcuts in the app-shell story's play function.

### Out of scope

- Any further bindings (space, Escape, presets by digit) → future **ADR:
  shortcut help / expanded bindings** if ever requested.
- A shortcut legend overlay — see Decision.
- Remapping/user-configurable keys — single-user app, YAGNI.
- Backend & sync → displaced from 06 by this ADR; the backend later
  materialized as **ADR 11** (stateless proxy only) and the sync half was
  cancelled (2026-07-24).

## Implementation outline

1. **`useTimerHotkeys` hook** wrapping `useHotkeys`, mounted in the app shell:
   `['s', stop]`, `['p', togglePause]`, `['n', restart]`, `['ctrl+c', stopIfNoSelection]`.
   **Gotcha:** register `ctrl+c` with `usePreventDefault: false` and decide
   inside the handler — check `window.getSelection()?.toString()`; empty →
   `preventDefault()` + stop; non-empty → return untouched so native copy runs.
   Letting the hook preventDefault unconditionally silently kills copy.
2. **Guards in the handlers**: bail on `event.repeat`; Mantine already filters
   editable targets and exact-matches modifiers — do not re-implement those,
   but **verify contentEditable is covered** (Mantine's default ignore list is
   INPUT/TEXTAREA/SELECT; pass the option for contentEditable explicitly).
3. **`restart` transition** — must go through the state machine as one
   transition (abandon + start), minting a **fresh `runId`** (ADR 05's
   idempotency contract) and triggering exactly one localStorage write (ADR
   02's write discipline), not a Stop-write followed by a Start-write racing
   the tick.
4. **Button affordances** — `Tooltip` and `aria-keyshortcuts` on Stop and
   Pause/Start.
5. **Tests** (behavior checklist):
   - `s` stops from running/paused/finished; no-op in idle.
   - `Ctrl+C` with empty selection stops; with an active selection does *not*
     stop and the event is not default-prevented (selection made over page text
     in the test DOM).
   - `p` toggles running ↔ paused; no-op in idle and finished.
   - `n` from running mid-way: new run at the selected duration, remaining
     reset, fresh `runId`; with ADR 05 present, session count unchanged.
   - `n` from a ±-adjusted run restarts at the *selected* duration, not the
     adjusted total.
   - Modifier passthrough: Ctrl+P / Ctrl+N events do not pause/restart.
   - Keys while focus is in a planted `<input>` and a contentEditable div: all
     four ignored.
   - `event.repeat` sequences fire the action once.

Honest sizing: half a day, tests included. The code is an afternoon; the whole
value is in the guards, and every guard above has a named test because
"shortcut app breaks copy-paste" is the bug users uninstall over.

## Acceptance criteria

- [x] With the timer running: `s` stops (display resets to the selected duration, idle); `Ctrl+C` with nothing selected does the same.
- [x] Select any text on the page, press `Ctrl+C`: the selection is copied to the clipboard and the timer keeps running.
- [x] `p` pauses a running timer; `p` again resumes it; `p` in idle or finished changes nothing.
- [x] Start a 20:00 run, let it tick a few seconds, press `n`: the timer restarts at 20:00 running; with ADR 05 implemented, the session count does not change.
- [x] Start a run, press `+5`, then `n`: the new run is the selected duration (20:00), not 25:00.
- [x] Ctrl+P and Ctrl+N reach the browser (print dialog / new window) — the app neither pauses nor restarts on them.
- [x] With focus in a text input (plant one via devtools if none exists yet): `s`, `p`, `n` type letters and the timer is unaffected.
- [x] Holding `n` for two seconds produces exactly one restart.
- [x] The Stop and Pause buttons show their shortcut in a tooltip and expose `aria-keyshortcuts`.
- [x] All ADR 03-style tests for the checklist above exist, named traceably, and pass; `npm test` and `npm run build` are green.

## Consequences

- The half-tablet-next-to-a-terminal workflow gets kill-and-restart ergonomics
  without touching the screen; the tablet flow is unchanged.
- `n` establishes "abandon without recording" as an explicit, tested behavior —
  ADR 05's "only `finished` records" rule now has a second consumer relying on it.
- Every future text input (Todoist ADR) inherits working guards for free, but
  every future *shortcut* must come through an ADR amendment here — four keys
  are memorable, a junk drawer isn't.
- The backend has been displaced three times and is now unnumbered until
  scheduled — PLAN.md's original numbering has fully dissolved; the CLAUDE.md
  index is the living source of truth for what's next.
