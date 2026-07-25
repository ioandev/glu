# ADR 15: App chrome design system — three switchable directions

- Status: Implemented (deviations noted)
- Date: 2026-07-24
- Amended: 2026-07-24 — Tailwind v4 joins as a utility layer (ADR 01
  amendment). **Token law extends to utility classes**: shape/material/color
  utilities must reference the chrome/clock CSS variables (v4 var shorthand,
  e.g. `bg-(--glu-surface)`, `rounded-(--glu-radius-control)`) — no parallel
  palette in Tailwind's `@theme`, no hardcoded design values in class names.
  Spacing/layout utilities (flex, grid, gaps, margins) are free. The review
  test is unchanged and now explicitly covers Tailwind classes: if it doesn't
  change when the chrome switches, and it's shape/material/color, it's a
  defect.
- Amended: 2026-07-25 — **the pre-paint bootstrap takes a CSP nonce and
  allowlists both ids it reads** (security audit F-2/F-10, ADR 16 amendment).
  This ADR's required inline script is one of the two that ADR 16's
  `script-src 'self'` would have blocked; `ChromeBootstrap` now accepts a
  `nonce` prop and puts it on both the `<style>` and the `<script>` — each with
  `suppressHydrationWarning`, because a header-delivered CSP blanks the `nonce`
  attribute in the DOM and hydration reads that as a mismatch (ADR 16
  amendment). Separately, the script validated `chromeThemeId` against the chrome
  allowlist but took `activeClockId` on nothing but a `typeof` check, despite
  the comment claiming both fell back. The blob is hand-editable, so both are
  allowlisted now — and `data-clock`'s default comes from
  `DEFAULT_CLOCK_ID` rather than a hardcoded `'halo'`.

- Deviation (2026-07-24, implementation): the Mantine override slice is
  expressed as **CSS variable remaps** (`--mantine-color-body`,
  `--mantine-primary-color-filled`, `--mantine-radius-default`, shadows) inside
  the chrome token block, not as a JS theme object. Same effect, no re-render,
  and it cannot flash.
- Deviation (2026-07-24, implementation): the token space is emitted as a
  **static stylesheet** keyed on `[data-chrome][data-clock]`, with a tiny
  bootstrap script setting those two attributes before first paint. That is what
  makes "no flash" structural rather than a render-gate, and keeps the
  scheme flip pure CSS via `light-dark()`.
- Deviation (2026-07-24, implementation): `surface.alpha`/`strongAlpha` became
  per-scheme. A single alpha meant the dark schemes painted *light* surfaces and
  the contrast matrix caught it — dark surfaces are a small lift off the base,
  which is what the mockups' dark panels actually are.
- Deviation (2026-07-24, implementation): the a11y matrix is a **unit test over
  the mix function** (`src/chrome/chrome.test.ts`) rather than 108 Storybook
  screenshots. Flattening the alpha surfaces to opaque colours is what makes
  every pair contrast-checkable; the addon still gates the rendered stories.
- Deviation (2026-07-24, sequencing): the build order puts this ADR before
  ADR 07 (clock palettes) and before the overlays' owning ADRs (05/10/13/14), so
  the 18-palette sweep and the four overlay stories were completed later in the
  same run, once those ADRs landed. See the criteria below.

## Context

Claude Design delivered `Three app design directions.zip` (mockup HTML +
reference PNG): three complete chrome treatments of the whole app — tablet,
phone, and all four overlays each — with **minimal, systematic differences**
(radius, borders, elevation, label typography). Product decision: **this is
what the app uses**, built as **three selectable design modules** that each
expose their preferences (corner style, backgrounds per scheme, and the other
axes inventoried below).

The three directions, as delivered:

| ID | Name | Demo palette | Signature |
|----|------|-------------|-----------|
| 1a | **Studio Quiet** — "the safe one" | Tide | translucent surfaces, hairline borders, 12–16 px radii, soft shadows, sentence case |
| 1b | **Instrument** | Terminal | square corners, 1 px ruled panels, zero elevation, UPPERCASE mono labels, rows-with-rules, square dots |
| 1c | **Poster** | Pill | 2 px ink borders, pill radii, hard offset shadows (`4px 4px 0`), Archivo Black display moments |

Two clarifications the mockups themselves prove:

- **The clock renderings inside the mockups are illustrative, not spec** —
  ADR 07's components are canonical (1b's Terminal mockup even mislabels the
  `n` hotkey as "new day"; ADR 06 says new timer). Where mockup and
  `docs/design/clocks/` disagree, ADR 07 wins. (ADR 07 amended with this
  note.)
- **Each direction was deliberately painted with a different clock palette**
  — demonstrating the intended two-layer model: the chrome direction sets
  *shape and material*; the active clock still sets *color family* (ADR 08).

**On numbering ("ADR 00?"):** rejected, recorded. ADR numbers are
identities, not build order — 00 would claim to precede the scaffold (01)
and Storybook (03) it requires. The user's real goal — **UI out early** — is
met by the **build order** now recorded in CLAUDE.md:
01 → 02 → 03 → **15** → 05 → 06 → 07 → 08 → 04 → 09 → 10 → 11–14. Earlier
UI-bearing ADRs (02 foremost) are amended to state their visuals are
**interim — functional, not perfect**; this ADR is the visual authority.

