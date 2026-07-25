# ADR 10: Hidden header drawer

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-24 — the Settings placeholder is superseded: **ADR 19**
  fills the modal (Todoist log out/in, near-full-size layout); this ADR's
  "placeholder text" criterion applies only until 19 lands.

- Deviation (2026-07-24, implementation): Mantine's Drawer/Modal close buttons
  ship without an accessible name; both are given explicit `aria-label`s, which
  the a11y gate demanded.
- Deviation (2026-07-24, implementation): the Storybook preview now applies the
  chrome tokens to `document.documentElement` as well as the story canvas —
  drawers and modals render through portals at `document.body`, outside the
  canvas, and were rendering untokenised.
- Deviation (2026-07-24, implementation): drawer and modal transitions are
  zero-duration, matching the New day popover — an animating opacity makes both
  the a11y snapshot and the interaction tests flaky.
- Deviation (2026-07-24, implementation): the "no layout shift" criterion is
  verified by the arrow occupying the same fixed corner slot the ADR 02 toggle
  did (same footprint class), plus the ADR 09 layout-contract test — not by a
  screenshot diff, which ADR 03 deliberately does not have.

## Context

Product direction (2026-07-23): the app gets a header that is **hidden by
default**, opened by an **arrow in the top-right corner**; on open it **slides
in from the right edge** ("slides to the left" into view) and contains a
**GitHub link with icon** (`https://github.com/ioandev/glu`), a **light/dark
mode button**, and a **Settings entry** that opens a Mantine modal containing
placeholder text only.

Two standing facts shape this:

- The top-right *corner* is contested real estate: ADR 02 parked the theme
  toggle there with an explicit "moves when something needs the corner" note.
  Something now needs the corner — and the brief puts theming inside the
  header anyway. **This ADR relocates ADR 02's corner toggle into the drawer**
  (ADR 02 amended with a pointer). The top-right *region* stays reserved for
  Todoist; the drawer overlays and the arrow is a corner affordance, same
  footprint class as the toggle it replaces.
- The layout contract is `100dvh`, no page scroll (ADR 02). A conventional
  always-visible header row would tax vertical space on a tablet forever to
  host three rarely-used actions — hidden-by-default is the right product
  call, and overlay (not layout) is the right technical one.

**Prerequisites: ADR 02 and ADR 03 Implemented.** Independent of 04–09; if
ADR 09 is implemented at build time, this ADR's E2E flow block activates as
part of its definition of done (the ADR 09 ratchet).

Version verified against npm on 2026-07-23: `@tabler/icons-react` **3.45.0** —
this ADR introduces the project's first icon dependency.

## Decision

- **We will build the header as a Mantine `Drawer`, `position="right"`,**
  toggled by a corner `ActionIcon` chevron. A Drawer overlays via portal — it
  consumes zero layout height, so the timer/toggles/reservation geometry is
  untouched and the no-scroll contract holds. It also ships focus trap,
  Escape-to-close, and overlay-click-to-close for free; hand-rolling a sliding
  panel means hand-rolling exactly those three things badly.
- **The arrow is the only permanently visible affordance**: a ≥44 px
  `ActionIcon` in the extreme top-right corner, chevron pointing left
  ("something slides in from here"); while open, the drawer closes via the
  standard trio (close button, overlay, Escape). Open state is **ephemeral
  React state — never persisted**: "hidden by default" means every load,
  including reloads mid-session; the `glu:v2` blob stays free of UI chrome
  state.
- **Drawer contents, top to bottom:**
  1. **GitHub link** — `IconBrandGithub` + label, `href`
     `https://github.com/ioandev/glu`, `target="_blank"`,
     `rel="noopener noreferrer"`. A plain external `<a>`; `next/link` buys
     nothing off-site and the basePath is irrelevant to absolute URLs.
  2. **Theme button** — the relocated ADR 02 toggle: same
     `useMantineColorScheme` mechanics, same Mantine localStorage persistence,
     now a full-width row with icon + label (a labeled row in a menu beats an
     icon-only corner button for discoverability).
  3. **Settings entry** — opens a Mantine `Modal` containing placeholder text
     only. The modal is the *socket*; settings content is explicitly a future
     **ADR: settings** (likely consumers already queued: ADR 07's deferred
     accent customization, alert preferences when session-end alerts land).
- **We will add `@tabler/icons-react`** (chevron, brand-github, sun/moon,
  settings) — the Mantine-ecosystem convention, tree-shakeable per-icon
  imports. One icon library, recorded here; future ADRs use it rather than
  adding a second.
- **Keyboard interplay recorded, not changed**: Mantine handles Escape for
  drawer and modal. ADR 06's `s`/`p`/`n`/`Ctrl+C` remain active while the
  drawer or modal is open (they target no input) — a running timer stays
  controllable with chrome open; this is a feature, not a leak. No new
  shortcuts (any addition goes through an ADR 06 amendment, per its rule).
- **The timer does not care that chrome exists**: drawer and modal must not
  mount/unmount the timer tree or interrupt the 50 ms tick — they render
  through portals beside it, not around it.

## Options considered

- **Mantine `AppShell` with collapsible header** — an always-reserved header
  slot fights the 100dvh no-scroll contract and drags in shell layout we
  don't need for three actions. Rejected.
- **Hand-rolled sliding panel (transform/transition)** — re-implements focus
  trap, Escape handling, scroll lock, and overlay dismissal that `Drawer`
  ships. Rejected.
- **`Menu`/`Popover` from the arrow** — cheaper, but a popover reads as
  transient; the brief describes a sliding surface ("navbar slides"), and a
  drawer scales to the settings-heavy future without another rework. Rejected.
