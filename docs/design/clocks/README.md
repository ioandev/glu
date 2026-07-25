# Clock designs — spec of record

`pomodoro-timers.dc.html` is the design-canvas export of the 18 clock designs
(open it in a browser; it needs `support.js` beside it). `design-system.css` and
`design-system-readme.md` are the canvas's own design-system bundle.

The mockup driver treats its `progress` prop as **elapsed**; GLU's source of
truth is **remaining**. Fill direction is decided once in `clockProgress()`
(`src/clocks/progress.ts`), never inline per component.

## Mapping — mockup id → component

| Mockup | Name | Component / registry id |
|---|---|---|
| 1a | Halo — classic ring | `halo` (default clock) |
| 1b | Meridian — 60 ticks | `meridian` |
| 1c | Broadside — typographic | `broadside` |
| 1d | Aurora — ambient glow | `aurora` |
| 1e | Mono — brutalist ink | `mono` |
| 1f | Stack — depleting slats | `stack` |
| 1g | Orbit — dual rings | `orbit` |
| 1h | Field — rising fill | `field` |
| 2a | Eclipse — occluding disc | `eclipse` |
| 2b | Grid — dot matrix | `grid` |
| 2c | Terminal — CLI readout | `terminal` |
| 2d | Sunset — descending sun | `sunset` |
| 2e | Pill — bold bar | `pill` |
| 2f | Tide — liquid fill | `tide` |
| 2g | Split-flap — departures board | `split-flap` |
| 2h | Radar — conic sweep | `radar` |
| 2i | Bauhaus — rotating half-disc | `bauhaus` |
| 2j | Edge — border progress | `edge` |

The mockups show each design in its **native** scheme only. The counterpart
scheme for each is GLU's own design work, exported from the component alongside
the native one (ADR 07).
