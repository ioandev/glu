# ADR 24: In-memory IP rate limiting on both tiers

- Status: Implemented (deviations noted)
- Date: 2026-07-25

- Deviation (implementation): **the web tier has no socket fallback of its
  own, and needs none.** The outline assumed rule 3 (the socket peer) would be
  readable here as it is in Express; a Next proxy sees headers and nothing
  else. Verified against the standalone build that Next *synthesises*
  `X-Forwarded-For` from the peer when a request arrives without one — so the
  documented chain resolves exactly as written and `clientKey`'s fallback
  argument is unused on this tier. The same probe found that Next passes a
  *client-supplied* `X-Forwarded-For` through unchanged, which is why
  `X-Glu-Client-IP` is consulted first and only the rightmost forwarded entry
  is ever trusted.
- Deviation (implementation): `AUTH_WINDOW_MS` / `AUTH_MAX_REQUESTS` were
  deleted rather than renamed — a fixed window has no equivalent to a bucket's
  two knobs — and `security.test.ts`'s import moved to the three limit objects.
- Deviation (implementation): **the e2e suite needed a per-test client
  identity**, added in `web/e2e/fixtures.ts`. The ADR asserted that 240/min
  would let the Playwright suite run without noticing the limiter; it does not
  — ~330 tests from one loopback address share one bucket, and the measured
  result was 4 failed / 22 flaky with `rate limited` as the page body. The
  limit is unchanged; the suite now sends `X-Glu-Client-IP` per test, which is
  also closer to production, where a proxy-set header is always present.
- Note: the runtime change is more visible than the criterion asked for.
  `.next/server/edge/` no longer exists at all and `middleware-manifest.json`
  is empty; the proxy compiles to `.next/server/middleware.js` with a
  `.nft.json` Node file trace beside it.

## Context

The 2026-07-25 security audit's F-3 put one limiter in the repo: a fixed-window
counter on `/glu/api/auth/*`, 10 requests/minute/IP (`backend/security.ts`, ADR
11 amendment). It closed the finding it was written for and nothing else. Every
other reachable surface in GLU is unmetered, and two of them cost real work per
request:

1. **Every page request is a render.** ADR 16's amendment moved the CSP into
   the app's proxy file and mints a per-request nonce, which deliberately
   gave up static prerendering and the `s-maxage` shell cache. `GET /glu` is
   therefore an SSR render on a 512 MB container, every time, for anybody.
2. **Every proxied Todoist call spends the user's upstream budget.** The
   `/glu/api/todoist/*` routes are session-gated, but a session is a sealed
   cookie the holder can replay at any rate they like, and Todoist meters
   **1000 requests per 15 minutes per user** and answers 429 past it. If an
   abusive caller burns that budget, the real user's app breaks — the failure
   lands on the victim, not the attacker.

Unmetered alongside those: `/glu/api/*` 404 probes and body-parse failures,
which reach `express.json()` and the error handler before any router.

The deployment shape is the part that has to be right before any of this is
worth adding. GLU sits behind **nginx-proxy** (ADR 16 amendment 2026-07-25b),
which by default fills `X-Forwarded-For` with `$proxy_add_x_forwarded_for` —
it **appends**, so the leftmost entries of that header are whatever the caller
typed. A limiter that reads the leftmost entry, or that trusts the header
wholesale, hands every caller their own private bucket and does nothing at all.
Read the wrong end and the feature is decorative; read it in a deployment where
another proxy fronts this one and every visitor buckets together instead — a
self-inflicted outage the first time anyone uses the app.

An IP-based limiter is only as good as its answer to "which IP", so this ADR
decides that first and the numbers second.

## Decision

**1. Both tiers meter themselves, in-process, in memory.** `web/` gets a
limiter in its proxy file; `backend/` keeps and generalises the one it has.
No Redis, no shared store, no database — CLAUDE.md's standing constraint, and
GLU runs exactly one replica of each tier (`deploy/docker-compose.example.yml`).
The state is a `Map` in the server process and dies with it; a restart forgives
everyone, which is the correct trade for a personal focus timer.

