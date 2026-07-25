# HUMAN-TODO

Everything the overnight autonomous run could not do itself, one line each.
Format: `- [ ] ADR NN, criterion "<quote>" — <why deferred> — <what to do>`.

## Git / repo

- [ ] ADR 01, criterion "Repo is a git repository with an initial commit" — the run is forbidden from creating commits (GO.md Absolute Law 1); `git init` was done, history was not — run `git add -A && git commit -m "GLU: initial import"` in `/repos/glu`.

## CI/CD

- [ ] ADR 16-A, criterion "first CI run is green on GitHub" — no repo host exists and pushing is forbidden — create `github.com/ioandev/glu`, `git remote add origin …`, `git push -u origin main`, watch the Actions run.
- [ ] ADR 16-A, criterion "A PR … runs `ci.yml`" — needs GitHub — open a PR (or push a feature branch) and confirm lint/tests/builds/E2E all run and a failure uploads the Playwright report.
- [ ] ADR 16-A, criterion "concurrency verified once" — needs GitHub — push twice quickly to a feature branch and confirm the older run is cancelled.
- [ ] ADR 16-A, criterion "The PR image-build job fails a PR that breaks the Dockerfile" — needs GitHub — break the Dockerfile in a throwaway PR once and confirm the job fails.
- [ ] ADR 16-B, all of it — deployment is out of scope for the run (GO.md Absolute Law 2) — provision the server, fill secrets, run the deploy workflow, run the smoke suite.
- [ ] ADR 16-B, criterion "a run where exactly one tier fails to build leaves *both* tiers' tags untouched" — needs GitHub + GHCR — break `backend/Dockerfile` alone in a throwaway run and confirm `glu-web:latest` did **not** move.
- [ ] ADR 16-B, criterion "`docker compose config` shows `:sha-<short>`" — needs the real deploy — after the first green deploy, ssh in and confirm both tiers resolved the `GLU_TAG` pin rather than falling back to `:edge`.
- [ ] ADR 16-B, criterion "multi-arch, runtime half" — needs GHCR — run `docker buildx imagetools inspect ghcr.io/ioandev/glu-web:edge` after the first publish and confirm both `linux/amd64` and `linux/arm64` are listed. If `ioandev/glu` is private, `ubuntu-24.04-arm` is not free — either make it public or drop the arm64 leg.
- [ ] ADR 16-B, criterion "release channels" — needs GitHub Releases — publish a pre-release (confirm `:next`, `:latest` unmoved, no deploy), then a stable release (confirm `:X.Y.Z` + `:X.Y` + `:latest`), then a backport Release from an older line (confirm `:latest` does **not** move).
- [ ] ADR 16-A, criterion "Node matrix, runtime half" — this box runs Node 25 only, so the 22 leg has never executed — watch the first CI run; if Node 22 fails on a dependency floor, either bump the matrix floor or the image base, and record which in ADR 16.
- [ ] ADR 24, criterion "spoofing is ineffective", proxy half — needs the real box, since only a deployed proxy can be tested for whether it overwrites the forwarded headers — after the first deploy run the four recipes in `deploy/SERVER.md` § "Client IP and rate limiting". The app half is already verified; what is unproven is that nginx-proxy with `TRUST_DOWNSTREAM_PROXY: "false"` actually replaces a caller-supplied `X-Real-IP` / `X-Forwarded-For`. If step 2 never 429s, the headers are reaching the app unmodified and spoofing works.
- [ ] ADR 24, fronting-proxy case — needs to know whether another proxy owns `ioan.dev` — if one does, flip `TRUST_DOWNSTREAM_PROXY` to `"true"` and make that proxy send the real client in `X-Real-IP` (or `X-Glu-Client-IP`), then re-run the recipes. Skipping this does not open a hole; it makes every visitor share one bucket.
- [ ] ADR 16-B, nginx-proxy routing — needs the real box — after the first deploy confirm `curl https://ioan.dev/glu/api/healthz` returns `glu-api` and `https://ioan.dev/glu/healthz` returns `glu-web`. Longest-prefix routing was verified against real nginx locally, but not with nginx-proxy generating the config from container metadata.
- [ ] ADR 16-B, TLS — needs the real box and public DNS — acme-companion issues on first boot via HTTP-01, so port 80 must be reachable and `ACME_EMAIL` set in `/srv/glu/.env`. Confirm a certificate is issued and that `NGINX_PROXY_CONTAINER: glu-nginx-proxy-1` matches the container's actual name (compose derives it from the project name).

