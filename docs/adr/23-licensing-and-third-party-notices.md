# ADR 23: Licensing — Apache-2.0 + generated third-party notices

- Status: Implemented (deviations noted)
- Date: 2026-07-25

## Context

GLU has no license. The repo has no `LICENSE`, no `NOTICE`, and no record of
what any of its ~700 npm dependencies oblige us to do. That is not a neutral
state: unlicensed code is all-rights-reserved by default, so the header
drawer's GitHub link (`https://github.com/ioandev/glu`, ADR 10) currently
points at a repo nobody may legally use, and ADR 16's `docker-publish` job
pushes `glu-web` and `glu-api` to GHCR **with a few hundred third-party
packages inside and not one of their notices**. Nearly every one of those
packages is permissive and imposes the same minimal obligation — retain its
copyright and license notice when you redistribute — which is exactly what a
published image does.

zantiflow already solved this shape of problem (its ADR-0036 chose the
license and built the generator, ADR-0046 added a CI drift guard, ADR-0047
downgraded that guard to a warning). GLU has poached zantiflow's CI once
already (ADR 16); this poaches its licensing, adapted to two facts that
differ:

- **One ecosystem, two packages.** zantiflow spans npm + Cargo + PyPI in a
  pnpm workspace. GLU is npm-only, split across two independent packages with
  their own lockfiles and no root manifest (ADR 22).
- **Per-package build contexts.** zantiflow builds every image from the repo
  root, so its Dockerfiles can `COPY LICENSE NOTICE LICENSES ./`. GLU's
  contexts are `web/` and `backend/` (ADR 22), and CLAUDE.md forbids selecting
  a tier by `file:` with a root context — so a root `LICENSE` file is simply
  **not reachable** from either image build.

## Decision

**1. GLU is Apache-2.0, repo-wide.** The full text lands at `LICENSE`; the
§4(d) attribution notice at `NOTICE`. Both `web/package.json` and
`backend/package.json` declare `"license": "Apache-2.0"` (they stay
`"private": true` — neither is published to npm; the field is a
machine-readable declaration, not an intent to publish).

Apache-2.0 over MIT for the **explicit patent grant**, and over anything
copyleft because GLU is a personal focus timer with no moat to defend —
forking and self-hosting it should be frictionless.

