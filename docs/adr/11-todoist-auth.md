# ADR 11: Todoist authentication — Express backend + login button

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-23 — `status` returns `{authenticated, name, id}`: ADR 14
  needs the user id to filter comment authorship (`posted_uid`).
- Amended: 2026-07-24 — **`server/` is now the independent `backend/` package**
  (owner decision, ADR 22): the "one npm package" call below is reversed ahead
  of its stated reopening condition. Read every `server/` path here as
  `backend/`.
- Amended: 2026-07-24 — **the proxy role is the backend's permanent scope**
  (product decision): backend & sync is cancelled, and no database (MariaDB
  was considered and rejected) enters the estate — the sealed httpOnly cookie
  *is* the token store: the browser holds the encrypted blob, only the server
  can open it, the server stores nothing.
- Amended: 2026-07-25 — **four hardening decisions from the security audit**
  (`SECURITY-AUDIT-25jul.md`), all inside this ADR's existing surface:
  1. **`SESSION_SECRET` is validated at boot, not defaulted.** "Via `.env`"
     was never enough: a missing or <32-char value silently sealed tokens
     with the committed dev key, so anyone holding the repo could unseal a
     captured cookie and recover the Todoist token (F-1). `readConfig` now
     throws for any **non-local** `PUBLIC_ORIGIN`. The dev fallback survives
     for localhost only, which is the one place it was ever meant to be.
  2. **`PUBLIC_ORIGIN` is parsed, not prefix-matched** (F-6). `startsWith
     ("https://")` mis-answered twice: a scheme-less origin dropped the
     `Secure` flag, and a trailing slash built a double-slash redirect URI.
     `new URL()` + `url.origin` settles both, and `Secure` now comes from the
     parsed protocol.
  3. **The auth plane is rate-limited** — 10 requests/minute/IP (F-3),
     superseded by **ADR 24**, which made it a token bucket (burst 20,
     10/min sustained) and metered the rest of the API alongside it. The
     callback's `state` check is CSRF protection, *not* authentication: a
     caller supplies both halves, so anyone could walk past it and make the
     server POST to Todoist's token endpoint, unmetered, burning the app's
     Todoist budget. Dependency-free (`backend/security.ts`), and it needs
     `app.set("trust proxy", 1)` to see past Caddy.
  4. **Every write checks its origin signals and content type** (F-9).
     `SameSite=Lax` already withholds the cookie cross-site, but it was the
     only control, and `close`/`reopen` take no body — so a cross-site form
     POST was otherwise a complete request. Reject-known-bad, since CSRF is a
     browser attack and a request carrying neither header is not a browser.

  Also: the API now answers **JSON on every exit** (F-5). Body-parser
  failures previously fell to Express's default handler, which returns HTML —
  and, whenever `NODE_ENV` was not `production`, an HTML page with a full
  filesystem-path stack trace, reachable unauthenticated.

- Deviation (2026-07-24, implementation): the account menu is a Mantine
  `Popover` holding one button rather than a `Menu`. Mantine's Menu renders a
  `role="presentation"` focus-trap anchor as a direct child of `role="menu"`,
  which fails axe's `aria-required-children`; with a single action a labelled
  popover is both simpler and correct.
- Deviation (2026-07-24, implementation): the login button's type is 19px/700.
  Todoist red with white text is 4.07:1 — under the 4.5:1 normal-text gate,
  over the 3:1 large-text one. The brand colour is theirs and not ours to
  adjust, so the type went up instead. The chip shows the mark rather than an
  initial for the same reason.
- Deviation (2026-07-24, implementation): env loading uses Node's own
  `--env-file-if-exists` rather than a `dotenv` dependency.
- Deviation (2026-07-24, implementation): the ADR 09 console tripwire gained one
  narrow allowlist — Chromium's browser-emitted `Failed to load resource` — so
  the "no server at all" degradation could be tested. App-emitted console errors
  still fail; load-time 404s are covered by a separate response listener.
- Deferred to HUMAN-TODO: everything that needs a registered Todoist app — the
  live consent round trip, the real account name/id, and the standalone-mode
  redirect check.

## Context