**2. One algorithm, both tiers: token bucket.** Each key holds
`{ tokens, updatedAt }`. Tokens refill continuously at a fixed rate up to a
capacity; a request costs one; empty bucket ⇒ 429 + `Retry-After`.

Token bucket over the fixed window we have today for two reasons. It expresses
the brief directly — *capacity* is "generous burst", *refill* is "not abusable
sustained", and the two are independent knobs, which one window cannot be. And
it has no boundary artefact: a fixed window lets a caller spend the whole
allowance at 59 s and the whole next allowance at 61 s, so the real burst is
always double the configured one. Bonus property that matters for the memory
bound below: **a full bucket is indistinguishable from a never-seen key**, so
evicting idle entries is semantically free rather than an allowance reset.

**3. One client key, resolved identically on both tiers.** In order:

1. `X-Glu-Client-IP` — an explicit override, for a proxy that wants to state
   the client outright. Nothing sets it by default.
2. `X-Real-IP` — what nginx-proxy sets, from `$remote_addr`. It is *assigned*
   rather than appended, so a caller's own copy is replaced every request.
3. Rightmost entry of `X-Forwarded-For` — the address the nearest proxy
   appended, i.e. the only entry in that header a caller cannot write.
4. The socket peer address.

Then, if the result parses as IPv6, it is truncated to its **/64 prefix**. A
residential IPv6 client is routinely handed a /64 or larger; keying on the full
/128 would let one machine rotate through billions of buckets and walk straight
past any limit — the single most common way an IP limiter turns out to be
decorative.

The apps **never count proxy hops.** Hop arithmetic is a deployment fact, the
apps are built once in CI and shipped as images, and a wrong count fails in the
worst direction: too high and the leftmost, client-written `X-Forwarded-For`
entry becomes the key, which is an outright bypass. So the topology stays in
the one component that already has to know it — the proxy.

**4. The proxy resolves the client; the apps only read it.** GLU is deployed
behind **nginx-proxy** (ADR 16 amendment 2026-07-25b), which needs no
GLU-specific configuration to make this work — it already sets
`X-Real-IP $remote_addr` on every request, *assigned*, so a caller's own copy
is replaced. Rule 2 above is therefore the live path in production.

One compose setting carries the whole posture:

```yaml
nginx-proxy:
  environment:
    TRUST_DOWNSTREAM_PROXY: "false" # this proxy IS the edge
```

nginx-proxy fills `X-Forwarded-For` from `$proxy_add_x_forwarded_for` by
default, which **appends** — so by default the leftmost entries are whatever
the caller typed. `false` switches it to `$remote_addr`, i.e. assignment, and
the header carries exactly one unforgeable address. Rule 3 reads the rightmost
entry either way, so the limiter is correct with the flag on *or* off; the flag
just removes the caller-supplied noise entirely.

If something genuinely fronts nginx-proxy (a CDN, another nginx), set it to
`"true"` and configure that proxy to send the real client in `X-Real-IP` or
`X-Glu-Client-IP`. Leaving it `"false"` there is the *safe* failure: every
visitor keys to the fronting proxy's address and shares one bucket, so the app
throttles too much rather than not at all. Loud, reversible, and not a bypass —
which is the direction every ambiguity here is resolved in.

**5. Limits — generous, and one of them is pinned to an upstream fact.**

| Tier | Surface | Burst | Sustained | Why this number |
| --- | --- | --- | --- | --- |
| web | every render-costing request (documents, RSC, route handlers) | 240 | 240/min (4/s) | ~50× a human tablet session. Note this does **not** clear the Playwright suite — see the e2e note in the outline |
| web | `/_next/static`, `/_next/image`, icons, manifest | — | **not metered** | immutable, disk-served, no nonce — see Out of scope |
| web | `/healthz` | — | **not metered** | the container probe must never be able to 429 itself |
| api | all of `/glu/api/*` (floor) | 300 | 300/min (5/s) | the only thing that sees 404 probes and body-parse abuse, which reach no router |
| api | `/glu/api/auth/*` | 20 | 10/min | unauthenticated *and* outbound to Todoist (F-3). Burst 20 absorbs a retried login; sustained stays at today's value |
| api | `/glu/api/todoist/*` | 120 | 60/min | 900 per 15 min — deliberately **under Todoist's 1000/15 min per user**, so our limiter trips before theirs |
| api | `/glu/api/healthz` | — | **not metered** | registered above the limiter, as it already is |

