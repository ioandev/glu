---
description: Structured OWASP security audit of GLU ADRs, code, or both
argument-hint: [ADR NN | path/feature | full]
---

Run a structured OWASP security audit on ADRs, code, or both. Pass an ADR number/name, a file/directory/feature, or `full` for a complete audit.

You are a senior application security engineer with deep expertise in OWASP Top 10 (Web, API), OAuth 2.0 / token-handling attack surfaces, SSRF and proxy design, browser-side security (CSP, XSS, cookies), and secure architecture review. Your job is to perform a structured security audit of either **ADRs** (design-time) or **code** (implementation-time) in the **GLU** repo.

Determine your mode from `$ARGUMENTS`:
- If it names an ADR (e.g. "ADR 11", "11", "the Todoist auth ADR", "the proxy ADRs", "all ADRs") → **ADR AUDIT MODE**
- If it names a file, directory, package, or feature (e.g. `backend/`, `web/src/components/todoist`, "the image proxy", "the sealed cookie", "the chrome bootstrap", "deploy") → **CODE AUDIT MODE**
- If blank or "full" → **FULL AUDIT MODE** (both ADRs and code)

---

## Project context

Read `CLAUDE.md` first, then `PLAN.md` and the relevant ADRs in `docs/adr/`. **The ADR is the contract** — it defines scope, invariants and acceptance criteria, and a violation of an ADR is itself a finding. Do not audit against assumptions the ADRs have already settled: most of the "why isn't there a X" questions are answered as explicit product decisions (no database, no service worker, no multi-user). Check first, then audit the *mitigation* rather than re-reporting the settled item as missing.

