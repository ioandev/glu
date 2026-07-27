# ADR 16: CI/CD — poached from zantiflow, sized for GLU

- Status: Phase A Implemented; Phase B Proposed (artifacts written, activation deferred — see HUMAN-TODO.md)
- Date: 2026-07-24
- Amended: 2026-07-24 — **step 8 is done: the api image is unparked.** ADR 11's
  proxy is containerised (`backend/Dockerfile`), the compose `api` service and
  the Caddy `/glu/api/*` block are un-commented, and `ci.yml` / `publish.yml`
  build both tiers from a matrix. Per ADR 22 each package owns its Dockerfile
  and is its own build context, so the root `Dockerfile` is gone and the legs
  select by `context:` (`web` / `backend`) rather than by `file:`. Two
  corrections landed with it: the compose api healthcheck probed a bare
  `/healthz`, which 404s because the router mounts at `/glu/api`; and the Caddy
  `/glu/api/*` block must sit above `/glu*`, which matches first otherwise.
  This is the "recorded follow-through" step 8 called for, not a new ADR.
- Amended: 2026-07-25 — **the page CSP moves out of the Caddyfile and into the
  app** (security audit F-2, `SECURITY-AUDIT-25jul.md`). The audit table below
  called a strict CSP "nearly free" and this ADR wrote `script-src 'self'`.
  It was not free: ADR 01 mandates Mantine's `ColorSchemeScript` and ADR 15 a
  pre-paint chrome bootstrap — both *required* inline scripts — and Next's App
  Router adds its own inline hydration bootstraps. Under `'self'` the deployed
  page would render and never hydrate; the reflexive go-live fix,
  `'unsafe-inline'`, would have deleted the mitigation this ADR was proud of.
  No ADR reconciled the three, because each owned only its own half.

  The resolution keeps the strict policy and makes it work: `web/src/
  middleware.ts` mints a per-request nonce, sends the CSP itself, and passes
  the nonce to both app-owned inline scripts; Next nonces its own. **Caddy no
  longer sends a page CSP** — two CSP headers intersect, and this tier cannot
  know the nonce, so re-adding one there silently restores the broken policy.
  The `/glu/api/*` block keeps a CSP of its own (`default-src 'none'`), which
  is safe and strictly tighter because JSON has no scripts to nonce.

  Accepted trade: a per-request nonce means pages are dynamic, so the `/`
  static shell and its `s-maxage` are gone. GLU is one client-rendered page of
  a few KB — the right side of that trade.

  Second consequence, found in dev on 2026-07-25: a **header-delivered** CSP
  triggers the HTML spec's nonce hiding — on insertion the browser blanks the
  `nonce` content attribute and keeps the value in the element's `.nonce`
  property, so no stylesheet can read a nonce back out through an attribute
  selector. React hydration compares attributes, so every nonced app-owned tag
  reported an attribute mismatch on load. The three (ADR 01's
  `ColorSchemeScript`, ADR 15's `<style>` and `<script>`) now carry
  `suppressHydrationWarning`. Nothing was broken — those scripts run at parse
  time, before React exists, and React never patches attribute mismatches — but
  the warning is permanent, since the hiding is the behaviour we want. **Do not
  "fix" it by dropping the nonce or moving the CSP to a `<meta>` tag**: the
  first blocks the script, the second is how the mismatch disappears *and* the
  nonce becomes readable again.

  Two smaller audit fixes land here too: `poweredByHeader: false` (Caddy
  stripped `Server` but nothing stripped Next's `X-Powered-By`, F-8), and
  `images: { unoptimized: true }` + a trace exclusion, because Next shipped
  `sharp` and its libvips CVEs into the runtime image for an optimizer route
  GLU never calls (F-7). Compose also restates `NODE_ENV: production` on the
  api service so an env override cannot regress the error shape (F-5).

- Amended: 2026-07-25b — **the proxy is nginx-proxy, not Caddy** (owner
  decision; Phase B had never been deployed, so nothing is being migrated).
  `deploy/Caddyfile.example` is deleted and `docker-compose.example.yml` gains
  `nginx-proxy` + `acme-companion`, with routing declared on the app services
  as `VIRTUAL_PATH=/glu` and `/glu/api`. Three consequences worth writing down:

  1. **Routing stops being order-dependent.** nginx-proxy emits plain prefix
     `location` blocks, so nginx's longest-prefix-wins rule sends `/glu/api/*`
     to the API regardless of container start order — verified against real
     nginx. The Caddyfile's "this block must stay ABOVE that one" footgun is
     gone. Two new ones replace it, both recorded in the compose file: a
     trailing slash on `VIRTUAL_PATH` would stop matching the canonical bare
     `/glu`, and `VIRTUAL_DEST=/` would strip the prefix and 404 every route
     (the same trap as Caddy's `handle_path`).
  2. **The security headers move into the apps.** Caddy carried `nosniff`,
     `X-Frame-Options`, `Referrer-Policy` and the API's `default-src 'none'`
     CSP. They now come from `web/next.config.ts`, `web/src/proxy.ts` and
     `backend/security.ts`, which means they survive the next proxy swap and
     are covered by the test suites rather than by a file nobody runs in CI.
     Only **HSTS** stays at the proxy — it is a statement about the TLS
     connection, and only the proxy terminates TLS. This is the same lesson as
     the F-2 amendment above, applied before it could bite twice.
  3. **TLS needs a second container.** Caddy provisioned certificates by
     itself; nginx-proxy needs acme-companion, which needs `ACME_EMAIL` in
     `.env` and port 80 reachable for the HTTP-01 challenge.

  Client-IP handling for ADR 24's rate limiters rides along:
  `TRUST_DOWNSTREAM_PROXY: "false"` makes nginx-proxy *assign* the forwarded
  headers from `$remote_addr` instead of appending to whatever the caller sent,
  so the limiters see an IP nobody can forge with no extra configuration.

- Amended: 2026-07-25 — **`publish.yml` adopts zantiflow's digest-push →
  manifest-merge shape after all**, reversing this ADR's "no digest/manifest
  dance" line. The audit read that machinery as multi-arch scaffolding. It
  isn't: it is what makes *this ADR's own* stated principle — "nothing visible
  unless everything passed" — true. As written, the build matrix pushed
  `:sha-<short>` and `:latest` directly with `fail-fast: false`, so a run where
  `web` built and `api` failed had already moved `glu-web:latest` while
  `glu-api:latest` stayed behind, leaving the registry in a split state that no
  deploy would reconcile. The tiers now push untagged layers by digest and a
  `merge` job applies the tags only once both succeeded.

  Landing with it: OCI labels via `docker/metadata-action` (a GHCR package now
  links back to its commit), `provenance: false`, and workflow-level
  `permissions: contents: read` with `packages: write` only on the two jobs
  that push. `actions/checkout` and `actions/setup-node` move to v7/v6 to match
  zantiflow.

  Also fixed here: `build.outputs.tag` was computed and never consumed — the
  deploy ran a bare `docker compose pull` against compose's `:latest`, so the
  thing deployed was never pinned to the thing tested. `merge` now exports the
  sha tag, the deploy forwards it as `GLU_TAG` over SSH, and compose reads
  `${GLU_TAG:-latest}`. The fallback keeps a manual `docker compose up -d`
  working, and rollback becomes `GLU_TAG=sha-<known-good> docker compose up -d`
  — which is what the old "pin to :sha-<short> for a known-good rollback"
  comment in the compose file only *described*. The `.env` on the server is
  deliberately not rewritten by the deploy: it holds the ADR 11 secrets, and a
  half-applied `sed` there is a worse failure than an unpinned manual restart.

- Amended: 2026-07-25 — **owner decision: the four remaining scale-driven
  "Skip" rows are reversed and implemented.** The audit sized each against
  "one app, one developer, one server, no consumers"; the owner's call is that
  the sibling's shapes are worth having whether or not GLU's scale demands
  them today, and that the cost of adding them later — after a registry has
  published untagged history, or after a Node bump has silently broken — is
  higher than the cost of carrying them now. Recorded as a direction change,
  not as a defect in the original sizing. What landed:

  - **Multi-arch.** `build` is now tier × platform (4 legs) on native runners
    (`ubuntu-latest` / `ubuntu-24.04-arm`, no QEMU); `merge` assembles each
    tier's per-platform digests into one manifest. The `merge` stage the
    previous amendment added for all-or-nothing is exactly what multi-arch
    needed, so this was a matrix axis rather than a rewrite. Verified the
    lockfiles carry full `linux-arm64-musl` parity (21 native packages per
    arch in `web/`), so `npm ci` resolves on Arm.
  - **Release channels.** `release: [published]` now publishes `:X.Y.Z` +
    `:X.Y`, or `:X.Y.Z-rc.N` + `:next` for a pre-release, with `:latest`
    guarded by zantiflow's two-part check (GitHub's prerelease flag, then a
    git-tag version sort so a backport Release cannot move it). **Releases
    publish channels; they do not deploy** — `deploy` skips release events, so
    a backport cannot walk prod backwards. Continuous-from-main remains the
    deploy model this ADR chose.
  - **Node matrix (22, 24)** on the `test` and `backend` jobs. The image still
    pins 24 — that leg is the one that must stay green; 22 is a canary for a
    dependency raising its floor before the image base bumps into it. `lint`
    and `e2e` stay single-version: lint results do not vary by runtime, and
    e2e is browser-bound, so doubling it doubles the slowest thing in the
    suite for no new signal.
  - **`detect` + `license-drift`.** ADR 23 landed the generator and the three
    manifests and left its `license-drift` job unbuilt; it is built here to
    ADR 23 §5 / step 8 — regenerate all three scopes, `git diff`, `::warning::`
    on drift, never fail. `detect` gates it on `scripts/generate-licenses.mjs`
    existing, which is GLU's one real conditional and keeps the suite green on
    a branch predating ADR 23. It carries zantiflow's documented lesson (test
    each candidate individually; `ls a b c` exits non-zero if *any* operand is
    missing, which silently disabled a whole job there).

  Consequence for `deploy`: `:latest` now means "highest stable Release", not
  "newest main", and it does not exist until someone publishes one. The compose
  fallback therefore moves from `${GLU_TAG:-latest}` to `${GLU_TAG:-edge}` —
  `:edge` is the moving newest-main tag that continuous deploy actually tracks.

  Still skipped, and now the only skips left: Docker Hub (GHCR + the built-in
  token stays), and a multi-arch **CI** leg — `ci.yml` stays amd64-only, as
  zantiflow's does, because GLU's Dockerfiles are arch-agnostic
  (`node:24-alpine`, no native addons) and doubling every PR to catch an
  arm64-only break is the wrong trade. The accepted risk is that such a break
  surfaces at publish instead of at review, where `merge` still refuses to tag.

- Amended: 2026-07-25c — **`script-src` gains `'unsafe-eval'` under
  `next dev`, and only there.** The nonce CSP above is correct in production
  and unbuildable-around in development: `next dev` compiles React and the HMR
  client with `eval()`, so the policy that makes the deployed page safe makes
  the dev page log `eval() is not supported in this environment`. The
  relaxation is a build-time constant in `web/src/proxy.ts` gated on
  `NODE_ENV === "development"`, which is `production` in every artefact `next
  build` produces and is restated by `web/Dockerfile`. `'unsafe-inline'` is
  *not* granted in either mode — the nonce exists so it never has to be. An
  audit reading a **production** `script-src` should still see exactly
  `'self' 'nonce-…' 'strict-dynamic'`.

- Amended: 2026-07-26 — **both runtime stages delete npm** (`rm -rf
  /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx`). An
  image scan flagged CVEs in `tar`, `undici` and `brace-expansion` at
  vulnerable versions that appear nowhere in either lockfile: they are npm's
  own vendored dependencies, shipped by the `node:24-alpine` base. Neither
  container ever runs npm (`CMD` is plain `node`), so the findings were noise
  — but deleting the toolchain zeroes them deterministically, where chasing a
  newer base tag would not (npm lags its deps' fixes). The build/deps stages
  keep npm; only the final stage is stripped.

- Deviation (2026-07-24, implementation): Phase B was written as *files only* —
  `publish.yml` ships with its `push: [main]` trigger commented out, and no
  repo, remote, registry or server was touched. Go-live is a human decision.
- Deviation (2026-07-24, implementation): the Caddy `/glu/api/*` route uses
  `handle` rather than `handle_path`. ADR 11 mounts the Express router at
  `/glu/api`, so stripping the prefix would 404 every route.
- Deviation (2026-07-24, implementation): the Dockerfile was validated with a
  local **podman** build (`docker` is aliased to podman on the dev box). Podman
  ignores `HEALTHCHECK` in OCI format, so the healthcheck was verified by
  hitting `/glu/healthz` on the running container directly.

## Context

The CI/CD ADR has been the standing unnumbered future since ADR 03 ("the
suite only protects whoever runs it") and ADR 09 (deployment smoke reuses the
E2E suite via `E2E_BASE_URL`). Product direction (2026-07-24): write it now,
poaching from `/repos/zantiflow` — a sibling project with a mature setup:
reusable `tests.yml` (`workflow_call`) consumed by both a PR-facing `ci.yml`
and a tests-gated `docker-publish.yml` (digest-push → manifest-merge,
all-or-nothing), plus a `deploy/` posture (Caddy TLS + security headers,
compose with no published ports except the proxy, pinned images,
healthchecks, `.env` secrets).

GLU's reality check before poaching: **one app, one developer, one server
(`ioan.dev`), no public releases, no external installers.** zantiflow ships
6 services × 2 architectures to Docker Hub with semver channels; copying
that would be cosplay. The poach list below takes the shapes, drops the
scale, and says which is which.

A prerequisite fact: **the GitHub repo doesn't exist yet** (ADR 10 already
links `github.com/ioandev/glu`); creating it is part of this ADR.

**Prerequisites & phasing:** Phase A (repo + CI) needs ADRs 01–03
Implemented; `tests.yml`'s E2E job joins when ADR 09 lands (activation
pattern, like the API legs below). Phase B (publish + deploy + smoke) needs
**ADR 09 Implemented** (the smoke step reuses its suite) and activates at
go-live — after ADR 09 in the build order; its API legs switch on when
ADR 11 lands. One ADR, two activation points, so CI protects the whole
build instead of arriving last.

