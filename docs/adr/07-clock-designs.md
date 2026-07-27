# ADR 07: Clock design components

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-24 — these components are the **canonical clock layer**:
  the chrome mockups in **ADR 15** contain illustrative clock lookalikes
  (one even mislabels a hotkey) which are never used; ADR 07 components
  render inside every ADR 15 chrome composite.
- Amended: 2026-07-25 — **the props contract is milliseconds, not seconds:
  `{ remainingMs, totalMs, session, showSession, state }`** (owner report: the
  animations stepped). Whole seconds put a 1 Hz floor under every geometry no
  matter how often the component re-renders, so ADR 02's move to a frame-paced
  tick would have bought nothing on its own. `clockProgress()` absorbs the whole
  change: its **fractions are now continuous**, while `time`/`minutes`/`seconds`
  stay on ADR 02's ceiling-rounded whole second and a new `remainingSeconds` /
  `totalSeconds` pair serves designs that count discrete units. Digits still
  change once a second — only geometry moves per frame.

- Amended: 2026-07-25 — **hard gradient stops are cut by `clip-path`, not by the
  gradient** (owner report: some clocks' lines look stepped). Radar's conic sweep
  and Bauhaus's half-disc drew their straight edge as a colour stop, and a
  gradient stop is rasterized with no antialiasing — a visible staircase down an
  edge that turns all run. Both now paint past where the edge reads and clip back
  to it, which *is* antialiased. The clip lives in each element's own
  coordinates, so the "rotate with `transform`, never repaint the gradient" rule
  below is unaffected.

- Deviation (2026-07-24, implementation): the inventory **table** lists seven
  natively-dark designs (1b, 1d, 1e, 2a, 2c, 2d, 2h); the prose beneath it says
  six. The table wins — the registry and its completeness test encode 7 dark /
  11 light.
- Deviation (2026-07-24, implementation): the three blend-mode designs no longer
  use `mix-blend-mode: difference`. Difference against a mid-tone is genuinely
  low-contrast where the fill line crosses the glyphs, and invisible to every
  contrast checker — which fails this ADR's own a11y gate. Tide and Field get a
  readout plate; Pill's track became a tint of the ink rather than solid ink.
  `isolation: isolate` stays on the frame, and the isolation story stays, so the
  designs still render correctly on an arbitrary canvas colour.
- Deviation (2026-07-24, implementation): Grid's light `muted` and Tide's light
  `onAccent` were darkened to clear the 4.5:1 gate.
- Deviation (2026-07-24, implementation): fonts are self-hosted through
  `next/font/google`, which downloads and serves them from our own origin at
  build time — no `fonts.googleapis.com` request at runtime, verified against
  both build outputs.

> **Amended 2026-07-26 by [ADR 42](42-second-clock-set.md) and
> [ADR 45](45-third-clock-set.md).** The roster is no longer eighteen: a second
> sheet of twenty-two designs and a third of forty-six were implemented under
> the same contract. Every "18" in this document is a record of what the first
> set was, not a count of what ships — the count is `CLOCK_COUNT`, derived from
> the registry.

## Context

ADR 02 deferred the clock face to a "future ADR: custom clock UI" and shipped a
text display behind a props seam (`remaining`/`total`). That ADR has arrived:
the product owner supplied **18 clock designs** in `Pomodoro timer design
concepts.zip` (a design-canvas export: one HTML file of mockups + a driver
script). This ADR converts them to React components — **components and
Storybook only**. Wiring them into the app as a flip-through gallery, applying
the active clock's palette to the whole site, and the mobile "clock is the
first viewport" layout are the **next ADR (08: clock gallery)**; those
requirements are recorded there-bound, not silently absorbed here.

Sequencing note: the backend slides a third time (05 → 06 → 07 → now displaced
again). It is henceforth **unnumbered — "ADR: backend & sync", numbered only
when actually scheduled** — and ADRs 04/05/06 have been amended to say so, which
ends the renumber churn.

**Prerequisites: ADR 02 and ADR 03 Implemented** (the props seam and the
Storybook/test infrastructure). ADRs 04–06 are independent. The `session` prop
pairs with ADR 05's count at integration time; Storybook needs no ADR 05.

### Design inventory (from the zip — the mockup HTML is the visual spec)

| ID | Name | Mechanism | Native scheme | Shows session | Shows total |
|----|------|-----------|--------------|--------------|-------------|
| 1a | Halo | SVG progress ring + session dots | light | yes | no |
| 1b | Meridian | 60 tick marks light up | dark | yes | no |
| 1c | Broadside | giant typographic mm/ss + hairline bar | light | yes | no |
| 1d | Aurora | blurred glow blobs | dark | no | no |
| 1e | Mono | brutalist dashed ring + percent | dark | yes | no |
| 1f | Stack | 25 depleting slats | light | yes | no |
| 1g | Orbit | dual rings | light | yes | no |
| 1h | Field | rising fill, blend-mode text | light | no | no |
| 2a | Eclipse | occluding disc slides across | dark | no | no |
| 2b | Grid | 5×5 dot matrix fills | light | no | no |
| 2c | Terminal | CLI readout + ASCII bar | dark | yes | **yes** (`--focus Nm`) |
| 2d | Sunset | sun descends a gradient sky | dark | no | no |
| 2e | Pill | bold bar, blend-mode text | light | yes | no |
| 2f | Tide | liquid fill with wave edge | light | no | no |
| 2g | Split-flap | 4 flap digits | light | yes | no |
| 2h | Radar | conic sweep + needle | dark | yes | no |
| 2i | Bauhaus | rotating half-disc | light | yes | no |
| 2j | Edge | card-border stroke progress | light | yes | no |

12/18 display a session count; exactly one (Terminal) displays the total —
matching the product brief ("some require session… one requires the total").

## Decision

- **One React component per clock, 18 total, pure functions of their props.**
  No `Date.now()`, no internal timers — the display tick (ADR 02) drives them via
  props. Purity is what makes them storybookable at any frozen instant and
  cheap to test.
- **One shared props contract for all 18:**
  `{ remainingMs, totalMs, session, showSession, state }` (seconds until the
  2026-07-25 amendment).
  The brief says progress is "time left in seconds" — but a ring cannot draw an
  arc from remaining alone; every geometry needs the fraction
  `remaining/total`, so **the total is in the contract for all clocks and
  *displayed* only by Terminal**. A shared `clockProgress()` helper derives
  elapsed/remaining fractions once — 18 hand-rolled inversions is how
  off-by-one-direction bugs ship — and it is also where the two resolutions
  part: continuous fractions for geometry, whole seconds for digits and for
  discrete units (Meridian's 60 ticks, Grid/Stack dots, Terminal's bar). `state` is included now so paused/finished
  render sanely (static geometry, 00:00); per-state custom art is future
  polish, not required here.
- **Session display: driven by `session` + `showSession`; the toggle itself
  lives outside the clock area** (it ships in ADR 08's UI; here it's a prop and
  a Storybook control). The mockups' "2/4" pattern becomes **count-only** — the
  product has no session-target concept (ADR 05 deliberately didn't create
  one), so dot-style indicators fill to a per-design cap and text styles render
  the bare count. A daily-target concept, if ever wanted → future ADR.
- **Each clock exports a theme: `{ light: palette, dark: palette }`**, palette =
  page background + text/accent colors. This is the contract ADR 08 uses to
  repaint the whole site when a clock is active. **Every clock gets a designed
  rendition in both schemes** — 6 designs are natively dark, 12 natively light,
  and the counterpart scheme is real design work per clock (Terminal-on-paper,
  light Aurora…), priced into the sizing, not hand-waved.
- **Per-clock accent attributes are optional props with design defaults**
  (e.g. Halo's `#ff6b57`), exposed as Storybook controls. User-facing accent
  customization UI → future ADR if ever.
- **Components fill their container at any aspect ratio**: SVG designs scale by
  `viewBox`; DOM designs use container-query units off a registered container.
  The mockups' 340×460 card is a preview size, not a contract — ADR 08 will put
  these in a half-screen slot and a full-viewport mobile slot.
- **A `clocks.ts` registry** — `{ id, name, component, theme, showsSession,
  showsTotal }` per clock — is the single consumption point for ADR 08's
  gallery and for completeness tests.
- **Fonts (Space Grotesk, IBM Plex Mono, Archivo Black) self-hosted via
  `next/font`** — no third-party fetch on every load, no layout-shifting
  fallback swap, no font CDN dependency; and `@storybook/nextjs-vite` supports
  `next/font`, so Storybook renders identically.
- **The zip's mockup HTML is committed as reference** under
  `docs/design/clocks/` (it is the visual spec reviewers check components
  against); the zip itself is then removed from the repo root.

## Options considered

- **Skip the total, pass a precomputed fraction** — loses the mm:ss
  source of truth and Terminal's total display; two props that can disagree.
  Rejected.
- **Scale fixed-size cards with `transform: scale()`** — quick, but blurs
  nothing yet breaks blend-modes' stacking assumptions and makes touch-target
  math lie in ADR 08. Rejected for container-native sizing.
- **Keep Google Fonts CDN links** — a third-party fetch and FOUT on every load
  for fonts we can ship ourselves. Rejected.
- **One mega-component with 18 variants** — a `switch` the size of a file;
  per-clock components keep each design's CSS quirks quarantined. Rejected.
- **Invent a session target so "2/4" survives** — product decision by side
  effect of a mockup caption. Rejected; count-only.
- **Visual regression testing now** — still the ADR 03 call: revisit after the
  visual identity stabilizes; 18 clocks × 2 schemes of screenshot churn while
  designs are being adapted is the worst possible time. Rejected.

## Scope

### In scope

- 18 pure clock components implementing the shared contract, each with designed
  light + dark renditions and exported theme palettes.
- `clockProgress()` helper; shared use of ADR 02's mm:ss formatter (ceiling).
- `clocks.ts` registry.
- Fonts via `next/font`.
- One story per clock (controls: `remainingMs`, `totalMs`, `session`,
  `showSession`, `state`; canvas painted with the clock's own page background
  per scheme) + an all-clocks overview grid story.
- Tests per ADR 03's checklist precedent (list in outline).
- Reference mockups committed to `docs/design/clocks/`; zip removed.

### Out of scope

- Gallery UI, flip-through arrows, persistence of the chosen clock, applying
  the active palette to the site, the mobile first-viewport layout →
  **ADR 08: clock gallery** (requirements captured there per the product
  brief).
- Replacing ADR 02's text widget in the app — that swap *is* ADR 08.
- Per-state custom artwork, flip animations, spring physics → per-design
  polish, tracked as follow-ups, not blocking.
- Accent customization UI, daily session targets → future ADRs if wanted.
- Visual regression → unchanged ADR 03 position.

## Implementation outline

1. **Commit the spec**: extract mockup HTML + design-system CSS to
   `docs/design/clocks/`, delete the zip, note the mapping (id → component) in
   a short README there.
2. **Shared layer first**: `ClockProps` type, `clockProgress()` (elapsed &
   remaining fractions, clamped), registry skeleton, fonts via `next/font`,
   and a story template with the theme-painting decorator. **Gotcha:** the
   mockup driver treats `progress` as *elapsed*; our source of truth is
   *remaining*. Every design's fill direction gets decided once in the helper
   (`elapsedFraction` vs `remainingFraction`), never inline per component.
3. **Convert clocks in two batches** (1a–1h, then 2a–2j), each: component,
   both scheme renditions, story, registry entry. Known per-design gotchas:
   - **Blend-mode designs (Pill, Tide, Field)**: `mix-blend-mode: difference`
     needs `isolation: isolate` on the clock root or the text blends against
     the *site* background ADR 08 will paint behind it.
   - **Radar**: don't regenerate the conic-gradient every tick — rotate
     needle + trail with `transform` (compositor-cheap); a repainting gradient
     at frame rate is jank on old tablets.
   - **Aurora**: two full-size blur(50px) layers are GPU-expensive at
     viewport size; pre-blur as fixed-size layers, spot-check on a real tablet.
     Drift them with `transform`, not `left`/`right` (2026-07-25 amendment):
     an offset change re-rasterizes the blur, and it now moves every frame.
   - **Grid/Stack (25 units = 25 minutes)**: unit counts must derive from
     the total (e.g. one per minute, capped) — a 5-minute run showing 25
     dots is a lie. Layout must hold from 5 to 99 minutes; formatter caps at
     99:59.
   - **Split-flap**: static digits this ADR; the flip transition is polish.
4. **Tests** (behavior checklist):
   - Registry: exactly 18 entries, unique ids, every entry has component +
     light and dark palettes with defined colors + capability flags matching
     the inventory table (12 `showsSession`, 1 `showsTotal`).
   - Render matrix: every clock × `remaining ∈ {0, 1, ½·total, total}` ×
     `total ∈ {300, 1500, 3600, 5940}` renders without throwing.
   - Time text (where a clock shows one) equals ADR 02's shared formatter
     output — no clock grows its own mm:ss math.
   - `showSession=false` removes the session element for all 12 that have
     one; `session` value is reflected when shown.
   - Terminal renders `--focus Nm` from the run's total.
   - Purity: same props → identical markup across two renders.
5. **A11y pass**: ADR 03's addon must show no contrast violations for the time
   text against each clock's own background, both schemes — this is where the
   "designed dark/light rendition" claim gets verified, clock by clock.

Honest sizing: **3–4 days**. Roughly 1.5 h per clock (conversion + second
scheme + story) × 18, plus a day of shared layer, tests, and the a11y/contrast
fix loop. This is the largest ADR so far and it's all parallelizable by batch;
anyone who quotes "a day, they're just divs" hasn't done the second color
scheme for Terminal.

## Acceptance criteria

- [x] `docs/design/clocks/` contains the mockup HTML + a README mapping ids to components; the zip is gone from the repo root.
- [x] 18 components exist, one per inventory row; the registry exports exactly 18 entries whose capability flags match the inventory table.
- [x] Storybook shows one story per clock plus an all-clocks grid; every clock story exposes the five shared controls and renders correct geometry at remaining = 0, half, and full.
- [x] Flipping the Storybook scheme toolbar restyles every clock to its designed counterpart rendition (no clock is "dark-only with a white page slapped behind it" — background, ink, and accents all change per its exported palette).
- [x] The a11y addon reports no contrast violations for time text on any clock in either scheme.
- [x] Blend-mode clocks (Pill, Tide, Field) render correctly inside a story canvas painted an arbitrary color (isolation verified).
- [x] Grid and Stack show unit counts derived from the total (5-minute run ≠ 25 dots); all clocks hold their layout at 99:59.
- [x] With `showSession` off, no session element renders on any clock; on, the count (no "/target") appears on the 12 flagged clocks.
- [x] Terminal shows `--focus Nm` matching the run's total.
- [x] No clock component references `Date.now`/`new Date` (grep clean); the purity test passes.
- [x] (2026-07-25 amendment) Geometry moves *inside* a second: with a run going in Chromium, sampling every animation frame for ~700–900 ms gives a distinct value per frame — Halo's ring offset 54/55, Aurora's glow transform 42/43, Radar's needle rotation 42/43 — while the mm:ss text still changes exactly once.
- [x] Fonts load via `next/font` — no `fonts.googleapis.com` request in the app or Storybook network panel.
- [x] `npm test`, `npm run build`, `npm run build-storybook` all green.

## Consequences

- ADR 08 becomes assembly: a registry to iterate, a theme contract to apply to
  the page, and components that already fit any container — the gallery ADR
  inherits zero design work.
- The site's entire visual identity becomes clock-driven; the theme-palette
  contract here is what makes "the website reacts to whichever is active"
  possible without 18 special cases later.
- 18 components is real surface: the registry completeness test and shared
  helpers are what keep it from aging into drift.
- The backend & sync ADR is now unnumbered until scheduled — cross-reference
  churn ends; the CLAUDE.md index is the only place that assigns numbers.
- We own 36 designed renditions (18 × 2 schemes); any future rebrand touches
  the palette exports, not the geometry.
