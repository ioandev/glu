# GLU — Full Security Audit

- **Date:** 2026-07-25
- **Scope:** all 22 ADRs + `backend/`, `web/src/`, `deploy/`, `.github/workflows/`
- **Tree state:** working tree at audit time; the repository has **no commits yet** (everything untracked)
- **Method:** static review plus live verification — the 68-test backend suite, `npm audit` on both packages, a production `next build` served and probed, and the Express proxy run and attacked directly. Every finding below was reproduced, not inferred.

> Run via `/security-audit full` (`.claude/commands/security-audit.md`).

## Resolution — all ten findings fixed, 2026-07-25

Every finding below was fixed in the same session and each fix is pinned by a
test. ADR amendments: **11** (config validation, rate limiting, write-origin
checks, JSON error shape), **16** (CSP moves to the app; `poweredByHeader`;
`images.unoptimized`; `NODE_ENV` on api), **14** (outbox backoff), **15** and
**01** (nonce on the required inline scripts; clock-id allowlist), **12**
(error-text deviation recorded). `CLAUDE.md` gained two hard constraints.

| # | Fix | Where | Verified by |
|---|---|---|---|
| F-1 | Boot throws for a non-local origin without a real `SESSION_SECRET`; dev key is localhost-only | `backend/config.ts` | `backend/security.test.ts` |
| F-2 | Per-request nonce + app-owned CSP; Caddy no longer sends a page CSP | `web/src/middleware.ts`, `layout.tsx`, `ChromeBootstrap.tsx`, `deploy/Caddyfile.example` | 325 Playwright tests + console tripwire against the CSP-enforcing production build |
| F-3 | 10 req/min/IP on `/auth/*`, `trust proxy 1` | `backend/security.ts`, `app.ts` | `backend/security.test.ts` |
| F-4 | Exponential backoff (2 s → 5 min); permanent 4xx drops | `web/src/components/todoist/useTimeComments.ts` | `web/src/components/todoist/outboxRetry.test.ts` |
| F-5 | Terminal JSON error middleware; `NODE_ENV` restated in compose | `backend/security.ts`, `deploy/docker-compose.example.yml` | `backend/security.test.ts` |
| F-6 | `PUBLIC_ORIGIN` parsed with `new URL()`; `Secure` from protocol | `backend/config.ts` | `backend/security.test.ts` |
| F-7 | `images.unoptimized` + trace exclusion — `sharp` no longer in the image | `web/next.config.ts` | absent from `.next/standalone` after build |
| F-8 | `poweredByHeader: false`, plus `-X-Powered-By` at Caddy | `web/next.config.ts`, Caddyfile | header absent from the built server's responses |
| F-9 | Origin / `Sec-Fetch-Site` / content-type checks on every write | `backend/security.ts` | `backend/security.test.ts` |
| F-10 | `activeClockId` allowlisted like `chromeThemeId` | `web/src/chrome/ChromeBootstrap.tsx` | `web/src/chrome/chrome.test.tsx` |

Suites after the fixes: **backend 82** (was 68), **web unit/story 280 + 109**,
**e2e 325 across four projects**. One known WebKit `page.clock` flake
(`features.spec.ts:1242`) predates these changes and passes on retry.

Two notes for whoever deploys:

- The CSP is no longer in the Caddyfile. Re-adding one there will break
  hydration, because two CSP headers intersect and Caddy cannot know the
  per-request nonce.
- `SESSION_SECRET` is now mandatory in production. A deploy that forgot it
  used to boot happily; it now refuses to start, which is the point.

---

## Part 1 — ADR audit (design-time)

### ADR 11: Todoist authentication

**Threat model:** Adequate on the flow, silent on operations — it reasons carefully about CSRF, token containment and refresh races, and not at all about misconfiguration or abuse.

**Findings:**