Product direction (2026-07-23): authenticate against Todoist **without the
user pasting a token** — sign in, and Todoist issues the credentials (the
mechanism CLI logins use). That is the OAuth **authorization-code flow**, and
it is precisely the thing that cannot live in the frontend: the code exchange
requires a client secret. **This is therefore the ADR that stands up the
Express backend** PLAN.md promised at `/api` — scoped to Todoist auth only.
Product decision 2026-07-24: this proxy role is the backend's **permanent**
scope — the once-penciled backend & sync ADR is cancelled; nothing else
sneaks in here or later without a new ADR.

The UI half: the **top-right reserved area gets its first tenant** — a
Todoist-branded rectangle showing "Log in" when unauthenticated.

Ground truth verified against developer.todoist.com on 2026-07-23:

- Authorize: `https://app.todoist.com/oauth/authorize`
  (`client_id`, comma-separated `scope`, mandatory CSRF `state`).
- Exchange: `https://api.todoist.com/oauth/access_token`
  (`client_id`, `client_secret`, `code`, `redirect_uri`).
- **New apps receive 1-hour access tokens + refresh tokens by default** —
  non-expiring tokens are legacy-only. Refresh handling is mandatory in the
  first version, not a later hardening step. (This is the fact that would
  have bitten mid-implementation.)
- Apps register in Todoist's App Management Console; PKCE exists for public
  clients — irrelevant here since we hold a server secret.

Versions verified against npm on 2026-07-23: Express **5.2.1**, iron-session
**8.0.4** (sealed-cookie utility).

**Prerequisites: ADRs 02 and 03 Implemented.** Interplay recorded: ADR 08's
chrome-on-palette rule applies to the button if 08 has landed; ADR 09's E2E
ratchet applies if 09 has; ADR 10's corner arrow coexists (the button uses the
reserved *region*, not the extreme corner the arrow owns).

## Decision

### Backend shape

- **Express 5 in a `server/` directory of the same npm package** — this
  resolves ADR 01's deferred monorepo question: no workspace split for one
  small service; one lockfile, one `node_modules`, `tsx` in dev, `tsc` build.
  Split into workspaces only when the server grows real weight (the sync ADR
  can revisit).
  > **Superseded by ADR 22 (2026-07-24).** The owner split the repo into
  > independent `backend/` and `web/` packages — two lockfiles, two
  > `node_modules`, no workspaces — without waiting for "real weight". `tsx`
  > in dev and `tsc` build still hold.
- **Mounted under `/glu/api`**: dev via a Next.js rewrite
  (`/glu/api/* → localhost:4000`), prod via the reverse proxy. The redirect
  URI is `…/glu/api/auth/todoist/callback` in both environments — which means
  **two Todoist apps in the App Management Console** (dev with the localhost
  redirect, prod with `ioan.dev`), selected by env vars. One app with a prod
  redirect and a dev flow that can't complete is the classic OAuth
  time-waster; two apps from day one.
- **Stateless server, no database.** The token set
  `{access_token, refresh_token, expires_at}` lives in a **sealed (encrypted)
  httpOnly cookie** (iron-session), `Secure`, `SameSite=Lax`, `Path=/glu`.
  The browser never sees a token; the server never stores one. A database for
  one user's cookie-sized secret is architecture cosplay.
- **Endpoints:**
  - `GET /api/auth/todoist/login` — mints `state`, stores it in a short-lived
    httpOnly cookie, redirects to Todoist authorize with
    `scope=data:read_write` (the future tasks UI needs read + complete;
    re-consenting later to widen scope is a whole re-auth — take the scope
    the roadmap needs).
  - `GET /api/auth/todoist/callback` — verifies `state` against the cookie
    (mismatch → 403, no session), exchanges the code, seals the token set,
    redirects to `/glu`.
  - `GET /api/auth/todoist/status` — `{authenticated, name?}`; **refreshes
    transparently** when the access token is expired; a failed refresh clears
    the cookie and reports unauthenticated (revoked-at-Todoist degrades to
    logged-out, never to an error screen).
  - `POST /api/auth/todoist/logout` — clears the cookie.
- **All future Todoist API traffic goes through the server** (proxy pattern):
  the token never reaches the browser, and refresh lives in exactly one
  place. The tasks-UI ADR inherits this rule.

### UI

