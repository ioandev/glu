# Chrome design directions — spec of record

`glu-concepts.dc.html` is Claude Design's delivery for the GLU chrome brief: three
complete treatments of the whole app (tablet + phone + all four overlays), each
painted with a different clock palette to demonstrate the two-layer model.
Open it in a browser (it needs `support.js` beside it).

`clock-specs-reference.png` is the reference render that shipped with it.

## Mapping — mockup id → chrome module id

| Mockup | Name | Module id | Demo clock palette |
|---|---|---|---|
| 1a | Studio Quiet — "the safe one" | `studio-quiet` (default) | Tide |
| 1b | Instrument | `instrument` | Terminal |
| 1c | Poster | `poster` | Pill |

## How to read it

- **Shape and material are the chrome's** — radius scale, border weight, elevation,
  label case/family, control and session-dot shape. Those are the axes the
  `ChromeTheme` contract in `src/chrome/` transcribes.
- **Colour family is the clock's** (ADR 08). Each mockup was deliberately painted
  with a different clock palette; the chrome's own background pair is the base
  that palette is mixed into.
- **The clock renderings inside the mockups are illustrative, not spec** — ADR 07's
  components are canonical. 1b's Terminal mockup even mislabels the `n` hotkey.
  Where mockup and `docs/design/clocks/` disagree, ADR 07 wins.
