# Server required state — `ioan.dev`

ADR 16 Phase B deploys GLU to a single box. Provisioning that box is **outside
this repo**; this file is the contract the deploy workflow assumes.

## Required before the first deploy

1. **DNS** — `ioan.dev` A/AAAA records already point at the server.
2. **Docker** — Docker Engine ≥ 26 with the Compose v2 plugin
   (`docker compose version` works).
3. **Deploy user** — a non-root user (e.g. `deploy`) in the `docker` group,
   with the CI public key in `~/.ssh/authorized_keys`.
4. **Deploy directory** — `/srv/glu`, owned by that user, containing:
   - `docker-compose.yml` (from `deploy/docker-compose.example.yml`)
   - `.env` (from `deploy/.env.example`, filled in — mode `600`)

   There is no proxy config file to copy: nginx-proxy generates its own from
   the `VIRTUAL_HOST` / `VIRTUAL_PATH` variables on the `web` and `api`
   services.
5. **Ports 80/443 free** — nginx-proxy publishes them, and acme-companion needs
   port 80 reachable for the HTTP-01 challenge. If another proxy already owns
   `ioan.dev`, do **not** run this compose file's `nginx-proxy` and `acme`
   services; point the existing proxy at the two containers instead, and read
   *Client IP and rate limiting* below before you do — that is the case where
   getting the forwarded headers wrong is silent.
6. **GHCR pull access** — the images are published from the repo's own
   `GITHUB_TOKEN`. If the package is private,
   `docker login ghcr.io -u <user> -p <PAT with read:packages>` once on the box.

## GitHub secrets the deploy job needs

| Secret | Value |
|---|---|
| `SSH_HOST` | `ioan.dev` (or the box's IP) |
| `SSH_USER` | the deploy user |
| `SSH_KEY` | the private half of the key in `authorized_keys` |

Todoist client secrets are **never** given to CI — they live only in the
server's `.env` (ADR 16's secrets inventory).

## Activating the pipeline

`.github/workflows/publish.yml` ships with its `push: [main]` trigger commented
out so nothing deploys until a human decides to go live. Un-comment it, push,
and watch the first run.

## Routing

One hostname, two containers, split by path. nginx-proxy turns each
`VIRTUAL_PATH` into a plain nginx **prefix** location, so nginx's
longest-prefix-wins rule routes `/glu/api/...` to the API even though `/glu`
also matches — independent of the order the containers start in. Verified
against real nginx; the compose file records the two rules that keep it true
(no trailing slashes, `VIRTUAL_DEST` unset).

Nothing needs `handle`-style ordering here. That was Caddy's constraint, and it
is gone.

## Client IP and rate limiting

Both tiers rate-limit per client IP in memory (ADR 24), and **neither counts
proxy hops**. They resolve the caller in this order:

1. `X-Glu-Client-IP` — an explicit override. Nothing sets it by default.
2. `X-Real-IP` — what nginx-proxy sets, from `$remote_addr`. It is *assigned*,
   so a caller's own copy is replaced on every request.
3. The **rightmost** `X-Forwarded-For` entry.
4. The socket peer.

With `TRUST_DOWNSTREAM_PROXY: "false"` in the compose file — the default there,
and correct while nginx-proxy is the edge — nginx-proxy assigns the forwarded
headers from `$remote_addr` rather than appending to whatever arrived. The apps
then see a client IP nobody can forge, with no extra configuration.

**If another proxy fronts nginx-proxy** (a CDN, or the §5 case above), two
things change, and both are easy to get silently wrong:

- Set `TRUST_DOWNSTREAM_PROXY: "true"`. Without it nginx-proxy overwrites the
  forwarded headers with the *fronting proxy's* address and **every visitor
  shares one rate-limit bucket** — the app throttles the whole internet as a
  single client. That is the safe direction to fail, but it will look like a
  GLU bug.
- With it set to `true`, nginx-proxy appends instead, and `X-Real-IP` becomes
  the fronting proxy's address. Configure that proxy to send the real client in
  `X-Real-IP`, or have it set `X-Glu-Client-IP` directly — rule 1 exists for
  precisely this.

Never trust the *leftmost* `X-Forwarded-For` entry anywhere in the chain: when
any hop appends, that entry is whatever the caller typed.

Verify after any proxy change, from a machine that is not the server:

```sh
# 1. Normal traffic is never limited at human rates.
for i in $(seq 1 20); do curl -s -o /dev/null -w '%{http_code} ' https://ioan.dev/glu; done

# 2. Forged headers must NOT mint a fresh bucket. This should reach 429 and
#    STAY there; repeat with a different fake IP and it must still 429.
for i in $(seq 1 300); do
  curl -s -o /dev/null -w '%{http_code}\n' \
    -H "X-Real-IP: 203.0.113.9" -H "X-Glu-Client-IP: 203.0.113.9" \
    -H "X-Forwarded-For: 203.0.113.9" \
    https://ioan.dev/glu
done | sort | uniq -c

# 3. The probes are exempt — these must never 429.
for i in $(seq 1 100); do curl -s -o /dev/null -w '%{http_code} ' https://ioan.dev/glu/healthz; done
for i in $(seq 1 100); do curl -s -o /dev/null -w '%{http_code} ' https://ioan.dev/glu/api/healthz; done

# 4. Routing goes to the right container.
curl -s https://ioan.dev/glu/api/healthz   # {"ok":true,"service":"glu-api"}
curl -s https://ioan.dev/glu/healthz       # {"ok":true,"service":"glu-web"}
```

If step 2 never 429s, the headers are reaching the app unmodified — nginx-proxy
is not overwriting them and spoofing works. Check `TRUST_DOWNSTREAM_PROXY`.

## Security headers

Only **HSTS** comes from the proxy (the `HSTS` variable on the `web` service),
because it is a statement about the TLS connection. `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy` and both CSPs are sent by the apps
themselves — `web/next.config.ts` and `web/src/proxy.ts` for the page tier,
`backend/security.ts` for the API — so they survive a proxy swap and are
covered by the test suites. Do not add any of them to proxy config: a second
`Content-Security-Policy` header intersects with the app's and the page stops
hydrating, which is the 2026-07-25 audit's F-2 all over again.

## Rollback

Images are tagged `:sha-<short>` as well as `:latest`. To roll back, pin
`web.image` in `/srv/glu/docker-compose.yml` to a known-good `:sha-…` and
`docker compose up -d`. The durable fix is `git revert` + push.