1. **High · A7 ·** The ADR mandates `SESSION_SECRET` via env but specifies no startup validation. The implementation therefore falls back to a committed key (see F-1). *Risk:* a one-line omission during setup silently produces a publicly-decryptable session cookie. *Recommendation:* the ADR should require fail-fast on a missing/short secret in production, not just "via `.env`".
2. **Medium · H1 ·** No rate limiting is contemplated for the auth plane. The callback is unauthenticated-reachable and makes an outbound call (see F-3).
3. **Info · A10 ·** A 400-day cookie with no server-side revocation is a real consequence of statelessness. Correct for a single-user app, but the ADR's "Consequences" section doesn't name it.

**Checklist coverage:**

- Addressed: A1–A5, A8, A9, A11–A16, E1–E4, K1
- Missing: A7 (validation), H1 (rate limiting)

**Verdict:** Secure by design on the flow; the gaps are operational, not architectural.

### ADR 12 / 13 / 14 / 20: the Todoist proxy chain

**Threat model:** Adequate — the strongest security reasoning in the repo. ADR 12 names the exact threat ("a generic proxy would hand any XSS the whole account including deletes") and picks the allowlist for that reason. ADR 13 pre-empts SSRF-as-a-service and rejects markdown rendering on XSS grounds. ADR 14 makes the server compose write payloads so a hijacked frontend can't author text.

**Findings:**

1. **Info · D11 ·** ADR 12 decides "invalid filter query → surface Todoist's error text (filters are user-authored code)". The implementation never captures upstream response bodies — the relayed message is our own `Todoist GET /tasks/filter failed`. The safer choice, but an unrecorded deviation; CLAUDE.md requires deviations be written into the ADR.
2. **Low · H8 ·** ADR 14 specifies retry-on-next-load for the outbox but no retry ceiling, which is why the implementation has none (F-4).

**Checklist coverage:**

- Addressed: B1–B3, B5–B9, C1–C10, D2, D3, D7, D8, K3, K5
- Missing: H8 (retry policy)

**Verdict:** Secure by design. This chain is what the rest of the repo should be measured against.

### ADR 16: CI/CD, and ADRs 01 / 15: the inline bootstrap scripts

**Threat model:** ADR 16's is adequate in intent and unverified in fact. ADRs 01 and 15 have none in this domain.

**Findings:**

1. **High · G3 · Cross-ADR conflict, unreconciled by any ADR.** ADR 16 calls the strict CSP "the payoff moment" and writes `script-src 'self'`. ADR 01 mandates Mantine's `ColorSchemeScript` and ADR 15 mandates a pre-paint chrome bootstrap — both *required* inline scripts, neither ADR mentioning CSP. ADR 16's own acceptance criterion ("the app functions under that CSP with zero console CSP violations") is marked deferred to HUMAN-TODO, so the contradiction has never been executed. See F-2 for the verified consequence.
2. **Low · I3 ·** ADR 16 ships `:latest` in the compose example with a "pin to `sha-<short>`" comment. `:latest` + `docker compose pull` is an unreviewed-code-to-production path.

**Checklist coverage:**

- Addressed: E2, E9, G1, G2, G6–G9, I1–I8, J1, J4–J8
- Missing: G3 (CSP vs. inline code)

**Verdict:** Needs hardening — the CSP is the one place where three ADRs each did their own job correctly and the composition is broken.

### ADRs 04, 05, 17, 18, 21, 22

**Threat model:** Adequate for their domains; each is narrow and stays there.

**Findings:** none.

ADR 04's no-service-worker constraint holds (verified: zero matches for `serviceWorker`/`workbox`/`next-pwa`/`caches.`/`pushManager` across `web/`). ADR 05's local-only archive and 90-day cap hold. ADR 22's two-package split holds — no root manifest, separate lockfiles, separate build contexts. ADR 18's notification bodies carry app state only, no Todoist content.

**Verdict:** Secure by design.

### Cross-cutting concerns

- **Token containment is honoured end to end** — no ADR proposes a path that puts token material in the browser, and none of the code does either.
- **The allowlist invariant is stated in three ADRs and enforced in one router** — good concentration, and it's tested.
- **CSP is the one broken seam:** it is specified by an ADR that doesn't own the pages, and the pages are specified by ADRs that don't know about it.
- **Misconfiguration is nobody's ADR.** `SESSION_SECRET`, `PUBLIC_ORIGIN` and `NODE_ENV` each carry a security consequence, and no ADR assigns validation to anyone.

