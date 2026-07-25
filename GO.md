# GO — build GLU end to end

> **Historical mission order — the run it describes is complete** (see
> `RUN-REPORT.md`). Its paths and commands predate ADR 22's split: read
> `server/…` as `backend/…`, `img/` as `web/img/`, and the `npm run …`
> commands as their `just` equivalents.

You are implementing the GLU project overnight, autonomously, to completion.
Everything you need is in this repository. This file is your mission order;
the ADRs are your contracts. Do not stop until the Definition of Done below
is met or you hit a Hard Blocker as defined below.

## What GLU is

A tablet-first pomodoro / focus tracker with Todoist integration, served
under `ioan.dev/glu`. Read, in this order, before writing any code:

1. `CLAUDE.md` — index of all 21 ADRs, the **build order**, and the hard
   constraints (basePath `/glu`, layout contract, Zustand rules, Tailwind
   guardrails, stateless-proxy law, no service worker, chrome-token law).
2. `PLAN.md` — original product intent.
3. `UI.md` — design brief (ADRs win on any disagreement).
4. Every file in `docs/adr/` — **each ADR is the spec for its slice**:
   decisions, scope, implementation outline, acceptance criteria. Amendment
   lines at the top of several ADRs modify their bodies — read them; the
   latest amendment wins.

## Absolute laws (violating any of these fails the whole run)

1. **ZERO git commits and ZERO pushes. No exceptions.** Do not create a
   commit for any reason. Do not create or touch any remote. `git init` and
   a `.gitignore` are permitted (no history is created); nothing else.
   ADR 01's "initial commit" criterion and all of ADR 16's repo-creation /
   push / GHCR / deploy behavior are **deferred to the human** — record
   them in `HUMAN-TODO.md` (protocol below).
2. **No deployment of any kind.** ADR 16 Phase B is OUT OF SCOPE. The human
   deploys when they are happy. You still write all Phase A + B *artifacts*
   (workflows, Dockerfiles, `deploy/` examples) as files in the repo.
3. **All Todoist integration is built against mocks.** No Todoist app is
   registered; no client id/secret/token exists tonight, and you must not
   attempt to obtain one. Implement ADRs 11–14, 19, 20 fully, with the
   documented endpoints mocked in unit/integration/E2E tests exactly as
   those ADRs specify (supertest with mocked upstream; Playwright with
   stubbed proxy routes). Ship `.env.example` and a runnable dev setup that
   fails gracefully (clean logged-out state) when `.env` is absent.
4. **Never weaken a test to get green.** Fix it, or quarantine it with a
   named reason recorded BOTH in the owning ADR's deviation note AND in
   `HUMAN-TODO.md`. A quarantine without documentation in both places is a
   failure. Maximum two fix attempts for a flaky E2E before quarantining.
5. **No new dependencies beyond what the ADRs name** (and their obvious
   dev-tooling needs). Every ADR that adds a package says so. When unsure,
   don't add it.

## Build order (from CLAUDE.md — follow it)

01 → 02 → 03 → 16-A → 15 → 05 → 06 → 07 → 08 → 09 → 17 → 18 → 04 → 10 →
11 → 19 → 12 → 13 → 14 → 20 → 21

Overnight adjustments, already decided by the owner:

- **16-A**: write `tests.yml`, `ci.yml`, the web Dockerfile, and the PR
  image-build workflow as repo files. Do NOT create the GitHub repo, do NOT
  push, do NOT run anything against GitHub. Validate the Dockerfile with a
  local **podman** build (`docker` is aliased to podman on this machine —
  the workflows themselves still say `docker`; they run in CI later, that
  is correct, leave them).
- **16-B**: skip entirely (status stays Proposed with a note). Its
  artifacts (compose, `.env.example`, `SERVER.md`) still get
  written as files.
- **09**: the E2E suite is in scope and must run green locally (all four
  projects). Install Playwright browsers as needed.
- **17/18/21 + 04**: implement fully; verify by emulation (DevTools device
  emulation, `prefers-reduced-motion` emulation, init-script API deletion).
  Any criterion that genuinely requires physical hardware or a real
  install surface goes to `HUMAN-TODO.md`, not skipped silently.

## Deferral protocol — `HUMAN-TODO.md`

Create `HUMAN-TODO.md` at repo root. One line per deferred item:
`- [ ] ADR NN, criterion "<short quote>" — <why deferred> — <exact command
or action for the human>`. The known population (you will add to it):