## Decision

### Poach / adapt / skip (the audit)

| zantiflow pattern | Verdict | GLU form |
|---|---|---|
| `tests.yml` as reusable `workflow_call`, called by CI and by publish as its gate ("one definition of the tests") | **Poach as-is** | same file names, same shape |
| `ci.yml` on PRs + feature branches, `main` excluded (publish validates main; no double-run); concurrency cancel-in-progress | **Poach as-is** | same |
| Publish: tests-gated, nothing visible unless everything passed | **Poach the principle** — *and, since 2026-07-25, the mechanism* | `:sha-<short>` + moving `:latest`, applied by a `merge` job after both tiers have pushed by digest. The dance was first read as multi-arch scaffolding; it is actually what *enforces* the principle once there is more than one image (see the amendment) |
| `docker/metadata-action` for OCI labels (source / revision / created) | **Poach** (added 2026-07-25) | both tiers; makes a GHCR package link back to its commit |
| `provenance: false` on the build | **Poach** (added 2026-07-25) | one consumer, so buildkit's attestation manifests are clutter |
| Workflow-level `permissions:` least privilege | **Poach** (added 2026-07-25) | `contents: read` at the top of `ci.yml` / `publish.yml`; only `build` and `merge` elevate to `packages: write` |
| Docker Hub + semver/`:edge`/`:next` channels, releases UI | **Registry: skip. Channels: poached 2026-07-25** | GHCR with the built-in `GITHUB_TOKEN` (zero extra secrets) — but the full channel set now ships: `:edge` + `:sha-<short>` from `main`, `:X.Y.Z`/`:X.Y` from a Release, `:next` for pre-releases, `:latest` guarded by the highest-stable check. Releases publish; only `main` deploys |
| Multi-arch native-runner matrix | **Poached 2026-07-25** (was: skip) | tier × platform on `ubuntu-latest` + `ubuntu-24.04-arm`, merged into one manifest per tier. `ci.yml` stays amd64-only for PR speed, as zantiflow's does |
| Node version matrix (22, 24) | **Poached 2026-07-25** (was: skip) | `test` + `backend` run 22 and 24. The image still pins 24 — 22 is the canary for a dependency raising its floor. `lint` and `e2e` stay single-version |
| Playwright job: `--with-deps` install, report artifact on failure, 7-day retention | **Poach** | plus webkit (ADR 09's four projects) |
| PR image-build job (build, no push) so a broken Dockerfile can't merge | **Poach** | one image (two once the API exists) |
| `detect` conditional-stack job | **Poached 2026-07-25** (was: skip) | single-stack TS, so the one real conditional is ADR 23's generator — `detect` gates `license-drift` on it, keeping the suite green on a branch that predates ADR 23 |
| license-drift warn job | **Poached 2026-07-25** (was: skip) | ADR 23 gave GLU the obligation the audit said it lacked: three generated manifests shipped inside the images. Built to ADR 23 §5 — regenerate all scopes, `::warning::` on drift, never fail |
| Caddy: TLS + HSTS/nosniff/frame-deny/referrer headers + strict CSP, `-Server` | **Poach** | GLU's CSP is the payoff moment: self-hosted fonts (ADR 07), proxied images (ADR 13), no third-party origins → `default-src 'self'; img-src 'self' data:` essentially holds as-is |
| Compose posture: only the proxy publishes ports; pinned tags; healthchecks; mem limits; `.env` never committed; commented-out optional services | **Poach** | `web` + (commented until ADR 11 ships) `api` + caddy; **no database service — the server is deliberately stateless (ADR 11's sealed cookie)** |
| The documented BACKEND_URL footgun (Next rewrites evaluated at *build* time, runtime env is dead) | **Poach the lesson** | GLU's `/glu/api → localhost:4000` rewrite is **dev-only, conditionally applied**; in prod Caddy routes `/glu/api/*` straight to the api container — the rewrite must never bake into the image |
| Why-comments in every workflow file | **Poach as practice** | every non-obvious line says why, like theirs do |

### The GLU pipeline

- **Repo**: create `github.com/ioandev/glu`, push, default branch `main`.
  Solo-dev branch model, recorded: direct pushes to `main` are allowed; the
  publish workflow's test gate means a broken push simply doesn't deploy.
  PRs get `ci.yml` when used; no required-review ceremony for one person.
- **`tests.yml`** (reusable): lint, `npm test` (unit + story tests),
  `npm run build`, `npm run build-storybook`; the ADR 09 E2E job
  (chromium + webkit, `--with-deps`, failure artifacts) joins the file the
  day ADR 09 is Implemented. This is the single definition of "green" —
  `ci.yml` and `publish.yml` both call it.
- **`publish.yml`**: on push to `main` → call tests → build the web image
  (and api image once ADR 11 lands) → push to GHCR as `:sha-<short>` +
  `:latest` → **deploy job**: SSH to `ioan.dev` (deploy key secret),
  `docker compose pull && docker compose up -d` → **smoke job**:
  `E2E_BASE_URL=https://ioan.dev/glu` against the tagged smoke subset of
  the ADR 09 suite — the promise that ADR made, kept here.
- **Dockerfiles are this ADR's to create** (no prior ADR owns them): web =
  multi-stage `node:24-alpine`, `output: 'standalone'` in `next.config`
  (added here; the basePath work from ADR 01 carries through), non-root,
  `/glu/healthz` route; api (Phase B, post-ADR 11) = same base, non-root,
  `/healthz`. Compose healthchecks poached verbatim in shape.
- **`deploy/` directory, zantiflow-style**: `docker-compose.example.yml`,
  `Caddyfile.example` (the `ioan.dev` site block: `handle_path /glu/api/*`
  → api, `handle /glu*` → web, security headers + CSP), `.env.example`.
  The server's existing `ioan.dev` proxy setup is unknown from the repo —
  the Caddyfile is authored as the site block to merge into whatever runs
  there, and Phase B's criteria are conditional on the box being
  provisioned (documented required state: docker + compose, deploy user
  with key, DNS already pointing).
- **Secrets inventory, total**: `SSH_HOST`/`SSH_USER`/`SSH_KEY` for deploy.
  GHCR uses `GITHUB_TOKEN`. Todoist client secrets (ADR 11) live in the
  server's `.env` only — CI never sees them; the E2E smoke runs logged-out
  flows plus stubbed states, never real OAuth (ADR 11's recorded limit).

## Options considered

- **Copy zantiflow's publish wholesale (digest matrix, semver channels,
  Docker Hub)** — engineering for consumers GLU doesn't have. Rejected;
  audit table records what each piece was for.
- **Vercel/Netlify for the web tier** — clashes with the Express-at-`/api`
  ground truth, splits deploy across providers, and `ioan.dev` already
  exists as a server. Rejected.
- **Watchtower auto-pull instead of SSH deploy** — deploy happens *to* the
  server whenever images move, with no test-gated moment and no smoke step
  coupling. Rejected; explicit deploy job + smoke.
- **Deploy on git tag / releases** — release ceremony for an app whose only
  consumer pushes to main. Rejected; continuous from `main`, tests as the
  gate.
- **Skipping Docker (rsync + pm2)** — loses pinned-runtime parity between
  CI and prod, the exact class of drift the Node-matrix decision assumes
  away. Rejected.
- **Branch protection with required PRs** — solo project; the gate that
  matters is "broken main doesn't deploy", which the publish flow already
  enforces. Rejected, revisit if contributors appear.

## Scope

### In scope

- **Phase A (after ADR 03):** GitHub repo creation + push; `tests.yml` +
  `ci.yml` (poached shapes, GLU jobs); web Dockerfile + standalone output +
  healthz; PR image-build (no push) job.
- **Phase B (after go-live decision, any point post-ADR 15):**
  `publish.yml` (GHCR, sha + latest), deploy job over SSH, smoke job via
  `E2E_BASE_URL`, `deploy/` examples (compose, Caddyfile site block with
  headers + CSP, `.env.example`), server-required-state doc; api image legs
  commented/parked until ADR 11 is Implemented.
- CLAUDE.md build-order update (16A slots after 03).

### Out of scope

- ~~Multi-arch images, semver/release channels~~ → **brought in scope by the
  2026-07-25 owner decision**; see the amendment. Docker Hub remains out —
  GHCR + the built-in token stays the registry.
- ~~License manifest generation~~ → the *generation* is ADR 23's; the
  `license-drift` job that consumes it is in scope here (2026-07-25).
- Preview deployments per PR → single-server personal app; rejected until a
  second consumer exists.
- Uptime monitoring/alerting on `ioan.dev` → server-ops concern, not this
  repo's; future ADR if ever.
- Publishing Storybook → unchanged ADR 03 position (local only).
- Provisioning the server itself (installing docker, DNS) — documented as
  required state, performed outside the repo.

## Implementation outline

1. **Repo + push** (`gh repo create ioandev/glu`), confirm the ADR 10
   drawer URL is real.
2. **`tests.yml`** with GLU's jobs; **gotcha (poached from their `detect`
   comment):** shell glob/exit-code traps in conditional steps — GLU avoids
   the whole class by having no conditional stacks; keep it that way.
3. **`ci.yml`** — PRs + `branches-ignore: [main]`, concurrency group with
   `cancel-in-progress: true` (their exact trade-off comment about
   double-runs on PR branches comes along).
4. **Web Dockerfile** — `output: 'standalone'`; **gotcha:** standalone +
   basePath serves under `/glu` — the healthcheck must hit
   `localhost:3000/glu/healthz`, not `/healthz`; the compose healthcheck in
   zantiflow's shape will silently 404 otherwise. **Gotcha (their
   documented footgun):** the dev rewrite for `/glu/api` must be
   conditional (env-gated) so `next build` in the image never bakes a dev
   URL — in prod, Caddy owns that route.