The `/todoist/*` number is the one with a real constraint behind it rather than
a judgement call. When Todoist 429s the app, the user is locked out of their own
tasks until the window rolls; when GLU 429s a caller, only that caller is
affected. Sitting under the upstream budget is what keeps the failure on the
right side. Burst 120 is far above ADR 14's outbox, which drains at most 20
queued entries every 2 s.

**6. Health and cheap-static are never metered.** A limiter that can 429
`/glu/healthz` fails the container's healthcheck, which flips the service to
unhealthy, which restarts it under `restart: unless-stopped` — an outage
manufactured by the component that exists to prevent one. Both health
paths are exempt on both tiers.

**7. Limits are source constants, not environment variables.** Named exports in
one file per tier, changed by amending this ADR. GLU is a single-user app;
tunable limits add an operator surface whose only realistic misuse is setting
them uselessly high, and the web tier's file is compiled into the image anyway
(see step 1 of the outline for why that is a trap worth avoiding entirely).

**8. `web/src/middleware.ts` becomes `web/src/proxy.ts`.** Next 16 deprecated
the `middleware` convention and renamed it to `proxy`; the current file still
compiles to the **edge** runtime — verified in the built
`.next/server/middleware-manifest.json`, whose chunks are all under
`server/edge/` — while `proxy.ts` defaults to the **Node.js** runtime. The
limiter needs one guaranteed singleton `Map` per server process, and Next's own
Proxy documentation says outright: *"you should not attempt relying on shared
modules or globals."* Under Node that warning is about portability (a CDN or
multi-region deployment), and a module-scope `Map` is ordinary CommonJS/ESM
module state. Under the edge runtime it is also about a sandbox whose lifetime
Next does not contract. Renaming buys the stronger guarantee, retires a
deprecation, and is a one-command codemod. Everything else in the file — nonce,
CSP, `SKIP` — is unchanged.

**9. The implementation is duplicated, on purpose.** ADR 22 forbids a shared
dependency between `web/` and `backend/` without a new ADR, and this is not
worth one: ~45 lines each, in different module systems (ESM/TS vs CommonJS/TS),
with different request objects. Each copy gets its own tests. They are allowed
to drift; the table above is the contract, not the code.

**10. One 429 shape, no headers on success.** `429`, `Retry-After` in whole
seconds, `Cache-Control: no-store`, and a minimal body — `{"error":
"rate_limited"}` on the API (the existing shape), `text/plain` on the web tier.
No `RateLimit-*` headers on successful responses: they cost bytes on every
request and hand a prober the exact remaining capacity.

## Options considered