- ADR 01: git init history / initial commit (owner does all commits).
- ADR 16-A: create `github.com/ioandev/glu`, push, watch first CI run.
- ADR 16-B: all of it (server, secrets, deploy, smoke).
- ADR 11: register the two Todoist apps, fill `server/.env`, run the live
  OAuth round trip; verify status/name/id against a real account.
- ADR 13: verify whether Todoist `file_url` requires the bearer header;
  record the answer in ADR 13 (one line, where marked).
- ADR 20: verify Todoist's completed-task-by-id behavior; record in ADR 20.
- ADR 04/17/21: the physical-device checks (install on iPad/Android,
  real-tablet screen sleep, takeover on device).
- Anything else you could not verify autonomously.

## Deviation protocol

When reality forces a deviation from an ADR: implement the closest faithful
version, add a one-line deviation note to that ADR **in the same work
session**, and continue. When you complete an ADR, flip its Status to
`Implemented` (or `Implemented (deviations noted)`) and check off its
acceptance criteria in-file, marking deferred ones `[deferred → HUMAN-TODO]`.
Update the CLAUDE.md index status column as you go.

## Delegated judgment (pre-authorized — do not agonize, do not stop)

- ADR 07: all 36 clock renditions (18 designs × 2 schemes). The mockups in
  the design zips are the spec for the native scheme; you design the
  counterpart scheme yourself. The objective bar is the a11y contrast gate;
  beauty is best-effort and will be reviewed in Storybook by a human later.
- ADR 15: the chrome-token transcription, the palette mix function, and
  the choice of the three "extreme" test palettes.
- ADR 18: the chime's two tones and envelope.
- ADR 11/12: exact Todoist brand hex values (best-effort from the ADRs;
  the human will eyeball later).
- Ports: web 3000, api 4000. Dev runs both via `npm run dev`.
- Any purely internal naming, file layout within the patterns the ADRs
  establish, and test organization.

## Environment facts

- Node v25 locally; the Dockerfile pins Node 24 LTS (per ADR 16) — that
  mismatch is by design.
- `docker` is an alias for **podman** locally. Use it for the image-build
  verification only. CI workflow files keep real `docker` semantics.
- npm registry and general web access are available; use the web to check
  current docs when an ADR says "verify at implementation" — except
  anything requiring a Todoist account (mock instead, defer verification).
- The design sources: `Pomodoro timer design concepts.zip` (18 clocks) and
  `Three app design directions.zip` (3 chrome directions) sit at repo
  root; ADRs 07 and 15 tell you to extract them into `docs/design/` and
  delete the zips. `img/favicon.svg` is the icon source of truth.
- No `.env` exists and none may contain real secrets tonight. Generate a
  random `SESSION_SECRET` in `.env.example` documentation only as a
  placeholder pattern, never a real-looking committed value.

## Definition of Done

1. All 21 ADRs are `Implemented` (16-B excepted: stays `Proposed`, noted),
   in build order, each with criteria checked in-file and deviations
   recorded.
2. `npm test` (unit + story tests), `npm run build`,
   `npm run build-storybook`, and `npm run test:e2e` (all four projects)
   all pass, run fresh, at the very end of the run — not just after each
   ADR. Zero quarantined tests without documentation.
3. The dev experience works: `npm run dev` serves the app at
   `localhost:3000/glu` with the full UI (timer, gallery, chrome
   directions, Todoist surfaces in their logged-out state), and Storybook
   shows every component, clock, and chrome direction.
4. The podman image build succeeds and the container serves `/glu/healthz`.
5. `HUMAN-TODO.md` exists and is complete; nothing was silently skipped.
6. A final `RUN-REPORT.md` at repo root: what shipped per ADR (one line
   each), every deviation, every quarantine, every deferral, and the exact
   commands the human should run in the morning to see the result
   (dev server, Storybook, test suite, podman build).

## Working style

- One ADR at a time, in order; do not start the next before the current
  one's criteria are checked or deferred.
- The ADRs' implementation outlines call out the known gotchas — read them
  before coding, not after debugging; they were written to save you hours
  (timestamp-vs-tick timekeeping, persist partitioning, preflight,
  layer order, priority inversion, SSRF parsing, sentinel release
  disambiguation, edge-triggered takeover — it's all in there).
- If something is ambiguous after reading the ADR and its amendments,
  make the call the way the surrounding ADRs would, record it as a
  deviation note, and keep moving. **The only Hard Blockers are: broken
  toolchain (npm/network down) or an Absolute Law conflict. Everything
  else has a documented path forward.**