**2. Third-party attribution is generated, never hand-maintained.**
`scripts/generate-licenses.mjs` at the repo root — dependency-free Node, run
as `node scripts/generate-licenses.mjs` (a bare `.mjs` script is not a root
manifest, so ADR 22's "no root `package.json`" stands). It drives
`npm query "*" --json` inside a package directory, which is npm's own
lockstate query: name, version, SPDX id, homepage, author, install path and
the dev/prod flag for every installed package. No new tool to install, and it
reads the same tree `npm ci` produced.

Three scopes, three committed manifests:

| Scope | Output | Covers |
| --- | --- | --- |
| `web` | `web/LICENSES` | the Next.js app's npm tree (runtime + dev) |
| `backend` | `backend/LICENSES` | the Express proxy's npm tree (runtime + dev) |
| `all` | `LICENSES` | both, deduped by `name@version` |

`just license` regenerates all three. Output is deterministic — sorted, no
timestamps — so a `git diff` means the dependency set actually changed.

**3. Compliance classification is fail-closed.** Every package is sorted into
Permissive / Attribution (CC-BY, OFL) / Weak copyleft (MPL, EPL, CDDL) / LGPL
/ Strong copyleft (GPL, AGPL) / Needs review, by parsing the SPDX expression
(`AND` = worst term wins, `OR` and the `/` shorthand = best term wins).
Anything unrecognised lands in **Needs review**, never in Permissive. Each
manifest opens with a compliance overview: category rollup, a verdict line,
and a list of every non-permissive package. A GPL dependency cannot enter
silently.

**4. Each manifest is self-contained, so the images can ship it.** Every
generated `LICENSES` embeds GLU's own `NOTICE` **and the full Apache-2.0
text** ahead of the third-party section, and `web/Dockerfile` and
`backend/Dockerfile` copy it into the runtime image root. One file per image
therefore carries the whole obligation — Apache §4(a) (a copy of the License),
§4(d) (the NOTICE), and every dependency's retained notice — without the root
`LICENSE`/`NOTICE` ever needing to be inside a build context. This is the one
real deviation from zantiflow, and ADR 22's per-package contexts force it.

**5. CI warns on drift, it does not fail.** A `license-drift` job in
`tests.yml` reinstalls both packages from their frozen lockfiles, regenerates
all three manifests and `git diff`s them; on a difference it emits a
`::warning::` telling the contributor to run `just license` and commit, and
exits 0. Following zantiflow ADR-0047: stale attribution is a documentation
miss, not a correctness or security one, and blocking a merge or a publish on
it is heavier than the problem warrants.

GLU can guard **all three** scopes where zantiflow could only guard two — its
carve-out existed because its Python bots used unpinned `>=` ranges. Both GLU
packages resolve from committed lockfiles, so every scope is byte-reproducible
in CI.

**6. The README states the terms.** Three sections, mirroring zantiflow's:
*Use at your own risk* (AS IS, and specifically what that means for an app
holding a Todoist token), *License*, and *Credits & attribution* — the last
one asking, not requiring, that forks name the source.

## Options considered

- **MIT** — simpler, but no patent grant. Apache-2.0 costs nothing extra here
  since the `NOTICE` mechanism is what makes the generated manifests
  meaningful in the first place.
- **A copyleft license (GPL/MPL)** — rejected: nothing to protect, and it
  would burden the self-hoster this project actively wants.
- **No license** — rejected: it is the status quo, and it means the public
  repo and the public images are legally unusable.
- **`license-checker` / `npm-license-crawler` as a dev dependency** — rejected:
  it would have to be installed into *both* packages (no root manifest to hang
  it off), and it produces no copyleft flagging. `npm query` is already there.
- **A single root `LICENSES` only** — rejected: unreachable from the `web/`
  and `backend/` build contexts, so no image could ship its attributions.
- **Copy `LICENSE` + `NOTICE` into each package directory** — rejected: two
  committed duplicates of an 11 KB legal text that will silently drift from
  the root copy. Embedding them in a *generated* file cannot drift, because
  `just license` rewrites it from the root originals every time.
- **Hard-fail the drift guard** (zantiflow ADR-0046's original) — rejected per
  its own ADR-0047: it blocks merges and publishes on a hygiene miss whose fix
  is one command.

## Scope

### In scope

- `LICENSE` (Apache-2.0 full text) and `NOTICE` at the repo root.
- `scripts/generate-licenses.mjs` + the `just license` recipe.
- Committed `LICENSES`, `web/LICENSES`, `backend/LICENSES`.
- `"license": "Apache-2.0"` in both package manifests.
- `COPY LICENSES` in both Dockerfiles; confirming neither `.dockerignore`
  strips it.
- The `license-drift` job in `.github/workflows/tests.yml`.
- README: risk, license and attribution sections.

### Out of scope

- **Per-file SPDX headers.** A root `LICENSE` + `NOTICE` satisfies Apache-2.0;
  stamping ~200 source files buys nothing and churns every diff.
- **The base image's own licenses.** `node:24-alpine` ships an OS userland
  under its own terms. Debian/Alpine attribution is the base image's
  responsibility, and scanning it needs a container-aware scanner — a
  different tool and a different ADR.
- **An SBOM** (CycloneDX/SPDX document). The manifest is for humans reading
  attributions; an SBOM is for vulnerability tooling. If GLU ever wants
  `docker sbom` output attached to a published image, that is a future ADR.
- **Artifact signing** (cosign/attestations) — orthogonal to attribution.
- **A user-facing licensing page.** zantiflow has a Starlight docs site to put
  one on; GLU has a README and a hidden header drawer.
- **Publishing either package to npm.** Both stay `private`.
- **Relicensing anything vendored.** GLU vendors nothing today; the 18 clock
  designs (ADR 07) are original work.

## Implementation outline

1. **`LICENSE`** — the verbatim Apache-2.0 text. Do not edit the body; the
   copyright line goes in `NOTICE`, which is what §4(d) is for.
2. **`NOTICE`** — project, `Copyright 2026 Ioan Biticu`, author and source
   URLs (`github.com/ioandev/glu`, `ioan.dev/glu`), and the request to retain
   it.
3. **`scripts/generate-licenses.mjs`.** Ordered work, with the traps:
   - Args: `--scope web|backend|all`, `--out <path>`; unknown scope exits 2.
   - Collector: `execFileSync('npm', ['query', '*', '--json'], {cwd: pkgDir})`.
     Traps: (a) the **root package itself is in the output** with
     `location: ""` — filter it, or GLU attributes itself; (b) `license` can be
     a legacy object `{type, url}` or an array of them, not just a string;
     (c) `author` can be a string or `{name, email}`; (d) a missing
     `node_modules` yields an empty array — warn and skip that package rather
     than writing a truncated manifest; (e) buffer the output generously
     (`maxBuffer`), a full web tree is megabytes of JSON.
   - License text: read `LICENSE*`/`COPYING`/`NOTICE`/`UNLICENSE` from each
     package's install dir (`path`), which is where the actual copyright lines
     live — the SPDX id alone does not satisfy the retention obligation.
   - `all` scope: run both collectors, dedupe by `name@version`, and record
     which package(s) pull each dependency so the index can group by source.
   - Determinism: sort by name then version everywhere; group packages that
     ship byte-identical license text; never emit a timestamp.
   - Refuse to write an empty file (exit 1) — a broken collector must not
     quietly erase a manifest.
4. **Own-license embedding.** Read the root `LICENSE` and `NOTICE` and render
   them as the manifest's first section. Gotcha: this means `just license`
   must be rerun if `NOTICE` ever changes, and the drift guard will catch it
   if it isn't.
5. **`just license`** in the root justfile — three invocations, one per scope.
6. **Both `package.json`s** gain `"license": "Apache-2.0"`.
7. **Dockerfiles.** Web copies from the build stage
   (`COPY --from=build --chown=node:node /repo/LICENSES ./LICENSES`) since its
   runtime stage starts empty; backend copies straight from the context
   alongside `package.json`. Check both `.dockerignore`s do not strip it —
   they are allowlist-free, so today they do not, but the file is new.
8. **`license-drift` job** in `tests.yml`: checkout, Node 24, `npm ci` in both
   packages (cache both lockfiles), run the three scopes, `git diff --quiet`,
   and on a difference `echo "::warning::…"` without failing. Place it as its
   own job so it does not slow the critical path.
9. **README** sections + **CLAUDE.md** index row and hard-constraint line.
10. Run `just license`, inspect the compliance overview for anything
    non-permissive, and record what it found in the acceptance criteria.

## Deviations

- **The index marks dev-only packages** (`[dev]`, plus a per-package count in
  each section header) — beyond zantiflow's format. The published images carry
  only runtime dependencies, so without the marker the manifest reads as if
  535 of the web tier's 586 packages ship in the image. They are still
  attributed: they are part of the source distribution.
- **The `[dev]` flag is tracked per package, not merged.** A dependency can be
  a dev tool in `web/` and a runtime dependency in `backend/`, so the root
  union stores a flag per source and renders the one for the section it is
  printing. Without this the root and scoped manifests disagreed (514 vs 535).
- **`homepage` falls back to `repository`**, with `git+`/`.git` decoration
  stripped — npm packages omit `homepage` far more often than zantiflow's mix
  of ecosystems did, and a bare name with no URL is a poor attribution record.
- **Both lockfiles changed.** npm records the root package's `license` in
  `package-lock.json`, so adding the field required a
  `npm install --package-lock-only` in each package. Dependencies are
  untouched.
- **The `LICENSE` Appendix keeps its `[yyyy] [name of copyright owner]`
  placeholders.** That block is Apache's instructions for applying the license
  to a file, not a field to fill in; the real copyright line lives in `NOTICE`.
- **The `license-drift` job is gated on `tests.yml`'s `detect` job**
  (`if: needs.detect.outputs.licenses == 'true'`), matching the pattern the
  workflow already uses, so the suite stays green on a branch that predates
  the generator.

## Acceptance criteria

- [x] `LICENSE` is the unmodified Apache-2.0 text (201 lines); `NOTICE` names
      the project, `Copyright 2026 Ioan Biticu`, the author and
      `github.com/ioandev/glu`.
- [x] `just license` regenerates all three manifests in ~3 s —
      `LICENSES` 672 packages (web 586 · backend 256, deduped),
      `web/LICENSES` 586, `backend/LICENSES` 256. Two consecutive runs are
      byte-identical (`md5sum -c` on all three: OK).
- [x] Each manifest opens with GLU's `NOTICE` and the full Apache-2.0 text
      (with its centred title intact — a plain `.trim()` had left-aligned it),
      then the compliance overview, index and third-party texts.
- [x] `glu-web` / `glu-backend` are excluded (the queried package has an empty
      `location`, which the collector filters); dev dependencies are included
      and marked.
- [x] With no `node_modules` the run warns per package and exits 1 with
      "refusing to overwrite with an empty file"; with only `backend/`
      installed it warns for `web` and still writes a valid manifest.
      (Verified in a scratch copy of the repo, not by deleting the real trees.)
- [x] Verdict on the 2026-07-25 run: **✓ No strong-copyleft (GPL/AGPL) or
      unrecognised licenses detected** — 663 permissive, 3 LGPL
      (`@img/sharp-libvips-linux-x64` ×2, `@img/sharp-wasm32`), 5 weak
      (`axe-core`, `lightningcss` ×2, `lightningcss-linux-x64-gnu` ×2),
      1 attribution (`caniuse-lite`, CC-BY-4.0). All build/test-time; each is
      a separately-distributed library, so retaining its notice is the whole
      obligation.
- [x] `docker build backend/` → `/app/LICENSES` 514 808 B; `docker build web/`
      → `/app/LICENSES` 879 319 B. Both start with the tier's own title line.
- [x] `tests.yml` has a `license-drift` job: `npm ci` in both packages, three
      regenerations, `git diff --quiet`, then `::warning::… run \`just
      license\` …` with no `exit 1`. YAML parses; jobs are
      `detect, lint, test, backend, e2e, license-drift`.
- [x] Both `package.json`s declare `"license": "Apache-2.0"`;
      `just backend test` still 82/82 green after the manifest edits.
- [x] README has *Use at your own risk*, *License* and *Credits &
      attribution*; CLAUDE.md lists ADR 23 in the index, in the build order,
      and as a hard constraint.

## Consequences

**Easier.** Attribution regenerates from lockstate in one command, so a
dependency bump is never a legal research task. Copyleft creep is surfaced
automatically on every run. The repo and both published images become legally
usable by anyone, and a forker knows exactly what they may do.

**Harder.** Three generated files (megabyte-scale for the web scope) live in
the tree and show up in diffs on every dependency change — the price of
committed, reviewable attribution. `just license` is a step contributors will
forget; CI warns rather than enforcing, so a stale manifest can merge.

**Committed to.** Apache-2.0 is effectively irreversible — code published
under it stays usable under it. The `NOTICE` becomes part of the distribution
contract: it must ship with every copy, which is why it is embedded in the
manifests rather than left as a root file the images cannot see.