- **Rate limit at the proxy** (nginx's `limit_req`) — rejected. nginx-proxy
  generates its own config from container metadata, so a custom `limit_req`
  zone means a hand-maintained `vhost.d` snippet living outside the repo, in a
  volume, untested by CI — and per `SERVER.md` §5 the box may not even run this
  compose file's proxy. It also cannot tell `/auth` from `/todoist`, which is
  where the interesting asymmetry is. Still available *in addition* later;
  nothing here forecloses them.
- **`express-rate-limit`** — rejected already by ADR 11's amendment for the same
  reason as before: it doubles a three-package dependency tree to solve ~45
  lines, and it has no counterpart for the Next tier, so we would ship two
  mechanisms anyway.
- **Redis / any shared store** — needs a service and state. Permanently out
  (CLAUDE.md: no database, the backend is a stateless proxy).
- **Keep the fixed window** — cannot express burst and sustained separately, and
  its boundary artefact silently doubles whatever number we write down.
- **Sliding-window log** (timestamp array per key) — exact, but stores hundreds
  of numbers per key instead of two, for accuracy nobody can perceive at these
  limits.
- **Key on the session cookie instead of the IP** — the caller chooses whether
  to send a cookie, so the key is attacker-controlled and infinitely
  rotatable. IP is the only identifier that costs the caller something.
- **Environment-configurable limits** — an operator surface with no legitimate
  use here, and on the web tier a trap: values referenced in edge-compiled code
  are baked into the build (the `env` block in `middleware-manifest.json` is
  literally this), so a compose variable would look configurable and be inert.
- **Keep `middleware.ts` on the edge runtime and accept module globals** —
  works today on one self-hosted process, but rests on behaviour Next's docs
  explicitly tell you not to rest on, for a mechanism whose whole correctness is
  the persistence of that state.

## Scope

### In scope

- `web/src/lib/rateLimit.ts` — token bucket + client-key resolution + tests.
- `web/src/middleware.ts` → `web/src/proxy.ts` (rename + Node runtime),
  metering the non-`SKIP`, non-`/healthz` set.
- `backend/security.ts` — `rateLimit()` reworked to a token bucket, client-key
  resolution shared with the web rule, existing tests updated.
- `backend/app.ts` — the global floor plus the two route-family buckets.
- `deploy/docker-compose.example.yml` — `TRUST_DOWNSTREAM_PROXY: "false"` on
  the proxy, with the fronting-proxy case documented beside it.
- `deploy/SERVER.md` — a "Client IP and rate limiting" section: what to do when
  another proxy fronts the box, and how to verify it.
- CLAUDE.md — ADR index row, build-order line, and a hard-constraint bullet.
- ADR 11 — one amendment line pointing its 10/min auth limiter here.

### Out of scope

- **Metering `/_next/static` and friends.** Immutable, `max-age=31536000`,
  served off disk, and cached by every client after the first load. Metering
  them buys little, and it would break the e2e suite, which pulls thousands of
  assets from one loopback address. A flood of static requests is a bandwidth
  problem and belongs to the proxy tier. Named future work if it ever bites:
  *ADR: edge bandwidth and connection limits*.
- **Distributed / multi-replica limiting.** Reopens only if GLU ever runs more
  than one container per tier, which needs a shared store, which needs its own
  ADR.
- **Progressive penalties** — ban lists, escalating backoff, tarpitting. A flat
  bucket is the whole mechanism.
- **Bot detection, WAF, CAPTCHA, per-route cost weighting.**
- **`RateLimit-*` response headers** on successful responses (decision 10).
- **Metrics/alerting on 429 rates.** Logging is one line per episode, capped;
  a metrics pipeline is a different project.
- **ADR 14's outbox retry behaviour.** Scoping this ADR turned up two live
  holes in its backoff (see Consequences); they were fixed under ADR 14's own
  2026-07-25b amendment rather than absorbed here, because the outbox is that
  ADR's contract. Nothing about it is this ADR's to change.
- **Rate limiting the dev rewrite path.** In development, `/glu/api/*` goes
  through Next's rewrite *and* the backend, so both limiters count it. In
  production nginx-proxy routes it straight to the api container on the longer
  `VIRTUAL_PATH` prefix and the web tier never sees it. Not worth special-casing; just don't be surprised in dev.

## Implementation outline

1. **`web/src/lib/rateLimit.ts`** — the bucket and the key.
   - `createRateLimiter({ capacity, refillPerMinute, now? })` returning
     `take(key): { ok: true } | { ok: false, retryAfterSeconds: number }`.
     Keep `now` injectable, matching `backend/security.ts`'s existing test seam.
   - Refill in floating point off elapsed milliseconds
     (`tokens = min(capacity, tokens + elapsed * refillPerMs)`); do **not**
     accumulate an integer per tick. `Retry-After` is
     `ceil((1 - tokens) / refillPerMs / 1000)`, floored at 1 — a `Retry-After: 0`
     invites an instant retry.
   - Memory bound: cap the `Map` at 10 000 keys. Sweep lazily — at most once a
     minute, and only on insert — dropping entries whose bucket has refilled to
     capacity (free, per decision 2). If the cap is still exceeded after a
     sweep, evict in insertion order (`Map` iterates insertion-ordered), and
     re-insert on window start so the order stays "least recently active".
     The existing backend limiter already does the eviction half of this; keep
     its comment, it explains why the limiter must not become the memory
     exhaustion bug it prevents.
   - `clientKey(headers, fallback)`: `x-glu-client-ip` → rightmost
     `x-forwarded-for` entry → `fallback`. Trim, strip a `[…]` IPv6 bracket
     wrapper and any `:port` suffix (a v4 `1.2.3.4:5678` appears in some proxy
     configurations; splitting a raw v6 address on `:` is the classic wrong
     fix here, so branch on bracket/colon-count, not on a blind `split(":")`).
     Truncate v6 to /64 by keeping the first four hextets of the *expanded*
     address — `2001:db8::1` and `2001:0db8:0000:0000::1` must key the same.
   - Never throw. An unparseable header falls back to the next source and
     ultimately to a constant key; a limiter that 500s is worse than no limiter.
2. **Rename `middleware.ts` → `proxy.ts`.** `npx @next/codemod@canary
   middleware-to-proxy .` from `web/`, or do it by hand — it is a file rename
   plus `export function middleware` → `export function proxy`. Confirm the
   build now emits the function outside `server/edge/` in
   `.next/server/middleware-manifest.json`; that is the observable proof the
   runtime changed. `crypto.randomUUID()` is a Node 24 global, so the nonce
   line is unaffected. Do not add `runtime` to the config object — Proxy throws
   on it.
3. **Meter in `proxy.ts`.** Order matters:
   - `SKIP.test(pathname)` → `NextResponse.next()`, unchanged and first, so
     static assets cost one regex and nothing else.
   - Meter unless the path is `/healthz`. **Keep healthz inside the nonce path**
     — exempt it from the *limiter*, not from the CSP, so the response headers
     do not change.
   - Gotcha: `nextUrl.pathname` arrives with `basePath` **stripped**, which is
     why the existing `SKIP` matches `^/_next/static` and not `^/glu/_next`.
     The exempt path is therefore `/healthz`, not `/glu/healthz` — the same
     trap ADR 16 documented for the container healthcheck, pointing the other
     way. Assert it with a test rather than trusting this paragraph.
   - The 429 is `new NextResponse("rate limited\n", { status: 429, headers })`
     with `retry-after`, `cache-control: no-store`, `content-type: text/plain;
     charset=utf-8`. Not an HTML page: rendering one would spend exactly the
     resource being defended.
4. **`backend/security.ts`** — swap the fixed-window internals for the same
   bucket, keep the exported shape. `AUTH_WINDOW_MS`/`AUTH_MAX_REQUESTS` become
   `AUTH_LIMIT`/`API_LIMIT`/`TODOIST_LIMIT` objects; `security.test.ts` imports
   `AUTH_MAX_REQUESTS`, so update that import in the same commit. Resolve the
   key as `req.get("x-glu-client-ip") ?? req.ip ?? "unknown"` — with
   `trust proxy: 1` still set, `req.ip` is already Express's
   rightmost-XFF-else-socket, so rule 3 falls out of the framework. Leave
   `trust proxy` at 1: it also drives `req.protocol` and `req.secure`, and the
   `X-Glu-Client-IP` header is what carries the multi-hop case now.
5. **`backend/app.ts`** — mount the floor *after* `/healthz` and before
   `rejectCrossOriginWrites`, then the two family buckets:
   `api.use(rateLimit(API_LIMIT))`, `api.use("/auth", rateLimit(AUTH_LIMIT), …)`,
   `api.use("/todoist", rateLimit(TODOIST_LIMIT), …)`. A todoist call spends
   both its own bucket and the floor; that is intended, and the floor is looser
   so it only binds on mixed or 404 traffic.
6. **Logging.** One `console.warn` when a key's bucket empties, not per rejected
   request, and a global floor of one line per 10 s across all keys. A limiter
   that logs every 429 is a log-flood amplifier — the attacker fills the disk
   instead of the CPU.
7. **Tests.**
   - `web/src/lib/rateLimit.test.ts` (the `unit` project already globs
     `src/**/*.test.ts`): capacity is spent, refill returns tokens,
     `Retry-After` is sane and never 0, the map stays bounded past 10 000 keys,
     v6 addresses in the same /64 share a bucket and different /64s do not,
     `X-Glu-Client-IP` beats `X-Forwarded-For`, and a spoofed *leftmost*
     `X-Forwarded-For` entry does **not** create a new bucket.
   - `backend/security.test.ts`: extend the F-3 block — the auth bucket still
     429s past its allowance with a `Retry-After`, `/healthz` survives 500
     consecutive requests, and the todoist family limits independently of auth.
   - Test isolation is already handled: every backend test file does
     `const app = () => createApp(config)`, and `createApp` builds fresh
     limiters per call, so buckets never leak between tests. Do not hoist a
     single app instance to module scope in a test file — that is the one
     change that would make the suite order-dependent.
   - **No Playwright test for the limiter itself** — a test that deliberately
     trips a bucket poisons every test that runs after it on the same key.
   - **But the suite needs its own client identity, and this is not optional.**
     Every project drives the app from one loopback address, so all ~330 tests
     share a single bucket and the back half of the run is served
     `rate limited` instead of the app. Measured, not predicted: before the fix
     the suite came back **4 failed, 22 flaky, 304 passed**, and the Playwright
     error context showed a page body of exactly `rate limited`. `fixtures.ts`
     now sets `X-Glu-Client-IP` per test (`e2e-w<worker>-<testId>`).
     Raising the production limit to fit a test harness would have been the
     wrong repair; a per-test identity is both correct and *more* faithful,
     since in production every request really does arrive with a proxy-set
     client header.
   - **Check the exit code, not the summary line.** `playwright test | tail`
     reports `tail`'s status, so a piped run looks green while Playwright is
     exiting 1. This ADR was briefly marked verified on exactly that mistake.
8. **`deploy/docker-compose.example.yml` + `SERVER.md`** — decision 4's
   compose setting and the fronting-proxy note, plus the verification recipe in
   Acceptance criteria below.
9. **Docs** — CLAUDE.md index row + build-order line + a hard-constraint bullet
   ("the client IP comes from `X-Glu-Client-IP`, the apps never count hops"),
   and the one-line ADR 11 amendment.

## Acceptance criteria

- [x] `web/src/proxy.ts` exists, `web/src/middleware.ts` does not, and the built
      `.next/server/middleware-manifest.json` no longer lists the function under
      `server/edge/` — proving it runs on the Node runtime. **Verified**: that
      manifest is now `{"middleware": {}, "functions": {}}`, `.next/server/edge/`
      is absent entirely, and the proxy is `.next/server/middleware.js` with a
      `.nft.json` Node trace beside it. Before the rename the manifest listed
      three `server/edge/chunks/*` files.
- [x] The app still hydrates against the production build: `just web e2e` is
      green, and `/glu` serves inline scripts carrying the CSP nonce (the ADR 16
      amendment's guarantee is unchanged by the rename). **Verified**: the
      response header and the page's `nonce="…"` attributes match and rotate per
      request; the full four-project suite exits **0** with 336 passed, 2
      skipped, 2 flaky (timer-timing races under local parallelism, unrelated
      to this ADR — they reproduce green in isolation).

      This criterion was briefly and wrongly marked verified: the first runs
      were piped through `tail`, which reports *`tail`'s* exit status, so a run
      that was actually exiting 1 with 4 failed and 22 flaky read as green. The
      22 were this limiter throttling the suite. See the e2e note in the
      outline; the fix is a per-test client identity in `fixtures.ts`.
- [x] Against `next start`, 240 rapid requests to `/glu` succeed and the next
      one returns **429** with a `Retry-After` of 1–60 and
      `Cache-Control: no-store`; after waiting the advertised time, a request
      succeeds again. **Verified**: 300 requests → 249×200 / 51×429 (the extra
      nine are refill during the run), `retry-after: 1`,
      `cache-control: no-store`, `content-type: text/plain; charset=utf-8`,
      body `rate limited`; after a 3 s wait, 10/10 succeeded.
- [x] 500 consecutive requests to `/glu/healthz` and to `/glu/api/healthz` all
      return 200 — the probes are unmetered. **Verified**: 500×200 on the web
      tier against `next start`; 500×200 on the API in `security.test.ts`.
- [x] 1000 consecutive requests to `/glu/_next/static/**` all succeed — static
      assets are unmetered. **Verified**: 1000×200 on a real chunk URL scraped
      from the served page.
- [x] `/glu/api/auth/status` 429s past 20 in a burst; `/glu/api/todoist/*` 429s
      past 120 in a burst; each family's rejection leaves the other family's
      bucket usable. **Verified** by three supertest cases in `security.test.ts`.
- [x] Spoofing is ineffective at the app tier:
      `X-Forwarded-For: 9.9.9.9, <real>` keys to `<real>`, and a forged
      `X-Glu-Client-IP` cannot outrank the proxy's own value once it is set.
      **Verified** on both tiers — against `next start`, a batch spoofing the
      leftmost entry returned 5×429 from the already-spent bucket rather than
      opening a new one. The other half — that the *deployed* nginx-proxy
      overwrites the forwarded headers — needs the real box: **[deferred → HUMAN-TODO]**, with the
      verification recipe in `deploy/SERVER.md`.
- [x] IPv6 keying: two addresses in one /64 share a bucket; two /64s do not.
      **Verified** by unit test (web) and supertest (backend).
- [x] The tracked-key map stays at or below 10 000 entries after 50 000 distinct
      keys, and a key idle long enough to refill fully is dropped (unit test).
- [x] `just test` and `just lint` pass in both packages; `just backend test`
      passes with `security.test.ts` covering the new families. **Verified**:
      web 192 unit + 109 story, backend 87, ESLint clean in both, `tsc` and
      `next build` clean.
- [x] `deploy/docker-compose.example.yml` sets `TRUST_DOWNSTREAM_PROXY:
      "false"` on nginx-proxy; `SERVER.md` documents the resolution order, the
      fronting-proxy case, and the verification recipe.
- [x] CLAUDE.md lists ADR 24 and carries the client-IP constraint; ADR 11's
      rate-limit line points here.

## Consequences

**Easier.** Every expensive surface in GLU now has a ceiling, and the ceilings
are one table in one ADR rather than folklore. The Todoist budget stops being
something any caller can spend on the owner's behalf. The client-IP question —
the one that quietly breaks every naive limiter behind a proxy — has a single
answer that both tiers and the deployment agree on, and getting it wrong
throttles too much instead of not at all. The Next tier moves off a deprecated
file convention onto the runtime its state model actually requires.

**Harder.** Two copies of the same forty lines, in two packages, by ADR 22's
rules — they will drift and the table above is the only thing keeping them
honest. The limits live in source, so changing one is a rebuild and a deploy,
not a compose edit; that is the intended friction, but it is friction. Adding a
second replica of either tier is now a correctness change, not a scaling knob:
two processes mean two independent sets of buckets and effectively double
limits. And the proxy config is now load-bearing — an operator who fronts the
box with nginx and skips the `trusted_proxies` block gets a working app that
throttles the whole internet as one client, which will look like a GLU bug.

**Committed to.** In-memory, single-replica, per-process limiting for as long
as GLU stays one container per tier. `X-Glu-Client-IP` becomes part of the
deployment contract — a header the proxy must set, alongside the CSP rule ADR
16 already put there.

**Known interaction, fixed in ADR 14 while scoping this one.** The outbox
treats 429 as transient and retries into it, so the `/todoist/*` bucket is a
surface its backoff has to survive. Auditing that path found the backoff was
anchored on the entry's fixed `postAfter` rather than on its last attempt,
which cancelled it exactly where it mattered — past the 5-minute ceiling, and
for any entry committed by displacement (`postAfter: 0`). Both are fixed under
ADR 14's 2026-07-25b amendment (`lastAttemptAt`), so a client that empties this
bucket now backs off to one retry per 5 minutes instead of one per 2 seconds.