**Prerequisites: ADRs 01, 02, 03 Implemented.** Everything later consumes
chrome tokens as it lands (each ADR's components pick them up at its own
implementation time; nothing later blocks this one).

## Decision

### The module contract

- **Three chrome modules — `studio-quiet`, `instrument`, `poster` — in a
  registry mirroring the clock registry pattern** (ADR 07), each exporting a
  `ChromeTheme`:
  - `id`, `name`;
  - **`background: { light, dark }`** — the page base per scheme (the
    user-requested exposure; from the mockups: Studio Quiet
    `#e9f2f1`/`#0b1e1f`-family, Instrument `#eef4ec`/`#060d08`-family,
    Poster `#f6ecc7`/`#17120a`-family);
  - **`radius` scale** (control / card / pill: e.g. 12–16 px vs 0 vs
    22–30 px);
  - **`border`** (width 1|1|2 px + style: alpha-hairline / solid rule /
    solid ink);
  - **`elevation`** (`soft` shadows / `none` / `offset` hard shadows);
  - **`surface` formula** — alpha fills over the page base (the mockups
    build surfaces as `rgba(white|ink, α)`, which is what makes them
    palette-portable);
  - **`labels`** (sentence-case Grotesk / uppercase letter-spaced mono /
    Archivo-Black-display + bold body);
  - **`controlShape`** (rounded / square / pill) and **`dotShape`**
    (circle / square — the session dots differ per direction);
  - a Mantine theme override slice (radius defaults, shadows, headings) so
    Mantine components inherit the direction without per-component props.
- **Applied exactly like clock palettes**: a `data-chrome` attribute at the
  app-shell root maps the module to CSS variables; components consume
  variables, never module objects. One mechanism (ADR 08's), two layers.

### Two-layer theming, reconciled with ADR 08

- **The chrome module owns shape, material, and the page-base pair; the
  active clock's palette owns the color family** — accent and tint — applied
  *through* the chrome's tokens (surfaces are alpha formulas over the mixed
  base, so they follow automatically). ADR 08's "the clock repaints the
  page" is amended to "…through the active chrome's background tokens".
  Requirement, not formula: the result must read as *both* — recognizably
  the clock's palette family and recognizably the chrome direction — in both
  schemes; the exact mix is an implementation detail behind one function.
