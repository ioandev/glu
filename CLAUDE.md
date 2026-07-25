# CLAUDE.md

GLU — tablet-first pomodoro / focus tracker at `ioan.dev/glu`. Product intent
lives in [PLAN.md](PLAN.md); all technical decisions live in ADRs;
[UI.md](UI.md) is the design brief (page structure, fixed constraints, open
canvas) — ADRs win on any disagreement, and UI.md must be kept in sync when
ADRs change the page.

## The ADR is the contract

Work in this repo is ADR-driven. Before touching code, read the relevant ADR —
it defines scope, implementation outline, and acceptance criteria. Rules:

- Stay inside the ADR's scope. Tempting extras go into its "Out of scope" /
  future-ADR notes, not into the code.
- If reality forces a deviation, update the ADR in the same session with a
  one-line reason.
- When an ADR is implemented, set its Status to Implemented and verify every
  acceptance criterion by actually running things (build, tests, browser),
  not by reading code.

## ADR index

| ADR | Title | Status |
| --- | --- | --- |
| [01](docs/adr/01-nextjs-mantine-setup.md) | Next.js + Mantine project setup | Implemented (deviations noted) |
| [02](docs/adr/02-ui-implementation.md) | UI implementation — timer, environment toggles, theming | Implemented (deviations noted) |
| [03](docs/adr/03-storybook-and-testing.md) | Storybook and UI testing | Implemented (deviations noted) |
| [04](docs/adr/04-pwa.md) | Progressive Web App (installable, not offline) | Implemented (deviations noted) |
| [05](docs/adr/05-session-tracking.md) | Session tracking — sessions per day, "New day" reset | Implemented (deviations noted) |
| [06](docs/adr/06-keyboard-control.md) | Keyboard control | Implemented |
| [07](docs/adr/07-clock-designs.md) | Clock design components (18 designs) | Implemented (deviations noted) |
| [08](docs/adr/08-clock-gallery.md) | Clock gallery — flip-through, site theming, mobile layout | Implemented (deviations noted) |
| [09](docs/adr/09-e2e-playwright.md) | End-to-end tests with Playwright | Implemented (deviations noted) |
| [10](docs/adr/10-hidden-header.md) | Hidden header drawer (GitHub link, theme toggle, Settings socket) | Implemented (deviations noted) |
| [11](docs/adr/11-todoist-auth.md) | Todoist authentication — Express backend + login button | Implemented (deviations noted) |
| [12](docs/adr/12-todoist-task-view.md) | Todoist task view — source picker + task cards | Implemented (deviations noted) |
| [13](docs/adr/13-todoist-task-detail.md) | Todoist task detail view (read-only) | Implemented (deviations noted) |
| [14](docs/adr/14-focused-task-time-comments.md) | Focused task & time-tracking comments (first proxy write verb) | Implemented (deviations noted) |
| [15](docs/adr/15-app-chrome-design-system.md) | App chrome design system — three switchable directions | Implemented (deviations noted) |
| [16](docs/adr/16-ci-cd.md) | CI/CD — GitHub Actions, GHCR, deploy to ioan.dev (poached from zantiflow) | Phase A Implemented; Phase B Proposed |
| [17](docs/adr/17-wake-lock.md) | Screen wake lock | Implemented (deviations noted) |
| [18](docs/adr/18-session-end-alerts.md) | Session-end alerts (chime + Notification, no push) | Implemented (deviations noted) |
| [19](docs/adr/19-settings-todoist-auth.md) | Settings — Todoist log out/in + shared auth substrate | Implemented (deviations noted) |
| [20](docs/adr/20-todoist-task-actions.md) | Todoist task actions — complete + undo | Implemented (deviations noted) |
| [21](docs/adr/21-final-countdown-takeover.md) | Final-countdown takeover (last 60 s, background floods all but the clock) | Implemented (deviations noted) |
| [22](docs/adr/22-backend-web-split.md) | Repository split — independent `backend/` and `web/` packages | Implemented |
| [23](docs/adr/23-licensing-and-third-party-notices.md) | Licensing — Apache-2.0 + generated third-party notices | Implemented (deviations noted) |
| [24](docs/adr/24-rate-limiting.md) | In-memory IP rate limiting on both tiers | Implemented (deviations noted) |
| [25](docs/adr/25-clock-flip-animation.md) | Clock flip animation — directional slide | Implemented (deviations noted) |

> **Paths in ADRs 01–21 predate ADR 22's split** and were left as written —
> they are historical records. Read `src/…` as `web/src/…` and `server/…` as
> `backend/…`. ADR 11 carries the one amendment, since ADR 22 reverses its
> "one npm package" decision outright.