---

## Part 2 — Code audit (implementation-time)

### Findings

| # | Severity | Category | Location | Finding | Risk | Recommendation |
|---|---|---|---|---|---|---|
| F-1 | **High** | A7 | `backend/config.ts:40-43` | No startup validation: a missing or <32-char `SESSION_SECRET` silently seals tokens with the committed key `glu-development-only-…`. Verified: with `PUBLIC_ORIGIN=https://ioan.dev` + both Todoist vars and no secret, the server boots, logs "Todoist app configured", `secureCookies:true`. `deploy/.env.example` ships the field **empty** by design, so the documented setup path lands here on one omission. | Anyone who obtains a `glu_todoist` cookie unseals it with a key from the repo and recovers the owner's Todoist access + refresh token — full `data:read_write` on their account. Forging a cookie is equally trivial. | `throw` in `readConfig` when the origin is https (or `NODE_ENV==='production'`) and the secret is absent/short. Keep the fallback for dev only. |
| F-2 | **High** | G3 | `deploy/Caddyfile.example:24` vs `web/src/chrome/ChromeBootstrap.tsx:40`, `web/src/app/layout.tsx:48` | CSP `script-src 'self'` blocks every inline script the app needs. Verified against the production standalone build: `/glu` serves **11 inline `<script>` blocks, 0 nonces** — Mantine's `ColorSchemeScript`, the ADR 15 bootstrap, and Next's own RSC/hydration bootstraps. No hashes in the policy, no Next middleware to mint a nonce. | Under the deployed CSP the app never hydrates — dead timer, not just a theme flash. The predictable go-live fix under pressure is adding `'unsafe-inline'`, which deletes the repo's primary XSS mitigation while appearing to keep a strict CSP. | Don't loosen `script-src`. Add a Next middleware issuing a per-request nonce and emit the CSP from the app (`'self' 'nonce-…' 'strict-dynamic'`), dropping it from Caddy so one tier owns it. Then actually execute ADR 16's deferred criterion before Phase B. |
| F-3 | **Medium** | H1 | `backend/authRoutes.ts:47-72` | The OAuth callback is unauthenticated-reachable amplification. An attacker sets their own `glu_oauth_state=s` cookie and calls `?code=x&state=s` — the state check passes because they control both halves (it is CSRF protection, not authentication) — and the server performs a live POST to Todoist's token endpoint. Verified: `502 exchange_failed` after ~93 ms (real round trip); without the cookie, `403`. No rate limiting exists anywhere in the app. | Each request becomes an outbound Todoist token-endpoint call. Sustained, it burns the app's Todoist rate budget — potentially locking the real user out of login — and uses the box as an amplifier. | ~15 lines of Map-based bucket, or `express-rate-limit`, on `/auth/todoist/*` in `backend/app.ts`. 10/min/IP is ample for a single-user app. |
| F-4 | **Medium** | H8 | `web/src/components/todoist/useTimeComments.ts:70-97`, `web/src/store/gluStore.ts:390` | Outbox retries are unbounded. `drain()` selects entries by `postAfter <= now` alone and runs every 2 s. `markOutboxAttempt` increments `attempts`, and **nothing ever reads it** — verified, the only other reference is an assertion in `timeComments.test.ts:160`. | A persistently-failing entry (e.g. task deleted upstream → 4xx) retries forever while the app is open, up to 20 queued entries every 2 s. On a tablet left running, that's an indefinite self-inflicted load on the proxy and Todoist's rate limit. | Use the counter already kept: drop or back off exponentially past N attempts in `drain()`'s filter, and drop immediately on a non-network 4xx. |
| F-5 | Low | D11 | `backend/app.ts:15-35` | No error-handling middleware, so `express.json()` failures fall to Express's default finalhandler. Verified: malformed JSON or a >64 kb body on `POST /glu/api/todoist/comment` — both reachable **unauthenticated**, since the parser is mounted before the router — returns **HTML**, not the documented `{error}` JSON. With `NODE_ENV` unset it carries a full filesystem-path stack trace; with `NODE_ENV=production` it's a bare `Bad Request`. | Production is protected by exactly one `ENV` line in `backend/Dockerfile`. `deploy/docker-compose.example.yml` sets `NODE_ENV` on **web** but not on **api**, so nothing outside the image reasserts it. | Add a terminal error middleware in `createApp` returning `{error:"bad_request"}` / `{error:"payload_too_large"}`, and set `NODE_ENV: production` on the api service in compose. |
| F-6 | Low | A6 | `backend/config.ts:46` | `secureCookies` is `publicOrigin.startsWith("https://")`. Verified: `PUBLIC_ORIGIN=ioan.dev` → `secureCookies:false`, session cookie set without `Secure`. `https://ioan.dev/` → `redirect_uri` of `https://ioan.dev//glu/api/…`. | Partially self-limiting — a scheme-less origin also produces a redirect URI Todoist rejects, so login likely breaks before a cookie is minted. Still a config error that silently downgrades cookie security rather than refusing to start. | Parse with `new URL()` at startup, reject non-http(s), strip trailing slash, derive `secureCookies` from `url.protocol`. |
| F-7 | Low | J2 | `web/package.json` → `.next/standalone/node_modules/sharp` | Vulnerable `sharp`/libvips (CVE-2026-33327/33328/35590/35591) is traced into the production web image — verified in the build output. `npm audit` (web): 12 high, all others dev-tree only. The standalone server still serves `/glu/_next/image`: verified `?url=%2Fglu%2Ficon.png` → 200 (sharp executes); remote URLs → 400 "url parameter is not allowed" (no `remotePatterns` → no SSRF). | Bounded: the decoder only ever sees repo-owned static assets, and there's no path for attacker-supplied bytes. Shipped-vulnerable-but-unreachable, plus dead weight. | `images: { unoptimized: true }` in `web/next.config.ts` — GLU uses zero `next/image`. Removes the route, drops sharp from the trace, shrinks the image. |
| F-8 | Low | G7 | `web/next.config.ts` | `X-Powered-By: Next.js` on every web response — verified via `curl -I` on the standalone build. Express disables its own ✓ and Caddy strips `-Server`, but nothing strips Next's. | Version fingerprinting; trivial but it's the one header the Caddyfile's hardening block missed. | `poweredByHeader: false`, or add `-X-Powered-By` to the Caddyfile header block. |
| F-9 | Low | B4 | `backend/todoistRoutes.ts:318-332` | The three write routes rely solely on `SameSite=Lax` for CSRF. `close`/`reopen` take no body, so a cross-site auto-submitting form POST is a complete request; verified the proxy doesn't reject non-JSON content types (a form-encoded POST reaches the handler, returning 401 only for lack of a session). | Correct today — Lax withholds the cookie on cross-site POST — but it's a single control with no defense in depth, and Lax is a browser-side default that has moved before. | In `guarded()`, require `Sec-Fetch-Site: same-origin` (or match `Origin` to `PUBLIC_ORIGIN`) and reject non-`application/json` on writes. ~5 lines. |
| F-10 | Info | D1 | `web/src/chrome/ChromeBootstrap.tsx:21-23` | `chromeThemeId` is checked against the `CHROMES` allowlist before use; `activeClockId` is only type-checked, then written to `data-clock` via `setAttribute`. Not exploitable — a `data-*` value is never parsed as markup, and writing localStorage already implies same-origin execution. | None security-wise; the comment directly above claims "Unknown ids fall back rather than landing on a selector with no rule", which is true for `chrome` and false for `clock`. | Validate `activeClockId` against the registered ids, or fix the comment. |

