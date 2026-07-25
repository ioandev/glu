# ADR 01: Next.js + Mantine project setup

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-23 — browser-tab favicon wired from the repo's `img/` assets
  (`img/favicon.svg` is the mark's source of truth); PWA-grade icon sets remain
  ADR 04's.
- Amended: 2026-07-24 — **"no Tailwind" reversed by owner decision: Tailwind
  v4 (4.3.3) joins as a utility layer on top of Mantine, used when needed.**
  Coexistence guardrails: **no preflight** (Mantine owns base/reset — import
  Tailwind's theme + utilities layers only), Mantine imported via
  `styles.layer.css` with explicit `@layer mantine, utilities;` order so
  utilities can override components when both apply, and design values in
  utility classes come from the ADR 15 token variables, never hardcoded.
- Amended: 2026-07-25 — `app/icon.png` is **no longer a copy of the 508×523
  `img/favicon.png`**: it is generated square (64 px) from `img/favicon.svg` by
  ADR 04's `scripts/generate-icons.mjs`, as this ADR anticipated ("acceptable
  … until ADR 04's square icon set replaces the fallback"). `app/icon.svg`
  stays a hand-maintained copy — it carries the dark-scheme ink swap. Also
  recorded here because it is this ADR's decision that was broken: **a
  `metadata.icons` key overrides the icon file convention entirely**, so ADR
  04's later `icons: { apple }` deleted both `<link rel="icon">` tags. Icons
  ship as files; nothing declares them in `metadata`.
- Amended: 2026-07-25 — **`ColorSchemeScript` takes a CSP nonce** (security
  audit F-2, ADR 16 amendment). This ADR's "wire it at setup time or ship a
  flash" decision means an inline script in `<head>`, which ADR 16's
  `script-src 'self'` would have blocked outright. `RootLayout` is now `async`
  and reads the per-request nonce that `web/src/middleware.ts` sets, passing
  it to `ColorSchemeScript` and to ADR 15's `ChromeBootstrap`. The
  colour-scheme behaviour and `mantineHtmlProps` hydration fix are unchanged.

- Deviation (2026-07-24, implementation): `create-next-app` refuses a non-empty
  directory, so the scaffold was generated in a temp dir and copied in — same
  output, one extra step. `src/` layout was taken (ADR 03 expects `src/theme.ts`),
  so the icon convention files live at `src/app/icon.{svg,png}`.
- Deviation (2026-07-24, implementation): the placeholder page is served from
  `src/app/page.tsx`; ADR 02 replaced it in the same run.

## Context

GLU (PLAN.md) is a tablet-first pomodoro/tracker served at `ioan.dev/glu`, frontend
in Next.js with Mantine, Express backend at `/api` arriving no earlier than ADR 04/05.
Nothing exists yet except PLAN.md — this ADR bootstraps the project so ADR 02 (UI)
starts from a working, correctly-configured app instead of fighting setup issues
mid-feature.

Two constraints are day-one, not deploy-time:

1. **`basePath: '/glu'`** — the app lives under a subpath. Retrofitting a basePath
   later breaks every hardcoded asset URL and every bookmark; it goes in now.
2. **SSR-safe color scheme** — dark/light is a first-class requirement (ADR 02).
   Mantine's `ColorSchemeScript` must be wired at setup time or we ship a
   flash-of-wrong-theme and hydration warnings that are tedious to hunt down later.

Versions verified against the npm registry on 2026-07-23:
Next.js **16.2.11**, React **19.2.8**, Mantine **9.4.2**, TypeScript latest is
**7.0.2** (see Decision), local Node **v25.9.0** (meets Next 16's Node ≥ 20.9).

## Decision

- **We will scaffold Next.js 16 (App Router, TypeScript) at the repo root** with
  `create-next-app`, **accepting Tailwind** (per the 2026-07-24 amendment).
  Mantine remains the component and design system; Tailwind v4 is a utility
  layer for layout/spacing one-offs where a `style` prop or CSS module would
  be noisier — **utilities and theme layers only, no preflight**: Tailwind's
  reset fighting Mantine's component styles is exactly the "two systems
  fight" failure the original rejection predicted, and skipping preflight is
  what removes it.
- **We will set `basePath: '/glu'` in `next.config.ts` from the first commit.**
  `basePath` alone covers `/_next/*` assets, `next/link`, and `next/image`; no
  separate `assetPrefix` is needed unless a CDN appears (it hasn't).
- **We will install Mantine 9.4.x** (`@mantine/core`, `@mantine/hooks`) with the
  documented PostCSS setup (`postcss-preset-mantine`, `postcss-simple-vars`,
  Mantine breakpoint variables) — Mantine's responsive styles silently break
  without the breakpoint vars.
- **We will wire the root layout per Mantine 9 docs**: Mantine styles imported
  as **`@mantine/core/styles.layer.css`** (the `@layer mantine` build — so an
  explicit `@layer mantine, utilities;` order lets Tailwind utilities win when
  both target an element; unlayered Mantine CSS would silently beat every
  utility), `mantineHtmlProps` on `<html>`, `<ColorSchemeScript />` in
  `<head>`, `MantineProvider` wrapping children — with
  `defaultColorScheme="auto"` on both script and provider so the app respects
  the OS scheme from day one. ADR 02 adds the user-facing toggle on top of
  this foundation.
- **We will stay on the TypeScript 5.x line that `create-next-app` pins**, not
  npm-latest 7.0.2. TS 7 is the new native-compiler major; Next.js plugin and
  editor tooling compatibility is unproven, and a bootstrap ADR is the wrong place
  to absorb that risk. Revisit when Next.js officially supports it.
- **We will use npm** as the package manager. No lockfile or team convention exists
  to honor; npm requires zero extra tooling on any machine that has Node.
- **We will ship the GLU favicon via the App Router icon file convention** —
  `img/favicon.svg` copied to `app/icon.svg` (plus `img/favicon.png` as
  `app/icon.png` fallback). The convention emits the link tags with the basePath
  applied; a hand-written `<link href="/favicon.ico">` would silently miss
  `/glu`. `img/` stays the source of truth. (Amended 2026-07-25: the PNG
  fallback is now generated square from the SVG by ADR 04's script rather than
  copied from the 508×523 `img/favicon.png`, and the convention is the *only*
  icon mechanism — see the amendment note above.)
- **We will keep `create-next-app`'s default ESLint setup** (Next 16 removed
  `next lint`; the scaffold configures ESLint directly). No Prettier/Biome debate
  now — formatting tooling can ride along with ADR 03 if wanted.
- **We will initialize git** with the scaffold's `.gitignore`.

## Options considered

- **Tailwind alongside Mantine** — originally rejected ("two styling systems
  fighting over global styles"); **reversed by owner decision 2026-07-24**
  with the fight surgically removed: no preflight, layered imports, tokens
  as the only design-value source. Adopted as a utility layer.
- **Pages Router** — App Router is the default and only sensible choice for a new
  Next 16 app; Mantine 9 docs target it. Rejected.
- **Monorepo layout now (`apps/web`, `apps/api`)** — no backend exists until
  ADR 04/05; restructuring a two-package repo later is an hour of work, while a
  premature monorepo taxes every command until then. Rejected; revisit in the
  backend ADR.
- **TypeScript 7.0** — newest ≠ safest for a compiler major released weeks ago.
  Rejected for now (see Decision).
- **pnpm** — marginally faster installs, one more tool to install everywhere the
  tablet-dev workflow touches. Rejected.

## Scope

### In scope

- `create-next-app` scaffold (TypeScript, App Router, ESLint, no Tailwind,
  `@/*` import alias) at the repo root.
- `next.config.ts` with `basePath: '/glu'`.
- Mantine 9.4.x install + PostCSS config + root layout wiring, `defaultColorScheme="auto"`.
- A minimal placeholder page rendering at least one Mantine component (proves
  styles load under the basePath; it is not the ADR 02 UI).
- Page `<title>`/metadata set to "GLU"; browser-tab favicon from `img/` via
  `app/icon.svg` + `app/icon.png`.
- Git init + initial commit.

### Out of scope

- Any pomodoro/environment-toggle UI, layout halves, theming beyond `auto` → **ADR 02**.
- Storybook, tests, formatting tooling → **ADR 03**.
- PWA manifest/service worker → **ADR 04**.
- Express backend, `/api` anything → **ADR 04/05**.
- Deployment / reverse-proxy config for `ioan.dev` → future **ADR: Deployment**.
- Todoist integration → future ADR per PLAN.md.

## Implementation outline

1. Run `create-next-app@latest` in the repo root (it tolerates existing non-conflicting
   files like PLAN.md): TypeScript yes, ESLint yes, Tailwind **yes** (v4, per
   amendment), App Router yes, Turbopack default is fine, alias `@/*`.
2. Strip scaffold cruft: default page content, template CSS beyond a bare
   `globals.css`, unused SVGs in `public/`, and the scaffold's default
   `app/favicon.ico`.
3. Add `basePath: '/glu'` to `next.config.ts`.
   **Gotcha:** with a basePath, `http://localhost:3000/` 404s — the app is at
   `/glu`. Expected, not a bug. **Gotcha:** plain `<img src="/foo.png">` and
   hand-built URL strings do *not* get the prefix; only `next/link`, `next/image`,
   and router APIs do. Rule for the codebase: never hardcode a root-relative URL.
4. `npm i @mantine/core @mantine/hooks` and
   `npm i -D postcss postcss-preset-mantine postcss-simple-vars`.
5. Create `postcss.config.cjs` with `postcss-preset-mantine`, the five Mantine
   breakpoint variables (36/48/62/75/88em), **and `@tailwindcss/postcss`
   chained alongside** (they process different syntax; order: Mantine preset
   first). **Gotcha:** the `.cjs` extension matters in an ESM-mode package;
   and if this file is missing, everything *looks* fine until the first
   responsive style silently no-ops. **Gotcha (Tailwind):** in `globals.css`
   import Tailwind's `theme` and `utilities` layers only — pulling the full
   `@import "tailwindcss"` brings preflight, and the first symptom is Mantine
   buttons losing their styling in ways that look like a Mantine bug.
6. Wire `app/layout.tsx`: import `@mantine/core/styles.layer.css` (layered —
   see Decision) and declare the `@layer mantine, utilities;` order; spread
   `mantineHtmlProps` on `<html>` (includes `suppressHydrationWarning` — this is
   what kills the color-scheme hydration mismatch); `<ColorSchemeScript defaultColorScheme="auto" />`
   in head; `<MantineProvider defaultColorScheme="auto">` around children.
   The layout stays a server component — Mantine packages ship their own
   `'use client'` directives.
7. Wire the favicon: copy `img/favicon.svg` → `app/icon.svg` and
   `img/favicon.png` → `app/icon.png`. **Gotcha:** the mark's ink is `#141D2A`
   — near-invisible against dark tab bars. In the `app/icon.svg` *copy* (leave
   `img/` pristine), embed a `<style>` block with
   `@media (prefers-color-scheme: dark)` switching stroke/fill to a light tone;
   SVG favicons honor media queries inside the file.
8. Replace the placeholder page with a minimal Mantine render (e.g. `Title` +
   `Button`) to prove CSS is actually loading — unstyled-but-rendering is the
   classic failure mode when PostCSS config is wrong.
9. Verify: `npm run dev` at `localhost:3000/glu`, then `npm run build` (Turbopack
   prod build is the real gate — dev mode forgives things build does not).
   Toggle OS color scheme emulation in devtools; page must follow it without a flash.
10. `git init`, confirm `.gitignore` covers `node_modules`, `.next`; initial commit.

Honest sizing: half a day including verification. The only genuinely fiddly parts
are PostCSS config (step 5) and basePath discipline (step 3).

## Acceptance criteria

- [x] `npm run dev` serves the app at `http://localhost:3000/glu`; the root `/` does not serve the app.
- [x] `npm run build` completes with zero errors.
- [x] `package.json` shows Next 16.x, React 19.x, `@mantine/core` and `@mantine/hooks` 9.x, TypeScript 5.x, and Tailwind 4.x (`tailwindcss` + `@tailwindcss/postcss`).
- [x] Preflight is absent: a Mantine `Button` renders pixel-identical with Tailwind installed vs. a control without it (no reset bleed); a Tailwind utility (e.g. `mt-4`) applied to that Button visibly wins (layer order verified).
- [x] `postcss.config.cjs` exists with `postcss-preset-mantine` and all five Mantine breakpoint variables.
- [x] `app/layout.tsx` has `mantineHtmlProps` on `<html>`, `ColorSchemeScript` in head, `MantineProvider` wrapping children, both with `defaultColorScheme="auto"`.
- [x] The placeholder page renders a Mantine component with Mantine styling applied (visibly styled, not browser-default HTML).
- [x] With devtools `prefers-color-scheme` emulation, the page follows the OS scheme on load with no flash of the wrong theme and no hydration warnings in the console.
- [x] Page title is "GLU".
- [x] The GLU mark (from `img/favicon.svg`) shows as the tab icon at `localhost:3000/glu` — not the Next.js default — and remains visible with the browser in dark mode.
- [~] Repo is a git repository with an initial commit; `node_modules` and `.next` are not tracked. — **[deferred → HUMAN-TODO]** (GO.md forbids commits; `git init` done, history not created)

## Consequences

- ADR 02 starts on a working app with theming, breakpoints, and basePath already
  correct — the three things most painful to retrofit.
- Everyone must remember the app lives at `/glu` locally; muscle-memory visits to
  `/` will 404. Cheap price for zero deploy-time surprises.
- We are committed to Mantine's PostCSS pipeline and to App Router idioms
  (server-component layout, client components for interactivity).
- Staying on TS 5.x means a deliberate future upgrade to TS 7 once the Next.js
  ecosystem catches up — small tracked debt, not a surprise.
