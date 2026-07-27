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
| [26](docs/adr/26-legal-pages.md) | Privacy Policy and Terms of Service pages | Implemented (deviations noted) |
| [27](docs/adr/27-time-comment-environment.md) | Environment in time comments — how you worked | Implemented (deviations noted) |
| [28](docs/adr/28-comment-minimum-run.md) | Minimum run before a time comment — the threshold becomes a setting | Implemented (deviations noted) |
| [29](docs/adr/29-docs-page.md) | In-app documentation — one `/glu/docs` page, modal from the drawer | Implemented (deviations noted) |
| [30](docs/adr/30-social-preview-metadata.md) | Social preview and page metadata — Open Graph cards for every route | Implemented (deviations noted) |
| [31](docs/adr/31-welcome-gate.md) | Welcome gate — a front door for the first visit | Implemented (deviations noted) |
| [32](docs/adr/32-custom-durations.md) | Custom durations — ± off the ladder, and the row that shows it | Implemented |
| [33](docs/adr/33-notification-service-worker.md) | Notification service worker — ADR 18's Android escalation, taken | Implemented (deviations noted) |
| [34](docs/adr/34-filter-task-ordering.md) | Filter and label task order — reproducing Todoist's default sort | Implemented (deviations noted) |
| [35](docs/adr/35-focused-completion-vacates-slot.md) | Focused completion vacates the slot — the fourth bug report | Implemented (deviations noted) |
| [37](docs/adr/37-transport-toggle.md) | One transport toggle — Start, Pause and Resume are the same button | Implemented |
| [38](docs/adr/38-vulnerability-scanning.md) | Vulnerability scanning — dependencies, code, secrets, images, workflows | Implemented (deviations noted) |
| [42](docs/adr/42-second-clock-set.md) | The second clock set — 22 more designs, and the count stops being written down | Implemented |
| [45](docs/adr/45-third-clock-set.md) | The third clock set — 46 stopwatch designs, pointed back at a countdown | Implemented |
| [39](docs/adr/39-section-item-limit.md) | Limit the items in a section — a ceiling per section, and the row that lifts it | Implemented |
| [40](docs/adr/40-alert-sound-library.md) | A sound library for the end of a run — nine sounds and how long they play | Accepted |
| [41](docs/adr/41-notification-permission-asks.md) | Three asks, then Settings — the notification permission stops nagging | Implemented (deviations noted) |
| [43](docs/adr/43-pull-to-refresh.md) | Pull to refresh the task list — the gesture the tablet was missing | Implemented (deviations noted) |
| [44](docs/adr/44-internationalization.md) | Six languages — internationalization without locale URLs | Implemented (deviations noted) |

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
**25 (flip animation — the polish ADR 08 parked)** →
**26 (legal pages)** →
**27 (environment in time comments — the first brief after the board closed)** →
**28 (minimum run before a comment — ADR 14's threshold becomes a setting)** →
**29 (the manual — one docs page, opened as a modal from the drawer)** →
**30 (social preview — an Open Graph card and a full head on every route)** →
**31 (the welcome gate — the front door the metadata was pointing at)** →
**32 (custom durations — the first bug report the board answered with an ADR)** →
**33 (notification SW — ADR 18's named escalation, taken on the second bug
report)** →
**34 (filter and label task order — the third bug report, and the third
upstream fact ADR 12 recorded wrongly)** →
**35 (focused completion vacates the slot — the fourth bug report, reversing
ADR 20's owner-delegated lingering decision)** →
**37 (one transport toggle — the fifth bug report; ADR 02's three-button row
becomes two, and a disabled button nobody could see becomes no button at
all)** →
**38 (vulnerability scanning — repo-level like 23; the July audit becomes
standing machinery)** →
**39 (limit the items in a section — the sixth brief; a per-section ceiling in
Settings, and `TaskList`'s two render branches collapse into one loop over
`sectionRuns`)** →
**40 (the sound library — ADR 18's one chime becomes nine, with a bounded
length; the first settings row you audition rather than read)** →
**42 (the second clock set — ADR 07's roster doubles, and `CLOCK_COUNT`
replaces the ten copies of "18")** →
**43 (pull to refresh — ADR 12's manual refresh gets a gesture; the second use
of ADR 08/25's Pointer-Events idiom, and the task list's fourth freshness
trigger)** →
**41 (three asks, then Settings — the seventh bug report; ADR 18's "asked
once" was only true of the user who answers, and the Alerts section gains the
door)** →
**45 (the third clock set — the stopwatch sheet, with the digits turned back
around: the artwork fills with elapsed, the readout is always what is left)** →
**44 (six languages — the app stops being English-only; a cookie, not a URL
segment, and prose kept out of the message catalog)**.

Future ADRs: **none unnumbered — the board is fully specified.** New
features arrive as fresh briefs; the named reopening conditions are: task
authoring (adopts TanStack Query per ADR 20), offline mode (adds a fetch
handler per ADR 04 — the notification-only SW ADR 33 ships must never grow
one outside that ADR), gallery drag physics (finger-tracking, per ADR 25),
a clock **picker** (ADR 08's "past ~25 designs" condition, made live by
ADR 42 and loud at ADR 45's roster of eighty-six).
**Taken** (2026-07-26): notification SW → ADR 33.

Penciled settings sections (each = one section row + an ADR 19 amendment
when briefed): chrome-direction selection (ADR 15), archive export/import
(ADR 05), the **sound's** volume/mute (ADR 18 — chime *selection* is discharged
by ADR 40, and the *notification* mute by ADR 41), final-countdown takeover
opt-out/threshold (ADR 21). **Landed**: the Screen section (2026-07-25) —
two stay-awake toggles, amended into ADRs 17 and 19; the Time comments
section (2026-07-25, ADR 27) — "Say how you worked" plus two live previews
of the comment, amended into ADRs 14 and 19, which gained a second row
(2026-07-25, ADR 28) — the "Minimum time to log" ladder, default 1 min,
which is where ADR 14's hard-coded 60 s threshold now lives; the Tasks
section (2026-07-26, ADR 39) — the "Limit the items in a section to" ladder,
10 / 20 / 50 / 100 / All, default All, amended into ADRs 12 and 19; the Alerts
section (2026-07-26, ADR 40) — a nine-button sound grid over a "How long it
plays" ladder (Once / 3 / 5 / 10 / 20 s), amended into ADRs 18 and 19, which
gained a third row (2026-07-26, ADR 41) — "Notify me when a session ends", a
switch that **leads** the section: the permission's only door once the automatic
asks run out, and GLU's own mute in the other direction.

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
- **An unsorted Todoist view is not an unordered one** (ADR 34) —
  `/tasks/filter` returns rows in no defined order, and Todoist's own apps sort
  client-side before painting, so **the proxy sorts filter and label results**:
  priority descending (API 4 is P1) → date and time, undated last → deadline →
  project order (Inbox first, parent before child, via a best-effort
  `/projects` read) → `child_order` → id. `compareTasks` in
  `backend/todoistRoutes.ts` is the one copy. **Projects are exempt** —
  `section_order` then `child_order` genuinely is Todoist's project order, and
  the web applies it (ADR 12). Todoist's date-first rule for date-query filters
  is deliberately *not* implemented: detecting one means parsing a grammar we
  do not own. ADR 12's "API order for filters/labels" line is superseded, as is
  its claim that the multi-view union's view order "is the order Todoist itself
  shows".
- **The backend is permanently a stateless Todoist proxy** (ADR 11: Express 5
  in `backend/`, mounted at `/glu/api`; tokens in a sealed httpOnly cookie —
  the browser holds the encrypted blob, only the server can open it, the
  server stores nothing). **No database — MariaDB was considered and rejected
  2026-07-24**; session data is localStorage-only by design. Do not add
  server features or storage without a new ADR. All Todoist API traffic goes
  through the server proxy.
- **PWA = installable only, NOT offline** (product decision 2026-07-23; law
  restated 2026-07-26 by ADR 33) — **no fetch handler anywhere**. The only
  service worker is ADR 33's notification-only `web/public/sw.js`
  (skipWaiting + notificationclick, nothing else; e2e asserts its source is
  fetch-handler-free). ADR 04 is manifest + icons + install metadata. Do not
  add offline/caching machinery, or anything to `sw.js`, without a new ADR.
- **A dismissed permission prompt is not a denied one** (ADR 41) — dismissing
  leaves `Notification.permission` at `default`, so a `!== 'default'` guard is
  not "ask once", it is "ask forever". The automatic ask is capped at
  `ALERT_PROMPT_LIMIT` (3) by the persisted `alertPromptsUsed`, spent **at the
  moment of asking** (a dismissed prompt's promise resolves late, and resolves
  at all once the browser has stopped rendering the dialog). The counter never
  resets — not on "New day", not on logout — and a corrupt value reads as *zero
  spent*, never as spent. Settings → Alerts' third row is the door that stays
  open, it is never charged to the budget, and it must stay visible before the
  cap as well as after. Any future browser-capability surface reads its state
  with `useSyncExternalStore` (`useNotificationPermission`), not an effect that
  copies a global into state.
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
  prerendered. Every nonced app-owned tag also carries
  `suppressHydrationWarning`, and must: a header-delivered CSP makes the browser
  blank the `nonce` *attribute* (the value lives on the element's `.nonce`
  property), so React hydration always reads it as an attribute mismatch. That
  warning is expected — never answer it by dropping a nonce or moving the CSP
  into a `<meta>` tag.
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
  `version`/`migrate`/`partialize`; the per-frame tick display value and auth
  status never persist; purely-local UI state stays `useState`.
  **CSS modules are unlayered and therefore outrank Mantine** (ADR 37) — Mantine
  ships inside `@layer mantine`, so any `.module.css` rule beats its `:disabled`,
  `[data-active]` and hover treatments regardless of specificity. A module class
  that paints a Mantine control paints it in *every* state; restate the states
  you care about rather than assuming Mantine's still apply.
- **± means two different things, and `selectedDuration` has two writers**
  (ADR 32) — `running`/`paused`, ± trims *that run* (ADR 02: `remaining` moves,
  `total` follows, zero completes it) and the selection is untouched, so Stop
  still returns to the tapped preset. `idle`/`finished`, there is no run to trim:
  ± writes `selectedDuration`/`total`/`remaining` together, leaves `finished`
  for `idle`, and floors at one minute. The base it counts from is **whatever
  Start would give you that instant** — `remaining` when idle, `selectedDuration`
  when finished, because a finished run's `remaining` is 0. Read
  `selectedDuration` as "how long the next run is", never as "the preset that
  was tapped"; an off-ladder value is legal and `PresetRow` grows a rung for it,
  so nothing may assume the row is seven buttons.
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
- **Security scanning is standing machinery, and it never gates the deploy**
  (ADR 38) — Dependabot + `codeql.yml` + `security.yml` (npm audit, Semgrep,
  Gitleaks, Trivy, Hadolint, actionlint, zizmor) run on PRs and a weekly cron,
  deliberately outside ADR 16's `tests.yml` gate: red means "look at this",
  never "you cannot ship". ESLint security plugins ride in `just lint`. Every
  mute is narrow and carries an inline reason (`.gitleaks.toml`'s one
  allowlist entry, `security/detect-object-injection` off, the tag-pin
  relaxations in `.github/zizmor.yml` and the Semgrep step) — an uncommented
  mute is a review defect, and so is "fixing" a scanner by widening one.
  `docs/security-scanning.md` is the crib sheet; manual DAST (ZAP, header
  scanners) lives there and runs after deploy-shaped changes.
- **`web/src/proxy.ts`, not `middleware.ts`** (ADR 24) — Next 16 renamed the
  convention, and `proxy.ts` runs on the **Node runtime**, which is what makes
  the limiter's `Map` an ordinary per-process singleton. It still owns the CSP
  nonce (ADR 16 amendment); don't move either concern back out.
- **How many clock designs there are is derived, never written down** (ADR 42)
  — `CLOCK_COUNT` in `web/src/clocks/registry.ts` is `CLOCKS.length`, and it is
  the only statement of the roster's size; the docs page renders it, the stories
  and the tests read it. Adding a design is a module under
  `web/src/clocks/designs/` plus a registry entry plus a Storybook export, and
  **nothing else changes** — the registry test asserts every design module is
  registered exactly once instead of asserting a count, so a design that is
  written but never wired up fails. Never reintroduce a literal count, in prose,
  in a comment or in a test.
- **The readout counts down; the artwork may count up** (ADR 45) — the third
  design sheet is drawn as a stopwatch, and its accumulation metaphors (coins
  banked, tally marks scored, a city built, a card stamped) fill with
  `elapsedFraction` on purpose. What is never elapsed is **the time itself**:
  every design shows `p.time`, and no label may describe the digits as going up.
  `clockProgress` exports both fractions precisely so the choice is made per
  design and never by hand-inverting a value.
- **Icon source of truth** — `web/img/favicon.svg` (`web/img/favicon.png` is a
  508×523 non-square export). App and PWA icons are generated/copied from the SVG,
  never scaled from the PNG; regenerate via `just web icons`
  (`web/scripts/generate-icons.mjs`, ADR 04) rather than editing outputs.
- **Page copy lives in `web/src/lib/siteMetadata.ts`, and social tags are
  invisible until they ship** (ADR 30) — one `PAGE_META` entry per route holds
  the `<title>`, the meta description and the Open Graph card's copy; a new
  route adds an entry plus a four-line `opengraph-image.tsx` that calls
  `renderSocialCard`. Two Next behaviours are load-bearing and neither is
  type-checked: **`metadataBase` must carry the basePath** (the
  `opengraph-image` convention emits a basePath-free URL, so a bare origin
  sends every crawler to `ioan.dev/opengraph-image`), and **`openGraph` /
  `twitter` are replaced, not merged**, so every page restates `OG_SITE` and
  `TWITTER_CARD` — declaring them only in the root layout silently drops
  `og:site_name` and downgrades the card to `summary`. `e2e/metadata.spec.ts`
  is the only thing that can see either mistake. There is deliberately **no
  `robots.ts`**: it would land at `/glu/robots.txt`, which nothing reads.
- **Style through chrome tokens, never hardcode** (ADR 15) — the app has
  three switchable chrome directions (`studio-quiet` default, `instrument`,
  `poster`); any styling that doesn't change when the chrome switches is a
  review defect. Clock components (ADR 07) are canonical — never rebuild the
  lookalikes from design mockups. Theming is chrome × clock palette × scheme.
- **The user manual is a contract too** (ADR 29, amended by ADR 44) —
  `web/src/components/docs/content/en.tsx` is the one copy of what GLU does,
  rendered by both `/glu/docs` and the drawer's Docs modal — **and it now has
  five siblings.** An English edit landed without `es`, `fr`, `de`, `pt` and
  `zh-Hans` in the same session ships five lies rather than one. Change a default, a
  hotkey, an undo window or a setting and that file changes in the same
  session, each module's `updated` date included: a stale manual ships a lie to
  the user, not just a stale document. It is a **user manual, not an architecture tour** — no
  ADR numbers in the copy, internals only where they change what someone should
  expect. Its prose treatment is ADR 26's `legal.module.css`, shared by all
  three documents — "just tweaking" it restyles Privacy and Terms as well. The
  welcome (ADR 31) is **not** one of the three: it owns `welcome.module.css`.
- **Interface copy lives in `web/src/locales/`, and English is the only one you
  author** (ADR 44) — GLU ships in six languages (`en`, `es`, `zh-Hans`, `fr`,
  `pt`, `de`). A new user-facing string is a key in `locales/en.ts` plus its
  five translations; each translation module ends in `satisfies Messages`, so a
  key you add and do not translate is a **build error**, not a string that
  quietly renders in English. Never glue copy together with `+` or a template
  literal — "1 minute / 2 minutes" is a two-case rule almost nothing else on the
  roster shares. Use ICU (`{count, plural, …}`) and `Intl.ListFormat`.
  **Prose is deliberately not in the catalog**: the manual, the welcome, Privacy
  and Terms stay plain JSX so `/glu/docs` keeps serving its text as
  server-rendered HTML — a `useTranslations` call in any of those files would
  undo the property `DocsSections.tsx:18` exists to protect. The language comes
  from the **`glu-locale` cookie**, resolved server-side before first paint; the
  store's `locale` field is a mirror for the Settings row and can never drive
  rendering (`skipHydration`). There is **no locale in the URL** and
  `proxy.ts` is not involved — keep it that way, since it is the one file that
  must see every request. `e2e/fixtures.ts` pins the whole suite to English;
  `e2e/i18n.spec.ts` is the only spec that says otherwise.
  The Todoist time comment is localised too, and its vocabulary is
  **duplicated** into `backend/commentLocales.ts` on purpose (ADR 22 forbids
  sharing): the browser sends a locale *code*, never the sentence, and the two
  copies are pinned by identical literals in both packages' tests.
  **Clock designs pass a message *key* to `useStateLabel`, never a word**
  (`stateLabel(state, "orbit")`) — that is what keeps a new design from needing
  its own `useTranslations`. The 86 `registry.ts` design names are the one
  user-facing-ish copy still English, and only because nothing renders them; a
  clock picker would change that. `Words` spells its numbers via
  `clocks/designs/wordsNumbers.ts`, which is per-locale *rules*, not a table. The locale cookie is scoped to
  path `/`, never to `basePath` — a prefix-scoped cookie stops being sent the
  day the prefix moves, and does it silently.
- **`/glu` is gated on a persisted boolean** (ADR 31) — `hasEnteredApp` in the
  `glu:vN` blob decides whether the route renders `AppShell` or the welcome, and
  it is resolved in **both `merge` and `migrate`** in `web/src/store/gluStore.ts`.
  `merge` is the load-bearing one: `migrate` fires only when the stored version
  *differs*, so every existing user's v2 blob would otherwise arrive with the
  field absent, default to `false`, and greet a month-old user with a landing
  page. The rule the two share is `enteredBefore()` — **possessing a blob is
  proof of a prior visit** — and it is why a *corrupt* blob loads clean defaults
  yet stays entered. Anything that drives `/glu` from a clean profile now has to
  say it has been here: `e2e/fixtures.ts`'s `open()` plants the flag for the
  whole suite, and a test that bypasses `open()` and expects the app must seed
  it itself. The welcome's copy lives once, in
  `web/src/components/welcome/WelcomeSections.tsx`, and is rendered by both the
  gate and `/glu/welcome`; it deliberately states **no number the manual does
  not**, so there is one place to update and not two.