### Positive observations

Verified working, worth protecting through the next refactor:

- **Token containment holds.** Nothing in the built bundle matches `TODOIST_CLIENT|SESSION_SECRET|client_secret`; zero `NEXT_PUBLIC_*` anywhere in the repo. `e2e/features.spec.ts:653` asserts `document.cookie` never exposes `glu_todoist`.
- **The allowlist is real, not aspirational.** Live probe: unknown path → 404 `not_allowlisted`; `POST`/`PUT`/`DELETE` on unnamed routes → 404; known route without cookie → 401; traversal via `--path-as-is` and `%2e%2e` → 404.
- **Zero CORS headers.** `OPTIONS` → 404; a cross-origin `Origin` header produces no `Access-Control-*` in response. B12 clean.
- **Backend runtime dependency tree is clean** — `npm audit --omit=dev` → 0 vulnerabilities, 3 direct dependencies.
- **68 backend tests pass**, encoding the allowlist matrix, SSRF rejections, state mismatch and refresh-failure paths — the invariants have teeth.
- **The image proxy matches ADR 13 exactly**: parse-then-check host allowlist, https-only, `redirect:"error"`, streaming size cap, timeout.
- **Server-composed write payloads** with integer bounds; author filter on `posted_uid`; anchored `^\[(\d+)m\] ` parser.
- **The smoke suite touches no Todoist routes** — `@smoke` covers timer, clock, health only, so production runs create nothing in the owner's account.
- **Deployment posture is sound**: non-root containers, separate prod-deps stage, pinned bases, no published ports but Caddy's, `.env` mode 600 documented, secrets never given to CI.
- **`.gitignore` is correct** (`.env*` with `!.env.example`) and no real `.env` exists in the tree. Note: the repo has **zero commits**, so the history scan is vacuously clean — the gitignore will be load-bearing at the first commit.