## Todoist (no app registered, no credentials exist)

- [ ] ADR 11, criteria "Log in navigates to app.todoist.com…" / "consent lands back on /glu with a sealed cookie" / "status returns the account name" — need a registered Todoist app — register the two apps (dev + prod) per `backend/.env.example`, fill `backend/.env` (`just backend env` creates it), log in, and confirm the chip shows the real name.
- [ ] ADR 11, outline step 4 gotcha — needs the installed PWA — run the OAuth round trip from the installed standalone app on both platforms; if iPadOS bounces to Safari and back, record it as an accepted platform quirk.
- [ ] ADR 12, criterion "each listing real data" — needs a real account — open the tools popover with a live Todoist login and confirm the Filter/Label/Project lists are your own, and that a deliberately broken filter query shows Todoist's own message.
- [ ] ADR 13, criterion "record the verified answer on Todoist `file_url` auth semantics" — needs a real attachment on a real account — fetch a comment image `file_url` with and without the bearer header and replace the "unverified tonight" note at the top of ADR 13's Decision section with the answer.
- [ ] ADR 14, criterion "a real post lands in Todoist" — needs a real account — focus a task, run a timer past a minute, let the grace lapse, and confirm the `[Nm] You spent N minutes on this` comment appears in Todoist and the badge sums it.
- [ ] ADR 20, criterion "record the observed Todoist behaviour for fetching a completed task by id" — needs a real account — complete a task, fetch it by id after the undo window, and replace the "unverified tonight" note at the top of ADR 20 with the answer.

## Local dev environment

- [ ] ADR 09, WebKit browser dependencies — Playwright ships Debian/Ubuntu package names and this box is Arch-family; `libicu74` and `libflite1` were extracted from Ubuntu `.deb`s into `~/.cache/ms-playwright/webkit-2311/minibrowser-wpe/sys/lib/`, and `npm run test:e2e` sets `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`. Re-do both after a `playwright install` that replaces the bundle. CI is unaffected (`--with-deps`).

## Alerts (ADR 18)

- [ ] ADR 18, criterion "Backgrounded tab (real browser)" — needs a real OS notification — background the tab, let a run finish, then confirm the chime sounds, the notification appears, clicking it focuses the app, returning closes it, and a second finish replaces rather than stacks.
- [ ] ADR 18, criterion "first Start … triggers the browser's notification prompt exactly once" — needs a fresh browser profile — start a run in a clean profile, confirm one prompt, decline it, and confirm the chime still works with no re-prompt.

## Physical device

- [ ] ADR 04, criteria "installed app launches standalone" / "iPad Add-to-Home-Screen" — need a real install surface — install on Android Chrome and iPad Safari, confirm the icon on a solid background and a chrome-free launch at the timer screen.
- [ ] ADR 04, criterion "maskable icon previews intact on maskable.app" — needs the external preview tool — drop `public/icons/icon-512-maskable.png` on maskable.app and confirm nothing is clipped.
- [ ] ADR 04, criterion "network cut while the installed app is open" — needs a real network cut — kill wifi mid-run, confirm the timer keeps counting, reload to see the browser offline page, reconnect and confirm the state restores.
- [ ] ADR 17, criteria "screen stays on while running" / "sleeps on the OS schedule when idle" / "00:00 stays visible for 5 minutes" / "pause grace" / "re-acquires after switching away" — all need a real tablet and a real sentinel — prop the tablet up, run through each state past the OS sleep timeout, and check `navigator.wakeLock` in remote DevTools.
- [ ] ADR 21, criterion "on a real tablet, the background sweeps outward at the 60 s mark" — needs real hardware — watch the final-countdown takeover on the tablet in a dark room; confirm the sweep, the peek, and the 00:00 persistence feel right.
