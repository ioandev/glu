# ADR 42: The second clock set — twenty-two more designs, and the count stops being written down

- Status: Accepted
- Date: 2026-07-26

## Context

Owner brief (2026-07-26): **"There are some new designs in `Pomodoro timer
design concepts (1).zip`. Implement them. They will need to follow the same
pattern as the other designs — their own file, Storybook entry, white/dark mode,
and available in the app. There is also the need to update the references in the
app from '18' designs, this number can't be in multiple places anymore."**

The archive carries two design-canvas sheets. `Pomodoro Timers.dc.html` is the
first set — the eighteen ADR 07 already implemented, unchanged. `Pomodoro
Timers 2.dc.html` is new: twenty-two further concepts, `1a`–`1v`, driven by the
same single `progress` prop and the same 340×460 preview card.

The second half of the brief is the more interesting one. The roster's size was
written as the literal `18` in ten places: two test assertions, a Storybook play
function, the user manual's prose, and six source comments. Every one of them
was a copy of a fact that only the registry actually knows, and this ADR would
have had to edit all ten. That is the definition of a number that should not
exist twice.

## Decision

**Implement all twenty-two, appended to the existing roster in sheet order, and
make `CLOCKS.length` the only statement of how many there are.**

### The designs

Same contract as ADR 07 — one module per design under `web/src/clocks/designs/`,
each exporting a `<Name>` component and a `<name>Theme` of `{ light, dark }`
palettes, each rendering inside `ClockFrame`, each a pure function of
`ClockProps` with no clock of its own.

| # | Id | Name | Native | Session | The idea |
| --- | --- | --- | --- | --- | --- |
| 1a | `hourglass` | Hourglass | light | — | Sand falls from the top bulb into the bottom |
| 1b | `segment` | Segment | dark | ✓ | Twelve chunky arcs, extinguished one at a time |
| 1c | `meter` | Meter | dark | ✓ | An equalizer emptying right to left |
| 1d | `nixie` | Nixie | dark | ✓ | Four glowing tubes over a hairline bar |
| 1e | `nest` | Nest | light | ✓ | Concentric squares dropping out from the outside |
| 1f | `lunar` | Lunar | dark | ✓ | Eight moons waxing across the run |
| 1g | `candle` | Candle | dark | ✓ | Wax burning down to the holder |
| 1h | `steps` | Steps | light | ✓ | A staircase climbed left to right |
| 1i | `lcd` | LCD | light | ✓ | A retro handheld: screen, skewed digits, two buttons |
| 1j | `spiral` | Spiral | light | — | A coil unwinding from the middle |
| 1k | `soft` | Soft | light | ✓ | A neumorphic dial pressed into the card |
| 1l | `glass` | Glass | dark | ✓ | A frosted card over a lit gradient |
| 1m | `comet` | Comet | dark | ✓ | One body, exactly one orbit per run |
| 1n | `barcode` | Barcode | light | ✓ | Forty lines fading out |
| 1o | `cell` | Cell | dark | ✓ | A battery draining |
| 1p | `wedge` | Wedge | light | ✓ | The kitchen dial, its wedge closing |
| 1q | `words` | Words | dark | ✓ | The time spoken, not counted |
| 1r | `prism` | Prism | dark | — | A gradient ring turning once per run |
| 1s | `pixels` | Pixels | dark | ✓ | One hundred cells, one per percent |
| 1t | `tempo` | Tempo | light | ✓ | A metronome, four swings per run |
| 1u | `mercury` | Mercury | light | ✓ | A thermometer rising with the work |
| 1v | `ghost` | Ghost | dark | — | Outlined minutes draining from the top |

Four designs carry no session count, because their mockups carry none. The other
eighteen do.

### Rules the new set inherits, and does not get to break

- **Fill direction is decided in `clockProgress`, not per design.** The canvas
  driver's `progress` is *elapsed*; GLU's truth is *remaining*. Every geometry
  reads one of the two named fractions rather than inverting by hand.
- **Colour comes from `--clk-*`, always.** The mockups' hard-coded hexes become
  palette entries; anything the mockup drew in a fifth colour (the prism's four
  hues, the glass wash, the LCD screen) is expressed as a `color-mix` of the
  design's own tokens, so the design still recolours with the palette (ADR 15).
- **Both schemes are designed.** The mockup's scheme is recorded as
  `nativeScheme`; the other is GLU's own work, as in ADR 07.
- **`cqmin`, not pixels.** The 340×460 card is a preview size, not a contract.
- **Contrast is a gate, not a preference.** Muted ink clears 4.5:1 on the
  design's own background in both schemes, which moved ten of the mockups'
  light-scheme greys a few percent darker.

### The count lives in exactly one place

`registry.ts` gains `export const CLOCK_COUNT = CLOCKS.length`. The docs page
renders `{CLOCK_COUNT}`, the Storybook grid asserts `CLOCKS.length`, and the
registry test no longer asserts a literal at all. What it asserts instead is
**completeness**: every `.tsx` under `designs/` is registered exactly once, and
every registered component's name matches a module. That check is strictly
stronger than `toHaveLength(18)` ever was — it fails on a design that was
written but never wired up, which is the mistake the literal was there to catch
and could not.

The prose comments that said "all 18 clocks" now say "every clock". A comment
that counts is a comment that goes stale.

## Consequences

- The gallery flip-through (ADR 08) is now forty designs long — eighty-six
  once [ADR 45](45-third-clock-set.md)'s third sheet lands. ADR 08 already
  named ~25 as the point at which linear flipping wants a picker; that reopening
  condition is now **live**, and is left to a future ADR rather than smuggled in
  here. The keyboard and swipe affordances are unchanged.
- The chrome × palette × scheme a11y sweep (ADR 15) grew from 54 to 120 cases.
  It passes; `EXTREME_PALETTE_IDS` is unchanged, since the new palettes sit
  inside the existing extremes.
- `DocsSections.tsx` now imports the registry for the count, which pulls the
  clock modules into the `/glu/docs` route's module graph. Accepted: one true
  number beats a lighter import, and the modal surface already loads them.
- The persisted `activeClockId` is untouched — new ids only ever add, so no
  store migration is needed and `resolveClock` still catches anything unknown.

## Deviations

- **Words gets a small exact readout.** The mockup shows only "about twelve
  minutes of focus left". Every design in the roster answers "how long exactly?";
  one that cannot is a different product, and the shared test that asserts the
  formatter's output appears would have had no answer. The sentence stays the
  hero, with `mm:ss` beneath it in the accent.
- **Mercury's scale is the run, not 0–25.** The mockup's tick row is hard-coded
  to a 25-minute pomodoro. GLU's runs are 1–99 minutes (ADR 32), so the ticks are
  quarters of `totalMinutes`.
- **Tempo's swing is four per run, not per second.** The mockup drives the
  pendulum off the same `progress` value; a real metronome beat would need a
  clock of its own, which ADR 07 forbids.
- **LCD's screen is a 28% accent tint, not 55%.** At the mockup's value the
  design's own ink failed 4.5:1 on it.
- **Candle's wax is tinted from the accent, not from the ink.** The mockup's
  cream wax is the *ink* of a natively-dark design; taking the token literally
  painted a black candle in the light scheme. It is a pale accent tint in both.
- **Candle's flame goes out when the run finishes.** Cheap, and the only
  per-state artwork in the set — everything else uses `stateLabel`.

## Acceptance criteria

- [x] All twenty-two designs render across the remaining × total matrix without
      throwing, in both schemes, and are pure (identical markup twice).
- [x] Each has its own module, its own `{ light, dark }` palette, and a
      Storybook entry; the overview grid and the `id` select list them.
- [x] Each is reachable in the app by flipping the gallery, and repaints the page
      with its palette.
- [x] The chrome a11y sweep passes over every new palette; no design's muted ink
      falls below 4.5:1 on its own background.
- [x] The literal `18` appears nowhere in `web/src` as a count of designs;
      `CLOCK_COUNT` is the single source and the registry test enforces
      completeness instead.
- [x] `just web test`, `just web lint` and `just web build` are green.
