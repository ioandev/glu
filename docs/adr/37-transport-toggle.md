# ADR 37: One transport toggle — Start, Pause and Resume are the same button

- Status: Implemented
- Date: 2026-07-26

## Context

Bug report (2026-07-26, owner): *"Start button doesn't get disabled. Maybe
combine it with pause?"*

The first half was a styling defect, and the diagnosis matters because it will
recur. `TransportControls` has always passed `disabled={running}` to Start and
`disabled={!running}` to Pause — the buttons were genuinely inert. But
`web/src/components/timer/timer.module.css` paints `.transportButton` in a
plain CSS module, and CSS modules are **unlayered** while Mantine ships inside
`@layer mantine` (`web/src/app/globals.css`). Unlayered rules beat layered ones
regardless of specificity, so Mantine's `:disabled` / `[data-disabled]`
treatment never landed: a disabled Start kept its full accent fill and read as
live. Any component styling a Mantine control through a module class has the
same hole.

The second half is the better fix, and is why this ADR does not simply add a
disabled rule. ADR 02 gave the row three buttons, and at every moment one of
them was dead: Start in `running`, Pause everywhere else. A dead button on the
largest touch target on a tablet is a target you have to learn to stop aiming
at. The transport has exactly two live transitions in any state — advance the
run, or end it — so it wants exactly two buttons.

## Decision

**The transport row is two buttons: a primary that names the transition it
performs, and Stop.**

- The primary reads **Start** in `idle` and `finished`, **Pause** in `running`,
  **Resume** in `paused`. One `onClick`: `running` → `pause()`, everything else
  → `start()`. It keeps `data-variant="filled"` in all three states — it is the
  same control throughout, not three controls sharing a slot.
- **Nothing in the row is ever disabled.** The store already no-ops the
  impossible (`start()` returns early when running; `stop()` from `idle` resets
  to the selected duration, which is where it already is), so every press has a
  defined meaning.
- **ADR 18's priming stays on the start gesture only.** `primeAudio()` and
  `requestAlertPermission()` run in the `start()` branch. Pausing is not a
  gesture that needs an AudioContext, and asking for notification permission on
  a *pause* would ask at the least explicable moment.
- **The shortcut affordance follows the shortcut.** ADR 06's `p` is a no-op in
  `idle` and `finished`, so the tooltip and `aria-keyshortcuts="p"` appear only
  in `running` and `paused`. The tooltip label tracks the button:
  "Pause — P" / "Resume — P".
- **The primary gets a fixed `min-width` (152px).** Relabelling a
  content-width button would slide Stop sideways on every transition.

The store is untouched: `start`, `pause`, `togglePause` and `stop` already
carry the semantics, including `togglePause`'s `running ↔ paused`, which is now
simply the keyboard spelling of the primary button.

### Consequences

- ADR 02's step 4 ("Start/Pause/Stop buttons") and ADR 06's "Pause/Start
  buttons" affordance line are amended, not reversed — same transitions, one
  fewer button.
- ADR 29's manual changes in the same session (`DocsSections.tsx`,
  `DOCS_UPDATED`): the row is described as two buttons and the Paused glossary
  entry no longer offers a separate Start.
- Selectors survive almost intact, because the label in each state is what the
  tests already asked for: `Start` from idle, `Pause` while running, `Resume`
  while paused. Exactly one call site changed: the ADR 20 undo-bar overlap
  sweep, which iterated `["Start", "Stop", "Pause"]` and now iterates the two
  buttons that exist. The `AppShell` story's affordance assertion moved ahead
  of its `s` press, since idle no longer advertises `p`.

## Alternatives considered

- **Style the disabled state and keep three buttons** — the literal reading of
  the report's first sentence. Rejected: it makes the dead target *legible*
  rather than removing it, and the row still spends its whole life with a third
  of it inert.
- **Keep three buttons, none disabled** (Pause a no-op in idle) — worse than
  either: a button that looks live and does nothing.
- **Fix the layer collision globally** (move CSS modules into a layer after
  `mantine`) — a real question, deliberately out of scope. It would silently
  restyle every Mantine control in the app and belongs in its own ADR with a
  full visual pass. This ADR removes the only place the collision was
  user-visible.

## Out of scope

- The `@layer` ordering of CSS modules against Mantine (above).
- Any change to `stop`'s behaviour or to the `n` restart shortcut.
- The final-countdown takeover's own controls (ADR 21).

## Acceptance criteria

- [x] Idle: the row shows exactly two buttons, **Start** and **Stop**; neither is disabled.
- [x] Pressing Start begins the countdown and the same button becomes **Pause**; pressing it freezes the run and it becomes **Resume**; pressing it again continues from the same second.
- [x] Stop from any state returns to `idle` at the selected duration, and the primary reads **Start** again.
- [x] Stop never moves horizontally as the primary relabels itself.
- [x] `p` still toggles `running ↔ paused` and is still a no-op in `idle`/`finished`; the primary exposes `aria-keyshortcuts="p"` and a tooltip only in `running` and `paused`.
- [x] The notification permission prompt appears on a Start/Resume press and never on a Pause press.
- [x] `npm run test`, Storybook's `StartPauseStop` play test, and the e2e suite pass.

Verified 2026-07-26: unit + story suite 482/482, e2e 548 passed across four
projects. `core.spec.ts`'s "the transport is two live buttons, and Stop never
moves" walks Start → Pause → Resume → Pause → Stop asserting a zero
`button:disabled` count and a pixel-identical Stop `x` at every step;
`features.spec.ts`'s "the permission ask rides the start gesture, never the
pause" counts `Notification.requestPermission` calls across a Start then a
Pause. The `min-width` is **152px**, not the 140px first tried: "Resume" at
`size="xl"` measures 140.2px and was pushing Stop 0.09px sideways.