5. **PR image-build job** — build, `push: false`, gha cache scoped like
   theirs.
6. **Phase B: `publish.yml`** — tests gate → build+push GHCR
   (`ghcr.io/ioandev/glu-web`) → SSH deploy (`compose pull && up -d`) →
   smoke (`E2E_BASE_URL=https://ioan.dev/glu`, smoke-tagged subset).
   **Gotcha:** tag the smoke subset in the E2E suite explicitly
   (`@smoke`) — running all four browser projects against prod on every
   push is minutes of CI for no added confidence; ADR 09's suite stays the
   full pre-merge gate.
7. **`deploy/` examples** — compose (web, commented api, caddy; poached
   posture: no published ports except caddy, pinned tags, healthchecks,
   mem limits), Caddyfile site block (headers poached; CSP written from
   GLU's actual origin story: `default-src 'self'`, `img-src 'self'
   data:`, no third-party origins — verify against the built app, then
   lock), `.env.example`, `SERVER.md` with required box state.
8. **When ADR 11 lands:** un-comment api service, add its Dockerfile +
   publish leg, extend the Caddy block — one recorded follow-through, not
   a new ADR. — **Done 2026-07-24; see the amendment at the top.**

Honest sizing: **Phase A ~1 day** (half of it Dockerfile + standalone +
healthz correctness). **Phase B ~1.5 days** plus a server half-day that
isn't repo work. The poaching is real — the workflow shapes arrive
pre-debugged, including three documented footguns GLU now never hits.

## Acceptance criteria

- [~] `github.com/ioandev/glu` exists with the repo pushed; the ADR 10 GitHub link resolves. — **[deferred → HUMAN-TODO]**
- [~] A PR (or feature-branch push) runs `ci.yml`: lint, unit/story tests, app build, Storybook build, four-project E2E — with a Playwright report artifact uploaded on failure. — **[deferred → HUMAN-TODO]**
- [~] A push to a feature branch while a prior run is in-flight cancels the older run (concurrency verified once). — **[deferred → HUMAN-TODO]** (the `concurrency` block with `cancel-in-progress: true` is in `ci.yml`; observing it needs GitHub)
- [x] `tests.yml` is `workflow_call`-only and is invoked by both `ci.yml` and `publish.yml` (no duplicated job definitions — inspect the workflows).
- [~] The PR image-build job fails a PR that breaks the Dockerfile (verify once with a deliberate break). — **[deferred → HUMAN-TODO]**
- [x] The web image runs standalone: `docker run` → `GET /glu/healthz` 200, `GET /glu` serves the app, container runs non-root.
- [~] **Phase B:** a push to `main` with passing tests results in GHCR `:sha-<short>` + `:latest`, the server pulling and restarting, and the smoke job green against `https://ioan.dev/glu`; a push with a failing test publishes nothing and deploys nothing (verify once with a deliberate red). — **[deferred → HUMAN-TODO]**
- [~] **Phase B, all-or-nothing (2026-07-25 amendment):** a run where exactly one tier fails to build leaves *both* tiers' tags untouched in GHCR — no half-published `:latest` (verify once by breaking `backend/Dockerfile` alone). — **[deferred → HUMAN-TODO]**
- [~] **Phase B, deploy pinning (2026-07-25 amendment):** after a green deploy, `docker compose config` on the server shows `:sha-<short>` — not a moving tag — for both tiers. — **[deferred → HUMAN-TODO]**
- [x] **Multi-arch (2026-07-25):** `build` expands to four legs (web/api × amd64/arm64) with a distinct digest artifact per leg and no missing `context`/`runner` key — verified by expanding the matrix under GitHub's `include` semantics; both lockfiles carry full `linux-arm64-musl` parity so `npm ci` resolves on Arm.
- [~] **Multi-arch, runtime half:** `docker buildx imagetools inspect` on a published tier lists both `linux/amd64` and `linux/arm64`. — **[deferred → HUMAN-TODO]** (needs GHCR)
- [~] **Release channels (2026-07-25):** publishing a stable Release tags `:X.Y.Z` + `:X.Y` + `:latest`; a pre-release tags `:X.Y.Z-rc.N` + `:next` and leaves `:latest` alone; a backport Release published while a higher stable tag exists does **not** move `:latest`; no release event deploys. — **[deferred → HUMAN-TODO]** (needs GitHub Releases)
- [x] **Node matrix (2026-07-25):** `test` and `backend` each run on Node 22 and 24; `lint` and `e2e` stay single-version — inspect `tests.yml`.
- [~] **Node matrix, runtime half:** the Node 22 leg is green (or its failure is a real floor bump worth acting on). — **[deferred → HUMAN-TODO]** (this box runs Node 25 only)
- [x] **`license-drift` (2026-07-25, ADR 23 §5):** the job regenerates all three manifests and warns without failing. Generator interface verified locally (`--scope web|backend|all --out <path>`) and all three committed manifests are currently byte-identical to a fresh regeneration.
- [x] **`detect` (2026-07-25):** `license-drift` is gated on `scripts/generate-licenses.mjs` existing, so a branch predating ADR 23 skips it rather than failing.
- [~] The deployed site sends the security headers and CSP (headers from the Caddyfile block, **CSP from `web/src/middleware.ts`** per the 2026-07-25 amendment), and the app functions under that CSP with zero console CSP violations. — **the CSP half is now [x]**: verified against the production standalone build — every inline *and* external script carries the request's nonce, the header nonce matches the body's and rotates per request, and the full Playwright suite (325 tests, four projects, including the console tripwire that fails on any console error) is green against that server. The Caddy-header half stays **[deferred → HUMAN-TODO]**, since it needs the real deploy.
- [x] No Todoist or server secret exists in the repo or in CI logs (grep + a scan of one full run's logs).
- [x] `deploy/` contains compose + Caddyfile + `.env.example` + `SERVER.md`; compose publishes no ports except Caddy's 80/443.
- [x] CLAUDE.md's build order shows 16-A after 03; the unnumbered future list no longer contains CI/CD.

## Consequences

- ADR 03's standing gap closes: the suite now protects `main`, not just
  whoever remembers to run it — and ADR 09's `E2E_BASE_URL` design pays out
  exactly as written.
- GLU inherits zantiflow's debugged shapes (reusable tests, gated publish,
  proxy-only ports, the build-time-rewrite footgun) without inheriting its
  scale; the audit table is the record of what was left behind and why,
  so nobody "completes" the pipeline with machinery GLU doesn't need.
- Deploys are now boring: push to main, tests decide, the server converges,
  smoke confirms. The undo for a bad deploy is `git revert` + push.
- The CSP promises accumulated since ADR 07/13 become enforced headers —
  same-origin discipline is now load-bearing, and any future third-party
  resource costs a deliberate Caddyfile + ADR amendment.
- Two images and a proxy on one box is the whole estate; if GLU ever grows
  real infrastructure needs, that's a new ADR with this one's audit table
  as its starting point.