### ADR deviations

- **ADR 12** decides that an invalid filter surfaces Todoist's error text; the code never captures upstream bodies and relays its own constructed message. Safer, but unrecorded — CLAUDE.md requires deviations be written into the ADR in the same session.
- **ADR 16's** CSP acceptance criterion is marked deferred and, per F-2, would fail today. That is the one deferred criterion with a security consequence.

---

## Risk summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 2 |
| Medium | 2 |
| Low | 5 |
| Info | 2 |

Nothing here is exploitable against the app as it stands today, and Phase B has not gone live — which is precisely the window in which both High findings are cheap. F-1 and F-2 are both *pre-deployment* problems: one is armed by the documented setup path, the other is armed the first time the Caddyfile is applied.

## Top 10 priority fixes

| # | Fix | Sev | Type |
|---|---|---|---|
| 1 | Fail fast on a missing/short `SESSION_SECRET` in production (`backend/config.ts`) | High | code |
| 2 | Reconcile CSP with the required inline scripts via a nonce middleware — and execute ADR 16's deferred criterion before go-live | High | design + code |
| 3 | Rate-limit `/auth/todoist/*` to close the unauthenticated upstream amplification | Medium | code |
| 4 | Bound outbox retries using the `attempts` counter already persisted | Medium | code |
| 5 | Add a JSON error-handling middleware; set `NODE_ENV: production` on the api service in compose | Low | code |
| 6 | Validate `PUBLIC_ORIGIN` with `new URL()` and derive `secureCookies` from the parsed protocol | Low | code |
| 7 | `images: { unoptimized: true }` — drops the unused optimizer route and vulnerable sharp | Low | code |
| 8 | Add an `Origin`/`Sec-Fetch-Site` + content-type check on the three write routes | Low | code |
| 9 | `poweredByHeader: false` | Low | code |
| 10 | Record the ADR 12 error-text deviation; validate `activeClockId` in the bootstrap | Info | design + code |

## Not verified

Two things could not be verified from this environment and are flagged rather than asserted:

- **The live CSP behaviour on the real `ioan.dev` deployment.** Phase B is not activated, so F-2 was established by serving the production build and comparing its emitted HTML against the Caddyfile's declared policy.
- **Whether the production `/srv/glu/docker-compose.yml` pins `:sha-…` rather than `:latest`.** That file lives on the server, outside this repo.