- **`TodoistButton` in the top-right reserved area** (at/above `sm`; below
  `sm` it joins the stacked content per ADR 08's mobile layout, above the
  environment toggles). Logged out: Todoist logo + "Log in" — **Todoist
  brand treatment** (their red, `#E44332`, official mark, per their brand
  guidelines: don't recolor or restyle the logo; confirm exact values against
  the guidelines at implementation). Brand-on-brand means the button reads
  identically across all ADR 08 palettes and both schemes — self-contained
  contrast. Logged in: a compact chip with the account name; tapping opens a
  small Mantine `Menu` with "Log out".
- **The Todoist mark is an inline local SVG** (official logo path) — Tabler
  (ADR 10's icon vocabulary) has no Todoist brand mark, and adding a second
  icon library for one logo is worse than one committed SVG.
- **Login is a plain full-page navigation** (`<a href>` to the login
  endpoint, not `fetch`) — OAuth is a redirect dance, not an XHR. **Gotcha:**
  this is a server route, not a Next page: `next/link` doesn't apply, and the
  ADR 01 "never hardcode a root-relative URL" rule means the `/glu/api` base
  comes from one shared helper/env, not string literals.

## Options considered

- **Frontend-only OAuth (token in localStorage)** — either leaks the client
  secret into the bundle or forces the implicit-style flow; token readable by
  any XSS. Rejected; this feature is *why* the backend exists.
- **User pastes an API token into a settings field** — works (it's what
  legacy CLIs did) and needs no backend, but it is exactly what the brief
  rules out ("without a token"). Rejected.
- **Next.js route handlers instead of Express** — technically sufficient and
  one less process, but PLAN.md commits to Express at `/api`, and the sync
  ADR expects it; deviating from recorded ground truth to save one small
  process isn't worth the contradiction. Rejected.
- **Server-side session store (DB/Redis) for tokens** — infrastructure for
  one user's 300-byte secret. Rejected for the sealed cookie.
- **`data:read` scope now, widen later** — widening scope = full re-consent
  round trip later for a predictable need (completing tasks). Rejected.
- **Device-code style flow ("CLI mechanism" read literally)** — Todoist's web
  OAuth *is* its CLI login mechanism (CLIs open this same authorize page);
  a device-code UX adds a code-entry screen the web app doesn't need.
  Rejected as interpretation, recorded.

## Scope

### In scope

- Express 5 server (`server/`), the four auth endpoints, sealed-cookie token
  storage, transparent refresh, dev rewrite + prod proxy path, `.env.example`
  (+ two-app registration documented in the repo).
- `TodoistButton` (logged-out / logged-in / loading states), placement per
  layout contract, brand treatment, logout menu.
- Tests: supertest integration on the auth routes with Todoist endpoints
  mocked (happy path, state mismatch, exchange failure, expired-token
  refresh, failed refresh → logged out, logout); stories + RTL tests for
  button states; ADR 09 E2E block driving UI states by stubbing
  `/status` with `page.route` (full real-IdP OAuth is explicitly not
  E2E-automatable — recorded, not forgotten).
- README: dev setup for the two-process dev flow and Todoist app
  registration.

### Out of scope

- Any Todoist *task* UI (lists, add, complete) → future **ADR: Todoist tasks
  UI** — the reserved area's real tenant; this ADR only proves identity.
- Session-archive upload / `/api` sync — **cancelled 2026-07-24**: the proxy
  stores nothing, permanently.
- Multi-account, account switching, token encryption-at-rest beyond the
  sealed cookie → single-user app, YAGNI.
- Deployment mechanics of the second process → the CI/CD & deployment ADR.
- Todoist webhooks → tasks-UI ADR territory if ever.

## Implementation outline

1. **Server skeleton** — `server/` with Express 5, `tsx` dev script,
   `concurrently` for `npm run dev` (Next + API), Next rewrite for
   `/glu/api`. **Gotcha:** Express 5 handles rejected async handlers
   natively — no `express-async-errors` shim; don't cargo-cult it in.
2. **Auth routes** — login (state cookie: httpOnly, 10-min TTL,
   **`SameSite=Lax`, not `Strict`** — the callback arrives as a top-level
   cross-site GET and Strict would withhold the state cookie, the classic
   "OAuth works in one tab, 403s in the next" bug); callback (verify, POST
   exchange with an explicit timeout, seal, redirect to `/glu`); status
   (refresh-if-expired with a small clock skew margin, ~60 s); logout.
   **Gotcha:** two tabs refreshing simultaneously can race; Todoist rotates
   refresh tokens — last-write-wins on the cookie is acceptable for one
   user, but *log* refresh failures distinctly so a rotation race isn't
   misread as revocation.
3. **Registration + env** — two Todoist apps (dev/prod), `TODOIST_CLIENT_ID`,
   `TODOIST_CLIENT_SECRET`, `SESSION_SECRET` via `.env` (gitignored),
   `.env.example` committed, secrets never in `NEXT_PUBLIC_*`.
4. **`TodoistButton`** — status fetch on mount (SWR-style: render logged-out
   optimistically, swap on response; no layout shift between states —
   fixed-size rectangle), brand SVG, logged-in chip + logout Menu. ≥44 px.
   **Gotcha (ADR 04 interplay):** in the installed standalone app the OAuth
   redirect navigates the standalone window to Todoist and back — verify the
   round trip in standalone mode on both platforms; if iPadOS bounces to
   Safari and back, that's an accepted platform quirk, recorded.
5. **Tests** per the scope list; the supertest suite mocks
   `api.todoist.com` (never hits it), the Playwright block stubs `/status`
   only (no Express in the E2E harness).
6. **Docs** — README dev-setup section; note in `docs/` on registering the
   Todoist apps with the exact redirect URIs.

Honest sizing: **2–2.5 days.** The auth routes with refresh + their failure-
mode tests are a solid day; the button is half a day; two-process dev
plumbing, app registration, and the standalone-mode verification eat the
rest. OAuth is never the afternoon it looks like.

## Acceptance criteria

- [x] `npm run dev` starts Next and the API together; `GET /glu/api/auth/todoist/status` returns `{authenticated:false}` with no cookie set.
- [~] Clicking "Log in" navigates to `app.todoist.com/oauth/authorize` with `client_id`, `scope=data:read_write`, and a `state` matching the short-lived cookie. — **[deferred → HUMAN-TODO]** (needs a registered Todoist app; the equivalent server behaviour is covered by the supertest suite, and the UI states by stubbed-`/status` stories and E2E)
- [~] Completing consent lands back on `/glu` with a sealed httpOnly `Secure` `SameSite=Lax` cookie; no token material is readable from `document.cookie` or localStorage. — **[deferred → HUMAN-TODO]** (needs a registered Todoist app; the equivalent server behaviour is covered by the supertest suite, and the UI states by stubbed-`/status` stories and E2E)
- [~] `status` then returns `{authenticated:true, name:<account name>}` and the button shows the chip with that name. — **[deferred → HUMAN-TODO]** (needs a registered Todoist app; the equivalent server behaviour is covered by the supertest suite, and the UI states by stubbed-`/status` stories and E2E)
- [x] A callback with a wrong/missing `state` returns 403 and sets no session cookie (supertest).
- [x] With a fabricated expired token set in the sealed cookie, `status` transparently refreshes (mocked) and reseals; a failed refresh clears the cookie and returns `{authenticated:false}` (supertest).
- [x] Log out clears the cookie (supertest); the button returns to "Log in" and a subsequent `status` is unauthenticated (story + E2E).
- [x] The button renders in the top-right reserved area at ≥`sm`, in the stacked section below `sm`, is ≥44 px, and keeps identical Todoist branding across both schemes (and across clock palettes if ADR 08 is implemented).
- [x] Stories exist for logged-out, loading, and logged-in states; RTL tests cover the three states; the ADR 09 E2E block (stubbed `/status`) is active and green.
- [x] `.env.example` lists every required variable; the repo contains no real secret (grep for the client secret pattern comes back empty).
- [x] `npm test`, `npm run build`, `npm run build-storybook` all green.

## Consequences

- The backend exists. From here on "frontend-only" is history: dev runs two
  processes, deploy ships two, and the CI/CD ADR inherits both.
- The proxy pattern is now the standing rule for Todoist traffic: tokens
  live server-side only; the tasks-UI ADR builds on `/glu/api/todoist/*`
  rather than touching Todoist from the browser.
- The sealed-cookie choice keeps the server stateless — nothing to back up,
  nothing to migrate — permanently, by product decision (2026-07-24): no sync
  ADR and no database are coming.
- The top-right reservation is no longer empty; the future tasks-UI ADR
  fills the remaining space around an already-working identity.
- We are coupled to Todoist's OAuth lifecycle (1-hour tokens, rotating
  refresh tokens): their incidents become our login incidents — visible as a
  clean logged-out state, never a crash, by construction of `status`.