- **Selection**: additive blob field `chromeThemeId`, default
  **`studio-quiet`** (the design doc's own "safe one" label). **No selection
  UI in this ADR** — it joins the settings modal in the future settings ADR
  (socket: ADR 10); until then Storybook's toolbar switches chromes, and the
  app renders the default. Cut on sight, recorded.

### What earlier ADRs give up to this one

- **ADR 02's visual criteria become interim** (amended): it ships
  functional, plain UI; polish judgments transfer here. Same standing for
  every UI surface ADRs 05/10/12/13/14 describe — their *behavioral*
  criteria stand untouched; their look is chrome-token business.
- **Contrast duty, priced honestly**: 3 chromes × 2 schemes × 18 clock
  palettes is 108 combinations. The a11y gate: full 18-palette sweep on the
  **default chrome**, plus all three chromes against the **three extreme
  palettes** (darkest, lightest, most saturated — pick once, name them in
  the stories). The alpha-formula surfaces make the middle interpolate;
  exhaustive 108-story CI is screenshot churn for no marginal signal.
  Recorded as a known bound, not a silent cap.

## Options considered

- **Ship one direction (Studio Quiet), archive the others** — cheaper, but
  the brief explicitly wants the modules and their exposed preferences;
  the token contract costs little once one direction is tokenized. Rejected.
- **ADR 00 numbering** — identities aren't schedules; build order lives in
  the index. Rejected, recorded in Context.
- **Three full Mantine themes instead of a token layer** — forks the design
  system three ways and still doesn't cover the custom components; tokens +
  a thin Mantine override slice covers both. Rejected.
- **Free-form CSS per direction (no shared contract)** — three diverging
  stylesheets nobody can diff; the whole point of "minimal changes between
  them" is a shared axis list. Rejected.
- **Selection UI now (quick toggle in the header drawer)** — ADR 10's drawer
  is specced chrome; adding entries there is an ADR 10 amendment nobody
  briefed. Rejected → settings ADR.
- **Using the mockups' clock renderings** — explicitly ruled out by the
  brief; ADR 07 components are canonical. Not pursued.

## Scope

### In scope

- The `ChromeTheme` contract, three modules with values transcribed from
  the mockups, registry + completeness tests.
- CSS-variable application layer (`data-chrome`), Mantine override slices,
  the palette-mix function meeting the two-layer requirement.
- Skinning of every existing chrome surface to consume tokens (whatever is
  implemented at build time per the build order — at minimum ADR 02's UI;
  later ADRs consume tokens as they land).
- `chromeThemeId` persistence (additive, default `studio-quiet`); Storybook
  toolbar chrome switcher (joins the existing scheme toolbar).
- Stories: per-direction composites (tablet + phone) and the four overlays,
  per the mockups; the a11y matrix defined above.
- Committing the mockup HTML + reference PNG to `docs/design/chrome/`
  (spec of record, like `docs/design/clocks/`), zip removed from the root.

### Out of scope

- Chrome selection UI → the **ADR 19** settings surface, via a future
  amendment there (19's v1 is Todoist-auth-only).
- New behaviors glimpsed in mockups but never briefed (e.g. Today/Later
  list grouping labels are the mockup's fixture styling of ADR 12's section
  headers, not new grouping logic).
- A fourth direction / user-custom chrome → future ADR if ever.
- Motion/transition language per direction → future amendment if briefed.
- Retrofitting mockup-perfect pixel details onto ADR 02's interim UI before
  this ADR lands — the amendments exist precisely so nobody polishes twice.

## Implementation outline

1. **Commit the spec**: extract mockups to `docs/design/chrome/` with a
   README mapping 1a/1b/1c → module ids; delete the zip.
2. **Token contract first**: `ChromeTheme` type, the three modules
   transcribed from the mockup CSS (radii, border widths, alphas, shadows,
   label treatments, dot shapes, background pairs), registry +
   completeness test. **Gotcha:** transcribe the *system*, not the pixels —
   every mockup value should collapse into one of the token axes; a value
   that doesn't fit the contract is a contract bug to fix now, not a
   one-off style to smuggle.
3. **Application layer**: `data-chrome` → CSS variables at the root beside
   ADR 08's palette variables; the mix function (chrome base × clock
   palette × scheme); Mantine override slice per module. **Gotcha:** the
   scheme-flash discipline from ADR 01 applies to chrome too — `data-chrome`
   must be set before first paint (it's in the persisted blob; render-gate
   the same way the color scheme is handled, or the default chrome flashes).
4. **Skin the surfaces**: replace ADR 02-era hardcoded styles with token
   consumption; verify each of the four overlay mockups against its story.
   **Gotcha:** Poster's offset shadows and Instrument's zero-radius square
   switches are where Mantine defaults fight back — override at the theme
   slice, not with per-component `style` props, or the fourth direction
   someday costs a rewrite.
5. **Stories + a11y matrix** per scope; Storybook chrome toolbar.
6. **Blob field + default**; confirm no selection UI leaks in.

Honest sizing: **4–5 days.** One day for the contract + transcription, one
per direction to skin and verify against its mockup, one for the matrix,
stories, and the mix-function tuning. The mockups being systematic is what
keeps this from being three rebrands.

## Acceptance criteria

- [ ] `docs/design/chrome/` holds the mockup HTML + PNG + mapping README; the zip is gone from the repo root.
- [ ] The chrome registry exports exactly three modules; each exposes `background.{light,dark}`, radius scale, border, elevation, surface formula, label treatment, control/dot shape — verified by a completeness test against the contract type.
- [ ] Switching chrome in Storybook restyles every chrome surface with **no component-level code changes** (tokens only): corner radii, borders, elevation, label case/family, and session-dot shape all change per the inventory table.
- [ ] Each direction's tablet composite story matches its mockup on the systematic axes (side-by-side review against `docs/design/chrome/`); clocks inside the composites are ADR 07 components, not mockup lookalikes.
- [ ] The four overlay stories (header drawer, task detail, undo bar, New day popover) exist per direction and match their mockup panels.
- [ ] With a clock palette active, the page reads as that palette family *and* that chrome direction, in both schemes (spot-check the three demo pairings from the mockups: Studio Quiet × Tide, Instrument × Terminal, Poster × Pill).
- [ ] The a11y matrix passes: default chrome × 18 palettes × 2 schemes, plus all three chromes × the three named extreme palettes × 2 schemes — zero contrast violations.
- [ ] `chromeThemeId` persists; unknown value falls back to `studio-quiet`; first paint after reload shows the persisted chrome with no flash (throttled-load check).
- [ ] No chrome-selection UI exists in the app; Storybook toolbar is the only switcher.
- [ ] `npm test`, `npm run build`, `npm run build-storybook` green; ADR 09 E2E block (chrome persistence + no-flash) active-or-skipped-naming-09.

## Consequences

- The app's look is now data: a fourth direction is a module, a rebrand is
  a transcription, and "which chrome" becomes a settings row when that ADR
  lands.
- Every future UI ADR inherits a hard rule: **style through chrome tokens,
  never hardcode** — reviews get a one-line test ("does it change when the
  chrome does?").
- Theming is now three-dimensional (chrome × clock palette × scheme). The
  named-extremes a11y strategy is the cost control; if a real combination
  breaks in use, it becomes a named extreme.
- ADR 02's era of "functional, not perfect" is officially sanctioned — and
  officially temporary. The build order makes this the fourth thing built,
  so the plain phase is measured in days.
- We own the three directions as living code; the mockup HTML in
  `docs/design/chrome/` is the tie-breaker when a skinning question has no
  token answer.