**Build order** (implementation sequence — deliberately not the numbering;
ADR 15 runs early to get the real UI out; ADR 16 Phase A right after tests
exist, Phase B at go-live and after 09 since the smoke step reuses its
suite): 01 → 02 → 03 → **16-A (CI)** → **15** → 05 → 06 → 07 → 08 → 09 →
**16-B (deploy, go-live)** → **17 (wake lock — first post-launch)** →
**18 (alerts)** → 04 → 10 → 11 → **19 (settings + shared auth substrate —
before 12–14 so they build on it)** → 12 → 13 → 14 → 20 → 21 → 22 →
**23 (licensing — repo-level, independent of the feature board)** →
**24 (rate limiting — hardening, after the surfaces it meters exist)** →
**25 (flip animation — the polish ADR 08 parked)**.

Future ADRs: **none unnumbered — the board is fully specified.** New
features arrive as fresh briefs; the named reopening conditions are: task
authoring (adopts TanStack Query per ADR 20), offline mode (re-adds a
service worker per ADR 04), notification SW (ADR 04 amendment per ADR 18),
gallery drag physics (finger-tracking, per ADR 25).

Penciled settings sections (each = one section row + an ADR 19 amendment
when briefed): chrome-direction selection (ADR 15), archive export/import
(ADR 05), wake-lock opt-out (ADR 17), alert volume/mute/chime (ADR 18),
final-countdown takeover opt-out/threshold (ADR 21).

**Cancelled** (2026-07-24, product decision): backend & sync, history & stats
UI, task-linked session history. The backend is permanently a stateless
Todoist proxy (ADR 11); the ADR 05 archive is local-only and its 90-day cap
is standing policy.

New ADRs go in `docs/adr/` as `NN-kebab-case-title.md`, two-digit numbers,
following the structure used by ADR 01.

## Hard constraints (from PLAN.md — don't rediscover these)

- **`basePath: '/glu'`** — the app lives under a subpath. Never hardcode a
  root-relative URL; only `next/link`, `next/image`, and router APIs get the
  prefix automatically. Locally the app is at `localhost:3000/glu`; `/` 404s
  by design.
- **Tablet-first** — primary target is a tablet, sometimes a half-tablet
  (phone-ish width). Touch targets and the two-breakpoint layout matter more
  than desktop polish.
- **Layout contract** — at/above `sm`: pomodoro timer (clock gallery, ADR 08)
  owns the left vertical half; environment toggles (Music, Podcast, TV,
  Silence — which untoggles the rest — Noisy, Headphones) bottom-right;
  top-right stays empty, reserved for a future Todoist ADR; no page scroll.
  Below `sm`: the clock owns the first `100dvh` viewport, everything else
  stacks below, page scrolls (ADR 08).
- **Dark/light theme is first-class** — Mantine color scheme, SSR-safe
  (`ColorSchemeScript` + `mantineHtmlProps`, `defaultColorScheme="auto"`).
- **Two independent packages** (ADR 22) — `web/` (Next.js app, Storybook, e2e)
  and `backend/` (the Express proxy), each with its own `package.json`,
  lockfile and `node_modules`. **There is no root `package.json` and no npm
  workspace**; the root `justfile` fans out (`just web …`, `just backend …`).
  Never add a root manifest or a shared dependency without a new ADR. The
  backend stays CommonJS — its imports are extensionless. **Each package owns
  its own `Dockerfile` + `.dockerignore` and is its own build context** —
  `glu-web` from `web/`, `glu-api` from `backend/`; there is no root
  Dockerfile, and CI selects a tier by `context:`, never by `file:`.
- **The backend is permanently a stateless Todoist proxy** (ADR 11: Express 5
  in `backend/`, mounted at `/glu/api`; tokens in a sealed httpOnly cookie —
  the browser holds the encrypted blob, only the server can open it, the
  server stores nothing). **No database — MariaDB was considered and rejected
  2026-07-24**; session data is localStorage-only by design. Do not add
  server features or storage without a new ADR. All Todoist API traffic goes
  through the server proxy.
- **PWA = installable only, NOT offline** (product decision 2026-07-23) — no
  service worker anywhere; ADR 04 is manifest + icons + install metadata. Do
  not add offline/caching machinery without a new ADR.