- **Keeping the corner theme toggle and adding the drawer** — two theming
  controls, one of them squatting on the arrow's corner. Rejected; relocated.
- **Persisting drawer-open state** — contradicts "hidden by default" and
  pollutes the versioned blob with chrome state. Rejected.
- **`@iconify`/`react-icons` instead of Tabler** — fine libraries, but Tabler
  is the Mantine-documented pairing with consistent stroke geometry alongside
  Mantine components. Rejected.

## Scope

### In scope

- Corner arrow toggle + right-side `Drawer` with the three entries.
- Relocation of the theme toggle (corner `ActionIcon` removed; ADR 02 amended
  with a forward pointer).
- Settings `Modal` with placeholder text.
- `@tabler/icons-react` dependency.
- Stories (drawer closed / open / modal open, both viewports, both schemes),
  unit/story tests per ADR 03's checklist precedent, and the ADR 09 E2E flow
  block (skipped-with-reason until 09 is implemented; active otherwise).

### Out of scope

- Any actual settings content, persistence, or schema → materialized as
  **ADR 19** (auth-only v1; further sections arrive as amendments there).
- Additional header entries (history, stats, about) → their own ADRs when
  their features exist.
- New keyboard shortcuts for drawer/settings → ADR 06 amendment if ever.
- Navigation/routing — the app remains one screen; the drawer is chrome, not
  a router.
- Todoist area — the reservation is untouched by the overlay.

## Implementation outline

1. **`HeaderDrawer` component** — `Drawer` `position="right"`, size ~300 px
   (full-width at the half-tablet breakpoint feels right below `sm` — check
   both), corner `ActionIcon` with chevron. **Gotcha:** Mantine Drawer's
   default `zIndex` and the corner arrow's need coordinating — the arrow must
   stay tappable *under* the opened drawer's overlay or the UI needs the
   drawer's own close affordance; simplest is letting the overlay own closing
   and not fighting z-index.
2. **Entries** — external GitHub anchor (`noopener noreferrer` — new-tab
   without it is a tab-nabbing vector, even on a personal app); theme row via
   `useComputedColorScheme` for the icon (same SSR-safe render-after-mount
   care as ADR 02's step 7 — the gotcha moves with the toggle); Settings
   entry + `Modal` with placeholder copy. All rows ≥44 px.
3. **Remove the corner theme toggle** from ADR 02's shell; verify no
   double-registration of anything theme-related remains.
4. **Stories + tests** — stories for the three states; tests: arrow opens
   drawer, all three entries present, GitHub href/target/rel exact, theme
   switch from drawer flips scheme and persists (reuse ADR 03's pattern),
   modal opens/closes, drawer closed after simulated reload (fresh mount
   defaults closed), timer tick uninterrupted across open/close (assert
   remaining keeps decreasing with drawer open). **Gotcha:** Drawer/Modal
   render in portals — RTL queries need `within(screen.getByRole('dialog'))`
   or baseElement scoping, the classic portal-test stumble.
5. **E2E flow block** (ADR 09 suite): open drawer → assert GitHub link
   attributes; toggle theme → reload → theme kept, drawer closed; open
   Settings modal → Escape closes. Skipped-with-reason until 09 runs.

Honest sizing: **~1 day.** The drawer itself is two hours; the toggle
relocation, portal-aware tests, and dual-scheme/dual-viewport stories are the
rest. Nothing here is risky; it's all discipline work.

## Acceptance criteria

- [x] On load (and after any reload), no header is visible; the only new chrome is a ≥44 px arrow `ActionIcon` in the extreme top-right corner; timer, toggles, and reserved space render exactly as before (no layout shift — compare screenshots).
- [x] Tapping the arrow slides a panel in from the right edge; it contains exactly three entries: GitHub, theme, Settings.
- [x] The GitHub entry shows a GitHub icon, navigates to `https://github.com/ioandev/glu` in a new tab, and carries `rel="noopener noreferrer"`.
- [x] The theme entry switches dark/light instantly; the choice survives reload; no theme control exists outside the drawer anymore.
- [x] Settings opens a Mantine modal containing placeholder text (until ADR 19 fills it later in the same run); it closes via Escape, overlay click, and its close button.
- [x] The drawer closes via overlay click and Escape; after reload it is closed regardless of prior state.
- [x] With the drawer or modal open, a running timer keeps counting (visible on close) and ADR 06 hotkeys still act on the timer.
- [x] All drawer/modal interactive elements are ≥44 px; both schemes are legible; the a11y addon reports no contrast violations on the new stories.
- [x] Stories exist for drawer-closed, drawer-open, and modal-open at both viewports; unit/story tests for the checklist in outline step 4 pass.
- [x] The ADR 09 flow block exists and is active and green (five tests in `e2e/features.spec.ts`).
- [x] `npm test`, `npm run build`, `npm run build-storybook` all green.

## Consequences

- The app gains its chrome surface: future needs (settings content, history,
  about) have a home that costs zero pixels until summoned — and each addition
  is an ADR, or the drawer becomes a junk drawer.
- The settings *socket* exists ahead of settings *content*; the future
  settings ADR starts from an open modal, not from UI archaeology.
- Theme control moves behind one tap. Accepted trade: theming is a
  set-and-forget action, and `auto` + persistence (ADRs 01/02) means most
  sessions never touch it.
- ADR 02's corner-toggle decision is partially superseded (placement only;
  mechanics unchanged) — recorded in both files, so neither reads as drifted.
- `@tabler/icons-react` becomes the project's icon vocabulary; mixing icon
  sets later will look wrong before it reads as wrong in review.