**Stack & topology you are auditing:**
- **`web/`** — Next.js 16 (App Router) + Mantine 9 + Tailwind v4 utility layer, TypeScript, Zustand 5. Served under **`basePath: '/glu'`**. Ships as a `standalone` image (`glu-web`). Holds no secrets and does no server-side data access; its only route handler is `/glu/healthz`.
- **`backend/`** — Express 5, CommonJS, **stateless Todoist proxy** mounted at **`/glu/api`** (`glu-api` image). Four auth routes + an allowlisted Todoist surface. **No database, no session store, no server-side state at all** — MariaDB was considered and rejected (2026-07-24).
- **Auth** — Todoist OAuth authorization-code flow. The token set `{accessToken, refreshToken, expiresAt}` lives **only** inside an `iron-session`-sealed httpOnly cookie (`glu_todoist`, `Path=/glu`, `SameSite=Lax`, `Secure` when `PUBLIC_ORIGIN` is https). The browser holds an encrypted blob; only the server can open it; the server stores nothing.
- **Deploy** — **nginx-proxy** terminates TLS on `ioan.dev` (with acme-companion for Let's Encrypt) and routes by `VIRTUAL_PATH` prefix: `/glu/api` → `api:4000`, `/glu` → `web:3000`, resolved by nginx's longest-prefix-wins rule. Only the proxy publishes ports. Images from GHCR, built and pushed by `.github/workflows/publish.yml` (Phase B, **not yet activated** — `workflow_dispatch` only).
- **Client state** — localStorage only, under the versioned key `glu:vN` (currently `glu:v2`): timer, environment toggles, chrome/clock ids, sessions-per-day and a 90-day archive. Auth status and the 50 ms tick value never persist.
- **Single user by design.** There is no account system, no tenancy, no user-to-user boundary inside GLU. The security boundaries that exist are: *browser ↔ our server*, *our server ↔ Todoist*, and *this Todoist account ↔ other people's content in shared projects*.

**Load-bearing security facts (from `CLAUDE.md` / the ADRs — verify against them, don't restate blindly):**
- **The Todoist token never reaches the browser** (ADR 11's standing rule). Any code path that puts access- or refresh-token material into a response body, a URL, a log line, a `NEXT_PUBLIC_*` value, or the client bundle is **Critical**.
- **The proxy is an allowlist, never a passthrough** (ADR 12). The cookie carries a `data:read_write` token, so a generic passthrough would hand any XSS the whole Todoist account, deletes included. The write surface is exactly **three routes**: `POST /todoist/comment` (ADR 14), `POST /todoist/task/:id/close` and `/reopen` (ADR 20). Everything unnamed answers `404 not_allowlisted`. A fourth write verb without an ADR is a finding.
- **The cookie is the CSRF surface.** It is httpOnly and auto-attached same-origin, so the defenses are `SameSite=Lax` + no CORS headers anywhere + the fact that every state-changing route is a `POST` with a JSON body. A state-changing `GET`, a permissive `Access-Control-Allow-Origin`, or a form-encoded write route each break that chain.
- **`SameSite=Lax` is deliberate, not sloppy** (ADR 11): the OAuth callback is a top-level cross-site GET and `Strict` would withhold the state cookie. Audit the compensating controls, don't re-litigate the choice.
- **The image proxy is SSRF-hardened by construction** (ADR 13, `backend/todoistRoutes.ts`): parse-then-check exact **host allowlist** (`ATTACHMENT_HOSTS`), `https:` only, image-only content-type, `redirect: "error"`, 10 MB cap enforced **while streaming**, 10 s timeout. It is the only place the server fetches a URL that came from data.
- **Markdown is stripped, never rendered** (ADR 12/13). `toPlainText()` at the proxy boundary **is** the XSS posture — there is no sanitizer in the tree because there is no HTML. Introducing a markdown renderer, a `dangerouslySetInnerHTML` of Todoist content, or a link-ification pass requires an explicit sanitization amendment; doing it without one is a finding.
- **Todoist content is untrusted third-party input.** Shared projects mean other people author task titles, descriptions, comments and attachments. ADR 14 filters time-comments by `posted_uid` precisely because other users can imitate the `[Nm] ` format.
- **The server composes write payloads; the client only parameterises them** (ADR 14). `POST /comment` takes `{taskId, minutes}` and builds the text itself, bounded to 1..`MAX_COMMENT_MINUTES` (40320). A hijacked frontend can only post well-formed time comments.
- **Secrets come from the environment, never `NEXT_PUBLIC_*`** — `TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET`, `SESSION_SECRET`, `PUBLIC_ORIGIN`. `.env*` is gitignored; `.env.example` is committed with **empty** values on purpose.
- **`config.ts` has a development fallback `SESSION_SECRET`.** It is deliberately obviously-fake, but it means a production deploy with a missing/short `SESSION_SECRET` **fails open into a publicly-known sealing key**. Verifying that this cannot silently happen in prod is a standing audit item, not a nitpick.
- **Security headers are app-owned; only HSTS is at the proxy** (ADR 16 amendments 2026-07-25). The page CSP is per-request and **nonce-based**, emitted by `web/src/proxy.ts` (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self'`, `img-src 'self' data: blob:`, `frame-ancestors 'none'`, `base-uri 'none'`). The API sends its own `default-src 'none'` CSP plus `nosniff` / `X-Frame-Options: DENY` / `Referrer-Policy` from `backend/security.ts`; the web tier sends the same three from `web/next.config.ts`. HSTS preload comes from the proxy's `HSTS` variable. **A CSP in proxy config is a finding**: two `Content-Security-Policy` headers intersect and the proxy cannot know the nonce.
- **Both tiers rate-limit per client IP, in memory** (ADR 24). Token buckets in `web/src/lib/rateLimit.ts` and `backend/security.ts` — duplicated on purpose (ADR 22 forbids sharing), with ADR 24's limits table as the contract. The client is resolved `X-Glu-Client-IP` → `X-Real-IP` → **rightmost** `X-Forwarded-For` → socket, and IPv6 is keyed by /64. Three standing findings live here: reading the **leftmost** forwarded entry (spoofable whenever a hop appends), keying IPv6 by /128 (a client rotates through its own subnet), and metering `/healthz` on either tier (a 429 there fails the container healthcheck and takes the site down).
- **PWA = installable only, NOT offline** (product decision 2026-07-23). **No service worker anywhere.** There is no push, no cache storage, no background sync — so that whole checklist family does not apply, and adding any of it without an ADR is itself the finding.
- **Session data is localStorage-only, permanently** (ADR 05, cancelled backend & sync). The 90-day archive cap is standing policy. Nothing about a focus session ever leaves the device.

---

## Master checklist

Apply every relevant item. Some families genuinely don't apply to GLU — no passwords, no JWTs, no SQL, no tenancy, no service worker, no mobile app — but *verify* rather than assume. For each finding, report:
- **Severity:** Critical / High / Medium / Low / Info
- **Category:** the checklist ID it falls under
- **Location:** `file:line`, ADR reference, or the architectural concern
- **Finding:** what is wrong or missing
- **Risk:** what an attacker could actually do, in GLU's real topology
- **Recommendation:** a specific fix, not vague advice

### A. OAuth flow & the sealed session cookie (OWASP Web A07, API2)

- [ ] A1. `state` is CSRNG-generated (`randomBytes(24).toString("base64url")`), stored in a short-TTL httpOnly cookie, and **verified on callback** — mismatch or absence → `403`, no session, ever (ADR 11, `authRoutes.ts`).
- [ ] A2. The state cookie is cleared on every callback attempt (success *and* failure), so a `state` cannot be replayed by a second request.
- [ ] A3. The code→token exchange happens **server-side with the client secret**; the secret never reaches the browser and never appears in a redirect URL (ADR 11).
- [ ] A4. `redirect_uri` is derived from `PUBLIC_ORIGIN` server-side and is **not** influenced by any request parameter — no open-redirect / redirect-hijack input.
- [ ] A5. The post-callback redirect target (`appUrl()`) is likewise server-derived; no `?next=`/`?returnTo=` style parameter exists that could be pointed off-origin (open redirect).
- [ ] A6. Session cookie flags: `httpOnly`, `SameSite=Lax`, `Path=/glu`, and `Secure` whenever `PUBLIC_ORIGIN` is https. Confirm `secureCookies` cannot end up `false` in production (it keys off the origin string — a misconfigured `PUBLIC_ORIGIN` silently drops `Secure`).
- [ ] A7. `SESSION_SECRET` is ≥32 chars of real entropy from env. **Verify the dev fallback in `config.ts` cannot be in effect in production** — a known sealing key means anyone can forge a session cookie carrying their own token, or decrypt a stolen one.
- [ ] A8. A tampered, truncated or stale-key cookie degrades to **logged out**, never to a 500 or a stack trace (`readSession` catch → `null`).
- [ ] A9. The sealed payload carries only `{accessToken, refreshToken, expiresAt}` — no extra PII, no Todoist profile data cached in the cookie.
- [ ] A10. Cookie lifetime is bounded and intentional (currently `maxAge` 400 days, the browser cap) — and the ADR's reasoning for an effectively-permanent session on a single-user device still holds. Note the consequence: **there is no server-side revocation**; logout and refresh-failure clearing are the only invalidation paths.
- [ ] A11. Refresh handling is correct and safe: expired-with-skew triggers refresh, a rotated `refresh_token` is persisted, a refresh that omits one keeps the previous, and a **failed** refresh clears the session and answers `401`/`{authenticated:false}` rather than retrying forever (`requireTokens`, ADR 11).
- [ ] A12. Refresh failures are logged **without** token material — `console.warn` must carry the message, never the token set.
- [ ] A13. `POST /auth/todoist/logout` clears the cookie with the *same* attributes it was set with (a `Path` mismatch silently fails to clear), and is a POST (not a GET) so it cannot be triggered by a cross-site image tag.
- [ ] A14. `GET /auth/todoist/status` leaks nothing beyond `{authenticated, name, id}` for the *signed-in* account — no email, no token, no scope dump.
- [ ] A15. `todoist_not_configured` (503) and every auth error return a generic code — no client-id/secret echo, no upstream body relayed verbatim.
- [ ] A16. Nothing in the flow depends on a client-supplied `client_id`, `scope` or `redirect_uri`; scope is the constant `data:read_write` (ADR 11's deliberate choice — audit the blast radius that scope implies, not the choice).

### B. The proxy allowlist & write surface (OWASP API1/API5, A01)

- [ ] B1. The router is an **allowlist**: every route is individually named, and the terminal `router.use` answers `404 not_allowlisted`. No `:path*`, no method-agnostic forwarder, no `req.path` interpolated into an upstream URL.
- [ ] B2. **Exactly three write routes exist** (comment, close, reopen). Any new write verb traces back to an ADR; any un-ADR'd one is a finding (ADR 14/20).
- [ ] B3. Every proxied route goes through `guarded()` → `requireTokens()`. A route that reads the session directly, or one that answers before auth, breaks the single funnel.
- [ ] B4. No state-changing operation is reachable by `GET` (CSRF via `<img>`/top-level navigation, which `SameSite=Lax` does **not** stop for top-level GETs).
- [ ] B5. Client-supplied path segments are `encodeURIComponent`-wrapped before being spliced into an upstream path (`/task/:id`, `close`, `reopen`) — verify none reaches `new URL()` raw, and that a `..`-style id cannot escape the intended Todoist endpoint.
- [ ] B6. Client-supplied **query** values (`type`, `id`, `query`, `projectId`, `taskId`) reach Todoist only as `URLSearchParams` values, never as raw URL text; the `type` switch rejects unknown values with `400` rather than falling through to a default fetch.
- [ ] B7. The `/tasks?type=filter&query=…` route forwards a **user-authored filter expression** to Todoist. Confirm the blast radius is bounded to that user's own account (it is their token, their data) and that a rejected filter surfaces as a 4xx rather than as an upstream error body.
- [ ] B8. `POST /comment` validates `{taskId, minutes}` — non-empty id, `Number.isInteger`, `1 ≤ minutes ≤ MAX_COMMENT_MINUTES` — and **composes the content server-side**. No client-supplied comment text, ever (ADR 14).
- [ ] B9. The proxy remains **append-only**: no delete verb for comments or tasks (ADR 14's deliberate "undo by grace period, not by delete").
- [ ] B10. Default-deny for anything new: a route added without a matching ADR line, or a body field accepted without validation, is a finding regardless of how harmless it looks.
- [ ] B11. `express.json({limit:"64kb"})` (or tighter) applies to every write route, and no route reads an unbounded stream.
- [ ] B12. The proxy sets no CORS headers at all — it is same-origin by construction. Any `Access-Control-Allow-Origin`, especially with credentials, is a **Critical** regression (it turns the sealed cookie into a cross-origin key to the Todoist account).

### C. SSRF & upstream calls (OWASP Web A10)

- [ ] C1. `isAllowedAttachmentUrl` **parses then checks** — `new URL()` first, then `protocol === "https:"` and `ATTACHMENT_HOSTS.has(url.hostname)`. A substring/`startsWith`/`includes` test on the raw string is the classic bypass (`https://evil.com/?x=files.todoist.com`, `https://files.todoist.com@evil.com/`).
- [ ] C2. `redirect: "error"` — redirects are **refused**, not followed-and-rechecked. A followed redirect defeats the host allowlist in one hop.
- [ ] C3. The content-type must start with `image/`; anything else is refused **before** bytes reach the client (prevents the proxy laundering HTML/JS onto our own origin, which would be a same-origin XSS vector past CSP).
- [ ] C4. The 10 MB cap is enforced **while streaming**, not by trusting `content-length` alone, and the stream is destroyed + the fetch aborted when it trips.
- [ ] C5. Every upstream call has an `AbortController` timeout (`UPSTREAM_TIMEOUT_MS`, and the attachment route's own 10 s) — a hung upstream must not pin a connection indefinitely.
- [ ] C6. The bearer is sent to attachment hosts deliberately (ADR 13) **only because** the allowlist pins the destination to Todoist-owned storage. Verify the allowlist is still exclusively Todoist infrastructure — a wildcard, a CDN shared with third parties, or a user-influenced host entry would leak the access token.
- [ ] C7. Attachment URLs come from **structured Todoist attachment metadata**, never from parsing comment text (ADR 13) — no path from user-authored markdown to a proxied fetch.
- [ ] C8. The proxy never fetches a URL from the *request body* or from anywhere but the `url` query param, and that param is checked before any DNS/socket work happens.
- [ ] C9. Rejected hosts/content-types are logged **truncated** (`raw.slice(0,120)`) — no unbounded attacker-controlled string into the log.
- [ ] C10. The `collect`/`collectAll` pagination loops are bounded (20 attempts / 40 pages) and the bound being hit is logged, not silently swallowed — an attacker-influenced cursor cannot spin the server forever.

### D. Untrusted content in the web tier (OWASP Web A03, A07)

- [ ] D1. **No `dangerouslySetInnerHTML` carries Todoist-derived data.** The two legitimate uses (`ChromeBootstrap`'s token stylesheet and pre-paint script) are built from **static, repo-owned** constants — verify nothing user- or API-derived is interpolated into either. A stored value read from `localStorage` inside that inline script is parsed with `JSON.parse` in a `try/catch` and only used after an id-allowlist check; confirm it stays that way.
- [ ] D2. All task/comment text renders through React's text interpolation (Mantine `<Text>`), never as HTML. `toPlainText()` is a *display* normaliser at the proxy boundary — do not credit it as a sanitizer, and do not let it become the excuse for rendering HTML later.
- [ ] D3. Comment images are `<img src>` pointed at **our own** `/glu/api/todoist/attachment?url=…` — never a Todoist host directly (which would leak a referer and widen CSP `img-src`).
- [ ] D4. No Todoist-derived string reaches an `href`, `src`, `style` value, `srcDoc`, or a `window.open` target. A `javascript:` or `data:` URL from a task field must have nowhere to land.
- [ ] D5. External links (the GitHub link in `HeaderDrawer`) carry `rel="noopener noreferrer"` with `target="_blank"`.
- [ ] D6. The regexes in `toPlainText()` and `parseTimeComment()` are linear-time on adversarial input — they run on third-party comment text. Check for nested quantifiers / catastrophic backtracking, and note that comment content is capped upstream.
- [ ] D7. `parseTimeComment` stays **anchored** (`^\[(\d+)m\] `) so a quoted `[5m] …` inside somebody else's reply cannot inflate a total (ADR 14's stated gotcha), and out-of-range values are ignored rather than thrown.
- [ ] D8. Time totals filter by `posted_uid !== user.id` — another member of a shared project cannot inject minutes into your total (ADR 14).
- [ ] D9. Numbers from upstream (`image_width/height`, `child_order`, `priority`) are used only in safe positions; `aspectRatio` interpolation cannot break out of the style value.
- [ ] D10. Error text from the proxy (`{error, message}` where `message` is `(error as Error).message`) is rendered as text and is not attacker-controllable into a dangerous sink — and check the reverse direction too (D11).
- [ ] D11. **Internal detail leakage:** `upstream_error` relays a raw `Error.message` to the client. Verify it can never carry a URL with a token, an internal hostname, or a stack fragment.
- [ ] D12. The Zustand persisted blob is treated as **untrusted input on read**: a corrupt or hand-edited `glu:vN` must load clean defaults (it does — `storage.ts` catch), and unknown chrome/clock ids must fall back rather than being written into a DOM attribute or selector unchecked.

### E. Secrets & configuration (OWASP Web A05, A02)

- [ ] E1. `TODOIST_CLIENT_SECRET`, `SESSION_SECRET` and `TODOIST_CLIENT_ID` exist **only** in `backend/` server code, sourced from `process.env` — never in `web/`, never `NEXT_PUBLIC_*`, never in a Next config or build arg.
- [ ] E2. No secret is baked into an image layer: both Dockerfiles take secrets at run time via compose `env_file`; `.dockerignore` excludes `.env*` from both build contexts.
- [ ] E3. `.gitignore` covers `.env*` with `!.env.example`; `git log`/`git show` contain no real secret. Grep history, not just the worktree.
- [ ] E4. Both `.env.example` files ship **empty** values with a generation recipe — no realistic-looking placeholder that could get copied into production (this is why they're empty; confirm nobody "helpfully" filled one in).
- [ ] E5. The web bundle contains no secret: `grep` the built `.next` output for the client id, any `TODOIST_`/`SESSION_` string, and any `sk`/`Bearer` pattern.
- [ ] E6. `PUBLIC_ORIGIN` is https in production (it drives both the OAuth redirect URI **and** the `Secure` cookie flag — one variable, two security consequences).
- [ ] E7. Nothing logs a token, a sealed cookie, an `Authorization` header or a request body containing one. Audit every `console.log`/`console.warn` in `backend/`.
- [ ] E8. Secret rotation is possible and documented: rotating `SESSION_SECRET` invalidates every sealed cookie (users land logged-out, which is the correct failure), and rotating the Todoist client secret requires re-consent. Confirm `deploy/SERVER.md` / `HUMAN-TODO.md` say so.
- [ ] E9. The deploy secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`) live in GitHub Environments/Secrets, are never echoed by a workflow step, and the SSH key is scoped to the deploy user only.

### F. Client-side data & browser permissions (OWASP Web A02, A04)

- [ ] F1. The `glu:vN` blob contains **no token and no auth status** — auth is server-truth-per-request by design (ADR 11/19). Verify `partialize` still excludes both. It *does* legitimately persist Todoist-derived data (`focusedTask` id/title, `todoistSource` id/query, the `outbox`), so treat the blob as holding third-party content at rest: it must never hold anything the proxy wouldn't return, and `focusedTask.title` re-enters the DOM on load (see D12).
- [ ] F2. `document.cookie` cannot read the session (httpOnly) and no code attempts to.
- [ ] F3. The 90-day archive cap is enforced on write (ADR 05) — unbounded growth in localStorage is a real availability bug on a tablet.
- [ ] F4. Blob-version migration (`glu:v1` → `glu:v2`) never trusts stored shapes: unknown fields dropped, wrong types coerced or defaulted, corrupt JSON → clean defaults.
- [ ] F5. Browser permission requests (Notification, ADR 18; Wake Lock, ADR 17) are **user-gesture-initiated**, requested no earlier than needed, and every denial/failure path degrades silently rather than nagging or breaking the timer.
- [ ] F6. Notification bodies carry no sensitive content beyond the app's own session state (there is no Todoist content in them — verify), and the audio chime is gesture-unlocked, not autoplaying.
- [ ] F7. Wake lock is released on visibility change / timer end and cannot be held indefinitely by a backgrounded tab.
- [ ] F8. **No service worker, no Cache Storage, no push subscription anywhere** in `web/` (ADR 04's hard constraint). Any `navigator.serviceWorker.register`, `workbox`, `next-pwa`, or `manifest` `"serviceworker"` key is a finding.
- [ ] F9. The PWA manifest (`app/manifest.ts`) declares a correct scoped `start_url`/`scope` under `/glu` — a scope of `/` on a shared origin would let GLU's install claim sibling paths.
- [ ] F10. Nothing sensitive is put in `sessionStorage`, `IndexedDB`, the URL fragment, or a query string.
- [ ] F11. **The persisted `outbox` is a stored write queue** (ADR 14): entries survive a reload and are dispatched to Todoist on next load. Hand-edited localStorage is therefore an input to a write path — confirm the damage stays bounded by `OUTBOX_CAP` (20), the undo grace, and above all the *server-side* bounds in B8 (the proxy composes the text and range-checks minutes, so a forged entry cannot become arbitrary comment content).

### G. Transport, headers & CSP (app-owned, except HSTS)

- [ ] G1. TLS everywhere in production; HSTS is set with a long max-age (`includeSubDomains; preload` — note that `preload` on the apex commits **every** `ioan.dev` subdomain; confirm that's intended).
- [ ] G2. `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` **and** CSP `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`, `Referrer-Policy: strict-origin-when-cross-origin` are all present.
- [ ] G3. **CSP vs. inline code — verify by loading the built page, not by reading config.** The app ships required inline `<script>` (`ChromeBootstrap`'s pre-paint bootstrap, Mantine's `ColorSchemeScript`, Next's hydration bootstraps). Confirm every one carries the request's nonce, that the header nonce matches the body's and rotates per request, and that `script-src` was not quietly loosened to `'unsafe-inline'` — which would undo the main XSS mitigation. Also confirm exactly **one** `Content-Security-Policy` header reaches the browser.
- [ ] G4. `style-src 'unsafe-inline'` is accepted for Mantine's inline CSS-variable style attributes — confirm it is still *only* that, and that no script-bearing sink hides behind it.
- [ ] G5. `connect-src 'self'` and `img-src 'self' data: blob:` — no Todoist host in either. If an image ever renders from a Todoist host directly, the fix is the proxy, not a CSP widening (ADR 13's explicit rule).
- [ ] G6. Path routing still sends `/glu/api/*` to the API. nginx-proxy emits plain prefix locations, so longest-prefix-wins makes this order-independent — but confirm `VIRTUAL_PATH` carries **no trailing slash** (`/glu/` would not match the canonical bare `/glu`) and that `VIRTUAL_DEST` stays unset (setting it to `/` strips the prefix and 404s every route).
- [ ] G7. `-Server` header removal and `app.disable("x-powered-by")` both in place — no version fingerprinting.
- [ ] G8. Authenticated proxy responses are not cached by intermediaries. Note the attachment route sets `Cache-Control: private, max-age=300`; verify every other proxy response is at minimum not publicly cacheable.
- [ ] G9. Only the `nginx-proxy` container publishes ports; `web` and `api` have no `ports:` entry and are unreachable from the internet directly. The proxy mounts the Docker socket **read-only** — a writable mount is root on the host and a Critical finding.
- [ ] G10. `/glu/healthz` and `/glu/api/healthz` expose liveness only — no version, no config, no env dump.

### H. Availability & abuse (OWASP API4)

- [ ] H1. **There is no rate limiting in the Express app.** Establish honestly which endpoints are reachable without a session — `/api/healthz`, `/auth/todoist/login`, `/auth/todoist/callback` — and what an unauthenticated flood of each actually costs (login mints a cookie + redirect; callback performs an upstream POST to Todoist per request, which is the expensive one and can burn the app's Todoist rate budget). Recommend a bounded fix proportional to a single-user app; do not prescribe a token-bucket fleet.
- [ ] H2. Authenticated endpoints amplify: one `/task/:id/time-total` call can trigger up to 40 upstream page fetches. Confirm the bound exists, is logged when hit, and that no route is unbounded.
- [ ] H3. Body size is capped (64 kb) and the attachment stream is capped (10 MB) — no unbounded buffering anywhere.
- [ ] H4. `TASK_CAP` (200) and `COMMENT_CAP` (100) are enforced server-side, and truncation is *disclosed* to the UI (`truncated`, `cap`) rather than silently hiding data.
- [ ] H5. Container memory limits are set (`mem_limit` 512m/256m) so one tier cannot exhaust the box.
- [ ] H6. An upstream Todoist outage degrades to a 502 with a clean UI state — never a hang, never a crash loop, never a logged-out flash (ADR 19: **only 401 logs you out**, a 502 must not).
- [ ] H7. No unhandled promise rejection can take down the Express process; Express 5 handles rejected async handlers, and `guarded()` wraps the rest — verify nothing sits outside both.
- [ ] H8. The frontend cannot spin the proxy: polling intervals, retry-on-error paths and `useTaskCompletion`/`useTimeComments` outboxes have backoff or a bounded retry count.

### I. Containers & deployment

- [ ] I1. Both images run as the unprivileged `node` user, with `--chown=node:node` on copied trees.
- [ ] I2. Runtime images carry production dependencies only — the backend resolves `npm ci --omit=dev` in a separate stage so `tsx`/`vitest`/`supertest` never ship.
- [ ] I3. Base images are pinned to a major (`node:24-alpine`, `nginxproxy/nginx-proxy:1.7-alpine`, `nginxproxy/acme-companion:2.6`); no `:latest` base. Note that compose references `glu-web:latest`/`glu-api:latest` with a documented "pin to `sha-<short>` for rollback" comment — confirm the production compose actually pins, since `:latest` plus `docker compose pull` is an unreviewed-code-to-prod path.
- [ ] I4. `.dockerignore` in each package excludes `.env*`, tests, and tooling from the build context (a leaked `.env` in a layer is unrecoverable once pushed).
- [ ] I5. Healthchecks hit the **basePath-correct** URLs (`/glu/healthz`, `/glu/api/healthz`); a silently-404ing healthcheck means a dead tier stays in rotation.
- [ ] I6. No database service exists in compose (ADR 11's permanent decision) — if one appears, that is an architectural finding before it is a security one.
- [ ] I7. The `certs` / `acme` volumes hold the TLS material and are not world-readable or bind-mounted from a shared path; the Docker socket is mounted `:ro` on nginx-proxy.
- [ ] I8. `deploy/SERVER.md` documents the host prerequisites (firewall, docker user, `.env` permissions `600`) — verify it says so and matches reality.

### J. CI/CD & supply chain

- [ ] J1. Both lockfiles (`web/package-lock.json`, `backend/package-lock.json`) are committed and CI installs with `npm ci`, never `npm install`.
- [ ] J2. `npm audit` on **both** packages is clean or triaged with a written reason. Run it; don't assume.
- [ ] J3. No wildcard/`latest` version ranges in either `package.json`; direct dependency count stays small (backend: express, cookie-parser, iron-session — adding a fourth is a decision, not a reflex).
- [ ] J4. Workflow actions are pinned to a major tag from a known publisher; `appleboy/ssh-action` in particular runs with a private key — confirm it's pinned and that the deploy script is `set -euo pipefail`.
- [ ] J5. `publish.yml` grants the minimum token scope (`contents: read`, `packages: write`) and the deploy job is gated on the `production` environment.
- [ ] J6. **Phase B is not yet activated** — the `push: branches: [main]` trigger is commented out on purpose. Uncommenting it means every push to main reaches production; confirm the branch protections and the human go-live decision recorded in `HUMAN-TODO.md` are in place first.
- [ ] J7. Deploy concurrency is serialised and `cancel-in-progress: false` — a half-finished deploy is worse than a slow one.
- [ ] J8. The smoke step runs `@smoke` Playwright tests against production; confirm it uses no real credentials and creates no data in the owner's Todoist account.
- [ ] J9. No workflow echoes a secret, and no `pull_request_target` / untrusted-fork trigger has access to secrets.
- [ ] J10. Nothing in either package runs an unexpected post-install script.

### K. GLU-specific invariants (the ADR contract)

- [ ] K1. **The backend stays a stateless Todoist proxy** — no database, no session store, no filesystem writes, no server-side session data (ADR 11, permanent since 2026-07-24).
- [ ] K2. **No service worker, no offline machinery** (ADR 04).
- [ ] K3. **The proxy's write surface is three routes** and append-only (ADR 14/20).
- [ ] K4. **`basePath: '/glu'` discipline** — no hardcoded root-relative URL, cookie `Path=/glu`, API at `/glu/api`. A path mismatch here is usually a bug, but the cookie one is a security bug (a cookie scoped to `/` widens where it is sent).
- [ ] K5. **Todoist scope stays `data:read_write`** — widening it (e.g. to project deletion or a broader scope) is a re-consent event and an ADR amendment, not a config tweak.
- [ ] K6. **Two independent packages, no root manifest** (ADR 22) — no shared dependency or root `package.json` sneaking in, since that would silently merge the two dependency trees and the two threat surfaces.
- [ ] K7. Every deviation the code makes from an ADR is recorded in that ADR (CLAUDE.md's rule). An undocumented security-relevant deviation is a finding in its own right.

---

## ADR AUDIT MODE

Read every ADR named by the user; for "all ADRs" read all of `docs/adr/`. Start from `CLAUDE.md`'s index and hard-constraints list, and follow the cross-references (ADRs 11 → 12 → 13 → 14 → 19 → 20 form the Todoist chain; 01/15 own styling; 04/17/18 own browser permissions; 16/22 own build & deploy). ADRs record *intent* — evaluate whether the stated design is secure by design. Many concerns are **already decided** in "Options considered" or "Out of scope"; credit the mitigation and audit *that*.

**Evaluate for each ADR:**
1. **Threat model coverage** — does it acknowledge the threats for its domain (token leak, XSS via third-party content, SSRF, CSRF, open redirect, secret exposure, upstream outage)?
2. **Secure defaults** — deny-by-default allowlist, strip-don't-render, refuse-don't-follow redirects, degrade-to-logged-out. Where does it default unsafe?
3. **Attack surface** — what new surface does the decision add (a route, a fetch, an inline script, a browser permission, a stored field)? Is it minimised?
4. **Failure modes** — on upstream error, expired token, corrupt blob, denied permission: does it fail open or closed, and is that the right choice? (GLU's house style is *degrade quietly to a safe state*, never an error screen — verify the "safe" half, not just the "quiet" half.)
5. **Checklist gaps** — which checklist IDs does the ADR address; which relevant ones does it not?
6. **Cross-ADR conflicts** — does its posture contradict another ADR (proxy allowlist vs. a new route, no-service-worker vs. offline behaviour, CSP vs. inline scripts, local-only archive vs. any upload)?

**Output per ADR:**
```
### ADR NN: <Title>

**Threat model:** <adequate / incomplete / missing — one line>

**Findings:**
<numbered: Severity · Category · Finding · Risk · Recommendation>

**Checklist coverage:**
- Addressed: <checklist IDs>
- Missing: <relevant checklist IDs not addressed>

**Verdict:** <secure by design / needs hardening / significant gaps — one line>
```

End with **Cross-cutting concerns** spanning multiple ADRs (token containment, the allowlist invariant, third-party-content handling, CSP vs. inline code, secret handling across dev/prod).

---

## CODE AUDIT MODE

Read the code at the location(s) the user named and **follow the call chain** — browser `apiFetch` → nginx-proxy → Express router → `guarded` → `requireTokens` → `readSession`/`refreshTokens` → `todoistGet`/`todoistPost` → upstream, and back out through `toUiTask`/`toUiComment` into the React tree. Don't audit only the top-level file: most GLU findings live at a boundary (proxy↔upstream, proxy↔browser, blob↔DOM).

**High-value files, when the user's target doesn't already point at them:**
`backend/config.ts` · `backend/session.ts` · `backend/authRoutes.ts` · `backend/todoistRoutes.ts` · `backend/todoist.ts` · `backend/app.ts` · `web/src/lib/api.ts` · `web/src/store/storage.ts` · `web/src/chrome/ChromeBootstrap.tsx` · `web/src/components/todoist/*` · `deploy/docker-compose.example.yml` · `deploy/SERVER.md` · `.github/workflows/*.yml`

**Evaluate for each file/module:**
1. **ADR compliance** — does the code implement what the ADR specifies? Flag deviations (a fourth write route, a rendered markdown string, a token in a response, a widened allowlist).
2. **Boundary validation** — is every value that crossed a trust boundary validated *at* that boundary, with the right type and bounds?
3. **Defensive coding** — errors handled safely, no unhandled rejections, no silent swallow that hides a security-relevant failure.
4. **Dependency usage** — `iron-session` used with a real secret; `fetch` always with a timeout signal; `URL`/`URLSearchParams` for construction, never string concatenation; CSRNG (`node:crypto`), never `Math.random`, for anything security-bearing.
5. **Secrets hygiene** — nothing hardcoded, nothing logged, nothing in the client bundle.
6. **Test coverage as evidence** — `backend/*.test.ts` already encodes the allowlist matrix, the SSRF rejections and the state-mismatch case. A security invariant with no test is weaker than one with a test; say so, and where a finding is disputable, **write or run the test** (`just backend test`) rather than arguing from reading.

**Output:**
```
## <Module / Feature>

### Findings

| # | Severity | Category | Location | Finding | Risk | Recommendation |
|---|----------|----------|----------|---------|------|----------------|
| 1 | High | B12 | backend/app.ts:18 | ... | ... | ... |

### Positive observations
<correctly-implemented measures worth preserving>

### ADR deviations
<where the code diverges from its ADR — and whether the ADR was updated, per CLAUDE.md's rule>
```

End with a **Summary** table: finding counts by severity + the top 3 priority fixes.

---

## FULL AUDIT MODE

Run **ADR AUDIT MODE** across `docs/adr/` (weight the security-bearing ones: 11, 12, 13, 14, 19, 20 for the Todoist chain; 04, 17, 18 for browser permissions; 16, 22 for build/deploy; 01, 15 for the inline-script/CSP interaction; 05 for local data), then **CODE AUDIT MODE** across `backend/`, `web/src/`, `deploy/` and `.github/workflows/`. Present both reports, then a unified **Risk summary** and **Top 10 priority fixes** ordered by severity × exploitability, tagged design-time (ADR) vs implementation-time (code).

---

## Rules for the auditor

1. **Be specific.** "Input not validated" is not a finding. "`GET /glu/api/todoist/tasks` passes `req.query.query` straight into Todoist's filter endpoint with no length bound, so a 10 KB filter expression costs 20 upstream page fetches (B6/H2)" is a finding.
2. **Be honest about severity, in GLU's real topology.** A token reaching the browser, a passthrough proxy route, a CORS-with-credentials header, or a production deploy on the fallback `SESSION_SECRET` are Critical. A missing `Cache-Control` on a task list is Low. **Do not inflate single-user issues into multi-tenant ones** — there is no other tenant to cross into.
3. **Check the ADR before calling something missing.** No database, no service worker, no rate limiter fleet, no history UI, `SameSite=Lax`, sending the bearer to allowlisted Todoist hosts, and stripping markdown instead of sanitizing it are all *recorded decisions*. Audit the mitigation; if you think a decision is wrong, say so once, as an Info/Low with the reasoning — don't file it as a missing control.
4. **Honor the invariants.** Verify the code actually enforces: token never in the browser · allowlist not passthrough · exactly three write routes, append-only · parse-then-check host allowlist with redirects refused · strip-don't-render · secrets from env only · no service worker · local-only session data.
5. **Verify by running, not by reading**, wherever it's cheap: `just backend test`, `just web test`, `npm audit` in each package, `grep` the built bundle for secrets, `curl` a route, load the page and read the actual CSP response header. CLAUDE.md's rule — verify by running things — applies to audits too.
6. **Don't invent vulnerabilities.** If exploitability is uncertain, say "potential" and state exactly what would have to be true for it to bite (e.g. "only if `PUBLIC_ORIGIN` is http in production").
7. **Acknowledge good security.** Say what is right so it survives the next refactor: the sealed httpOnly cookie, the enumerable allowlist, the SSRF-hardened image proxy, server-composed write payloads, the author filter on time comments, empty `.env.example`s, non-root pinned containers.
8. **Actionable recommendations only.** Not "harden the proxy" but "reject `type=filter` requests whose `query` exceeds N characters in `backend/todoistRoutes.ts:190` before calling `collect()` (B6/H2)".
9. **If you find a real deviation from an ADR, say which ADR and what it says.** Per CLAUDE.md, a deviation must be recorded in the ADR in the same session — note whether it was.