- **Every security header is app-owned except HSTS** (ADR 16 amendments
  2026-07-25) — the page CSP is nonce-based: `web/src/proxy.ts` mints a
  per-request nonce, sends the `Content-Security-Policy` header, and hands the
  nonce to the two *required* inline scripts (ADR 01's `ColorSchemeScript`,
  ADR 15's chrome bootstrap); Next nonces its own. **Never put a page CSP in
  proxy config** — two CSP headers intersect and no proxy can know the nonce,
  so it silently re-breaks hydration. Never "fix" a CSP error by adding
  `'unsafe-inline'` to `script-src`; nonce the script instead. `nosniff`,
  `X-Frame-Options` and `Referrer-Policy` come from `web/next.config.ts` and
  `backend/security.ts`; the API's `default-src 'none'` CSP comes from
  `backend/security.ts`. Only **HSTS** stays at the proxy, because only it
  terminates TLS. The nonce is why pages are dynamic rather than statically
  prerendered.
- **Secrets fail fast, they do not fall back** (ADR 11 amendment 2026-07-25) —
  `backend/config.ts` throws when `PUBLIC_ORIGIN` is non-local and
  `SESSION_SECRET` is missing or under 32 chars. The committed dev key is for
  localhost only. `PUBLIC_ORIGIN` is parsed with `new URL()`, never
  prefix-matched, and the cookie's `Secure` flag comes from the parsed
  protocol.
- **Stack** — Next.js (App Router) + Mantine, TypeScript 5.x (deliberately
  not TS 7 — see ADR 01), npm. **Tailwind v4 as a utility layer on top of
  Mantine** (owner decision 2026-07-24, amended into ADR 01): no preflight
  (Mantine owns the reset), Mantine via `styles.layer.css` with
  `@layer mantine, utilities;` order, use-when-needed for layout/spacing;
  shape/material/color utilities must reference `--glu-*` token variables
  (ADR 15's rule). **State: Zustand 5** (owner
  decision 2026-07-24, amended into ADR 02): one store; the persisted
  partition IS the versioned `glu:vN` blob via `persist` +
  `version`/`migrate`/`partialize`; the 50 ms tick display value and auth
  status never persist; purely-local UI state stays `useState`.
- **Apache-2.0, and attribution is generated** (ADR 23) — the repo's own terms
  live in `LICENSE` + `NOTICE`; both `package.json`s declare
  `"license": "Apache-2.0"`. The three `LICENSES` manifests (root union,
  `web/`, `backend/`) are **generated files** — never hand-edit one; run
  `just license` after any dependency change and commit the result (CI warns
  on drift, it does not fail). Each manifest embeds GLU's own NOTICE and the
  full Apache text on purpose: `web/` and `backend/` are separate build
  contexts (ADR 22), so that single file is the only way an image can carry
  its notices. The Dockerfiles copy it — don't remove those `COPY` lines.
- **The apps never count proxy hops** (ADR 24) — both tiers resolve the client
  identically: `X-Glu-Client-IP` (an explicit override nothing sets by default)
  → `X-Real-IP` (what nginx-proxy assigns from `$remote_addr`) → the
  **rightmost** `X-Forwarded-For` entry → the socket; then IPv6 is keyed by
  /64. Never add a hop count: one too high promotes the leftmost,
  caller-written entry into the key and the limiter becomes decorative. Never
  read the *leftmost* forwarded entry — when any hop appends, it is whatever
  the caller typed. Rate limits are **source constants**
  in `web/src/lib/rateLimit.ts` and `backend/security.ts` (duplicated on
  purpose — ADR 22 forbids sharing), not env vars; ADR 24's table is the
  contract. `/healthz` on both tiers is never metered — a 429 there fails the
  container healthcheck and takes the site down.
- **`web/src/proxy.ts`, not `middleware.ts`** (ADR 24) — Next 16 renamed the
  convention, and `proxy.ts` runs on the **Node runtime**, which is what makes
  the limiter's `Map` an ordinary per-process singleton. It still owns the CSP
  nonce (ADR 16 amendment); don't move either concern back out.
- **Icon source of truth** — `web/img/favicon.svg` (`web/img/favicon.png` is a
  508×523 non-square export). App and PWA icons are generated/copied from the SVG,
  never scaled from the PNG; regenerate via `just web icons`
  (`web/scripts/generate-icons.mjs`, ADR 04) rather than editing outputs.
- **Style through chrome tokens, never hardcode** (ADR 15) — the app has
  three switchable chrome directions (`studio-quiet` default, `instrument`,
  `poster`); any styling that doesn't change when the chrome switches is a
  review defect. Clock components (ADR 07) are canonical — never rebuild the
  lookalikes from design mockups. Theming is chrome × clock palette × scheme.
