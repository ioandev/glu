# Security scanning (ADR 38)

What runs where, and the commands for the parts that stay manual. The
decisions and their reasoning live in
[ADR 38](adr/38-vulnerability-scanning.md); this page is the crib sheet.

## What runs automatically

| Detector | Where | Cadence | Covers |
| --- | --- | --- | --- |
| Dependabot | GitHub (`.github/dependabot.yml`) | weekly | dependency bumps: npm ×2, actions, docker ×2 |
| CodeQL | `codeql.yml` | PRs, `main`, weekly | first-party TS, both packages |
| `npm audit` | `security.yml` | PRs, weekly | known CVEs; gate = production deps, high+ |
| Semgrep | `security.yml` | PRs, weekly | injection / unsafe-API patterns |
| Gitleaks | `security.yml` | PRs, weekly | secrets, full git history |
| Trivy | `security.yml` | PRs, weekly | both built images (OS packages + shipped node_modules) |
| Hadolint | `security.yml` | PRs, weekly | both Dockerfiles |
| actionlint + zizmor | `security.yml` | PRs, weekly | the workflows themselves |
| ESLint security plugins | `just lint` / tests.yml | every lint | unsafe patterns + DOM sinks, in the editor |

None of this is in the ADR 16 publish gate: red means "look at this", never
"you cannot ship".

## Local loop

```sh
just audit          # npm audit for both packages — the same gate CI runs
just lint           # includes eslint-plugin-security / no-unsanitized
```

Scanner parity without installing anything (podman/docker; pin as CI does):

```sh
# Secrets, full history (.gitleaks.toml carries the one deliberate allowlist)
podman run --rm -v "$PWD":/repo zricethezav/gitleaks:latest \
  git --config /repo/.gitleaks.toml /repo

# Dependency CVEs — the second opinion when npm's audit endpoint misbehaves
podman run --rm -v "$PWD":/src:ro ghcr.io/google/osv-scanner:latest \
  scan --lockfile /src/web/package-lock.json --lockfile /src/backend/package-lock.json

# Dockerfiles
podman run --rm -i ghcr.io/hadolint/hadolint:latest < web/Dockerfile
podman run --rm -i ghcr.io/hadolint/hadolint:latest < backend/Dockerfile

# Workflows
podman run --rm -v "$PWD":/repo --workdir /repo rhysd/actionlint:1.7.7

# Image CVEs (build first: `just docker-build`)
podman run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image --severity CRITICAL,HIGH --ignore-unfixed glu-web:dev

# Semgrep, same rulesets as CI
podman run --rm -v "$PWD":/src semgrep/semgrep semgrep scan \
  --config p/default --config p/typescript --config p/expressjs --metrics=off /src
```

## Manual DAST — run after deploy-shaped changes

Deploy-shaped means: header/CSP work, proxy config, cookie flags, a new
route, an nginx-proxy or compose change.

**ZAP baseline** against a local stack, never against prod (it probes; prod
probing is rude to your own uptime and pointless when the same containers
run locally):

```sh
just docker-build
# bring the stack up as deploy/docker-compose.example.yml wires it, then:
podman run --rm --network=host ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://localhost:3000/glu
```

Triage note: ZAP will flag the missing HSTS header locally — HSTS is
proxy-owned by design (ADR 16), it only exists behind TLS.

**Header scanners** against the real deployment (read-only, safe for prod):

- <https://securityheaders.com/?q=https%3A%2F%2Fioan.dev%2Fglu>
- <https://observatory.mozilla.org/> → `ioan.dev`

Expected shape: CSP with `'self' 'nonce-…' 'strict-dynamic'` on `/glu`
(never `'unsafe-inline'` in `script-src` — see CLAUDE.md's CSP law),
`default-src 'none'` on `/glu/api`, HSTS from the proxy, `nosniff`,
`X-Frame-Options`, `Referrer-Policy` from the apps.

## Triage rules

- A finding in a **production** dependency or an image: fix or override now
  (`overrides` in the package's `package.json`, verified by build + tests).
- A finding in a **dev-only** dependency: let Dependabot's weekly PR carry
  the fix; it blocks nothing.
- A **false positive**: mute at the narrowest possible scope, with an inline
  comment saying why — `.gitleaks.toml`, an `eslint-disable-next-line`, a
  Dockerfile `hadolint ignore`. An uncommented mute is a review defect.
