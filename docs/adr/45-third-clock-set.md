# ADR 45: The third clock set — forty-six stopwatches, pointed back at a countdown

- Status: Accepted
- Date: 2026-07-26

## Context

Owner brief (2026-07-26): **"Do the same again. I have more designs in
`Pomodoro timer design concepts (2).zip`. Note that these pretend that the time
is going up, but it should still go down."**

The archive's third sheet, `Pomodoro Timers 3.dc.html`, holds **forty-six**
concepts, `1a`–`1at`. Its driver differs from the first two sheets in one
decisive way:

```js
const e = Math.round(1500 * p);   // sheets 1–2 used 1500 * (1 - p)
```

Every readout on the sheet is **elapsed** time, and the copy says so: ELAPSED,
COUNTING UP, MINUTES IN, STACKING UP, `+12:30`, `▲ 12:30`, `{{pPct}} of 25:00`.
It is a stopwatch sheet. GLU is a countdown (ADR 02), and the owner's note is
explicit that it stays one.

## Decision

**Implement all forty-six. The digits show `remaining`, always. The artwork
keeps the sheet's growth, because on this sheet growth means something.**

### The split, stated once

ADR 07 already exports both fractions from `clockProgress`, and the roster
already uses both — Halo's ring drains (`remainingFraction`), Grid and Pixels
fill (`elapsedFraction`). This sheet lands hard on the second:

- **The readout is the countdown.** `p.time`, `p.minutes`, `p.seconds` — never a
  count of elapsed time, on any of the forty-six. The one thing the user reads
  as *the clock* is the time left.
- **The artwork is the work done.** These are accumulation metaphors: coins
  banked, tally marks scored, stars earned, links forged, a city built, a card
  stamped. Inverting them so they drain does not make them countdowns, it makes
  them meaningless — a stamped punchcard that un-stamps is not a design, it is a
  bug. They fill with `elapsedFraction`, exactly as the mockups draw them.
- **Every "counting up" label is rewritten.** ELAPSED becomes the state label,
  `+12:30` loses its plus, `▲ 12:30` becomes `▼ 12:30 left`, "COUNTING UP"
  becomes "counting down", and `{{pPct}} of 25:00` becomes "N% of Xm done" — a
  statement about the artwork, next to a readout that is unambiguously the time
  remaining. A label that describes the geometry may say "banking" or
  "climbing"; none of them describe the digits as going up.

Numbers derived from elapsed time survive where they are *not* the clock: the
arcade score, the percentage figure, the diver's depth, the ledger's credited
minutes, the log's minute numbers. Each sits beside the countdown, never
instead of it.

### The designs

Same contract as ADRs 07 and 42 — one module per design, a `{ light, dark }`
palette, `ClockFrame`, `cqmin`, `--clk-*` colour only, pure in its props.

| # | Id | Name | Native | Session | The idea |
| --- | --- | --- | --- | --- | --- |
| 1a | `sweep` | Sweep | light | — | A stopwatch ring closing |
| 1b | `beam` | Beam | dark | ✓ | A bar growing under a big readout |
| 1c | `tally` | Tally | light | — | Minutes scored in fives |
| 1d | `odometer` | Odometer | dark | — | Drums in a recessed housing |
| 1e | `sunrise` | Sunrise | dark | ✓ | A sun climbing out of the dark |
| 1f | `column` | Column | dark | ✓ | Dots stacking up |
| 1g | `gauge` | Gauge | dark | — | A speedometer of work done |
| 1h | `bank` | Bank | light | ✓ | Coins earned, stacking |
| 1i | `ripple` | Ripple | dark | — | Rings radiating outward |
| 1j | `ink` | Ink | light | — | The word FOCUS inking in |
| 1k | `percent` | Percent | dark | ✓ | One enormous figure |
| 1l | `ruler` | Ruler | light | — | A playhead crossing a timeline |
| 1m | `bubble` | Bubble | light | — | A sphere inflating |
| 1n | `skyline` | Skyline | dark | ✓ | A city going up block by block |
| 1o | `altitude` | Altitude | light | ✓ | A marker climbing a rail |
| 1p | `beads` | Beads | light | — | Beads counted along a string |
| 1q | `hand` | Hand | dark | — | One bare hand on an unnumbered dial |
| 1r | `matrix` | Matrix | dark | — | An 8×8 grid filling in |
| 1s | `arcade` | Arcade | dark | ✓ | A score climbing, lives below |
| 1t | `quicksilver` | Quicksilver | light | — | A rising column in a bulb |
| 1u | `log` | Log | dark | — | A journal appending a line a minute |
| 1v | `stars` | Stars | dark | — | A sky filling in |
| 1w | `depth` | Depth | dark | — | A diver going deeper |
| 1x | `chain` | Chain | light | — | Links forged one at a time |
| 1y | `pulse` | Pulse | dark | ✓ | A heartbeat trace drawing itself |
| 1z | `pour` | Pour | light | — | A glass filling |
| 1aa | `dial` | Dial | light | ✓ | A fat half-moon meter |
| 1ab | `sprout` | Sprout | light | — | A stem growing out of a pot |
| 1ac | `laps` | Laps | dark | ✓ | Five laps of an orbit per run |
| 1ad | `marquee` | Marquee | dark | ✓ | Minutes over seconds at poster scale |
| 1ae | `slices` | Slices | light | — | A pie accumulating |
| 1af | `ticks` | Ticks | dark | — | Sixty ticks lighting up |
| 1ag | `punchcard` | Punchcard | light | — | A card stamped a minute at a time |
| 1ah | `wash` | Wash | light | — | Ink flooding the card from the top |
| 1ai | `route` | Route | light | — | A winding path walked |
| 1aj | `neon` | Neon | dark | — | A glowing sign |
| 1ak | `ledger` | Ledger | light | — | The run credited in five rows |
| 1al | `signal` | Signal | dark | — | Five strength bars climbing |
| 1am | `blueprint` | Blueprint | dark | ✓ | The run as a drafting figure |
| 1an | `chip` | Chip | light | — | One pill on an empty card |
| 1ao | `waveform` | Waveform | dark | ✓ | The session recorded so far |
| 1ap | `milestones` | Milestones | light | — | Checkpoints ticked off |
| 1aq | `heat` | Heat | dark | — | The whole card warming through |
| 1ar | `dominoes` | Dominoes | light | — | A row tipping over |
| 1as | `aperture` | Aperture | dark | — | An iris opening onto the readout |
| 1at | `confetti` | Confetti | light | ✓ | A piece thrown per slice of work |

### Six names the sheet could not keep

The sheet reuses names the roster already holds, and two more are labelled as
"up" variants of existing designs. Ids and component names are unique by
construction, so:

| Sheet | Ships as | Why |
| --- | --- | --- |
| Mercury (1t) | **Quicksilver** | ADR 42's Mercury is the horizontal thermometer |
| Glass (1z) | **Pour** | ADR 42's Glass is the frosted card |
| Cells (1r) | **Matrix** | ADR 42's `cell` is the battery; `cell`/`cells` is a trap |
| Broadside Up (1ad) | **Marquee** | ADR 07's Broadside is its own design |
| Meridian Up (1af) | **Ticks** | ADR 07's Meridian is its own design |
| Mono Up (1ah) | **Wash** | ADR 07's Mono is its own design |

## Consequences

- The roster is **86 designs**. ADR 08's linear flip-through is now well past
  the "~25 and it wants a picker" line ADR 42 already flagged as live; this ADR
  does not build one, and the reopening condition stands louder.
- `CLOCK_COUNT` (ADR 42) absorbed the whole change: the docs page, the stories
  grid and the tests needed no edit for the new size. That is the second sheet
  in a row where the number cost nothing.
- The chrome × palette × scheme a11y sweep is 258 cases and passes. Twenty-four
  of the sheet's light-scheme greys were darkened to clear 4.5:1 on their own
  card.
- The registry test's "most designs show a session" clause is gone. The third
  sheet's mockups mostly carry no session count, so the claim stopped being true
  the moment they landed; what it asserts now is that the flag is exercised both
  ways, which is what it was really guarding.
- `designs/noise.ts` joins the folder: three designs scatter things (stars, a
  waveform, confetti) and the scatter has to be identical on every render. It is
  the canvas' own hash, and it is deliberately **not** a `.tsx`, so the
  completeness test does not count it as a design.

## Deviations

- **Aperture opens instead of closing.** The mockup shrinks the iris to 32 px
  with the readout inside it and `overflow: hidden` — the time is gone by the
  end of the run. It opens here, and never below the size the digits need.
- **Blend modes become clips.** Wash (1ah) and Bubble (1m) float their readouts
  on `mix-blend-mode: difference`. ADR 07 already ruled on this for Tide: a
  difference blend against a mid-tone is genuinely low-contrast and invisible to
  every checker. Wash draws its readout twice and clips one copy to the flood;
  Bubble uses ADR 07's plate.
- **Scales come from the run, not from 25 minutes.** The sheet hard-codes a
  25-minute pomodoro in Ruler's tick labels, Ledger's five 5-minute rows,
  Milestones' checkpoint list, Punchcard's 25 cells, Depth's metres and Stars'
  "one star per 30 sec". All are derived from `totalMinutes` — GLU's runs are
  1–99 minutes (ADR 32).
- **Arcade's lives are the session count**, not a hard-coded two. It is the only
  place the sheet's "2/4" had a real meaning available.
- **Tally and Punchcard cap their units** at ADR 07's `unitCount` ceiling, so a
  99-minute run does not draw 99 marks off the edge of the card.

## Acceptance criteria

- [x] All forty-six designs render across the remaining × total matrix without
      throwing, in both schemes, and are pure (identical markup twice).
- [x] **Every one displays the time remaining**, never elapsed; the shared test
      that asserts the formatter's output appears covers all of them.
- [x] Each has its own module, its own `{ light, dark }` palette and a Storybook
      entry; each is reachable by flipping the gallery and repaints the page.
- [x] The chrome a11y sweep and the Storybook a11y run pass in both schemes over
      every new palette.
- [x] No literal count of designs was added anywhere (ADR 42's rule).
- [x] `just web test`, `just web lint` and `just web build` are green.
