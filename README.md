# GLU

A tablet-first pomodoro / focus tracker, served at [ioan.dev/glu](https://ioan.dev/glu).

## What it does

GLU runs on a tablet propped up next to you while you work — sometimes a half-tablet
split view, so phone-ish widths are a first-class layout too.

- **Pomodoro timer** — countdown with start / pause / stop, drawn by one of
  **18 hand-built clock designs** (ADR 07) in a flip-through gallery that
  repaints the whole site with the active clock's palette (ADR 08). Preset
  durations (5, 10, 15, 20, 30, 45, 60 minutes)
  above the timer, and +1 / +5 / −1 / −5 minute adjustment buttons below it. A
  running timer survives reloads and even closing the site — state lives in
  localStorage. When time's up, a chime sounds (and a notification appears
  if you're a tab away, ADR 18); the screen stays awake through a session
  (ADR 17). In the final minute, the background floods the screen until
  only the clock remains — tap anywhere to bring the controls back for the
  rest of the run (ADR 21). Tablet layout only: below `sm` the clock already
  owns the first viewport, so there is nothing to flood.
- **Environment tracking** — toggles recording what your surroundings were during a
  session: Music, Podcast, TV, Silence (untoggles the others), Noisy, Headphones.
- **Session tracking** — each completed countdown is recorded (with its
  environment) and counted; a "New day" button resets the count to zero for a
  fresh seating, quietly archiving the finished day.
- **Todoist integration** — sign-in with Todoist (OAuth, no token-pasting,
  ADR 11), a task view in the top-right area (ADR 12): pick a filter, label,
  or project via the tools popup and see Todoist-styled task cards with
  priority circles; tapping a card opens a read-only detail view (ADR 13)
  with description, comments, and comment images — modal on mobile, side
  panel on tablet. Tap the priority circle to complete a task, with a
  ten-second undo (ADR 20).
- **Focused task time tracking** (ADR 14) — pin one task above the list;
  when a timer run ends with more than a minute on it, GLU posts a
  "[5m] You spent 5 minutes on this" comment on that task in Todoist, and
  the pinned card shows the running total (summed from your own comments,
  validated, capped at 28 days). An undo bar slides up from the bottom for
  ten seconds after each run — Undo cancels the comment before it's posted.

The layout contract: the timer owns the left vertical half of the screen,
environment toggles sit bottom-right, top-right is reserved for Todoist.
Dark and light themes are both first-class (follows the OS scheme by default).

## Tech

- **Frontend:** Next.js (App Router) + Mantine, TypeScript. Served under the
  `/glu` base path from day one.
- **Backend:** Express at `/glu/api` — a stateless Todoist proxy (ADR 11),
  permanently: OAuth login without pasting a token, tokens in a sealed
  cookie only the server can read, nothing stored server-side, no database.
  Session data lives in localStorage by design.

## Use at your own risk

GLU is **personal software, built in the open**, and you run it **at your own
risk.** It ships **"AS IS", WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND** — see
the "Disclaimer of Warranty" and "Limitation of Liability" sections of the
[Apache-2.0 `LICENSE`](./LICENSE). Some things to keep in mind:

- **It touches your Todoist account.** Logging in grants the backend a token
  that can read your tasks and write comments and completions on them (ADRs
  11–14, 20). The token never reaches the browser — it lives in a sealed
  httpOnly cookie only the server can open — but if you run a public instance,
  **you** own that server and that cookie secret.
- **Your session data is local.** Sessions and the archive live in
  `localStorage` by design (ADR 05) — there is no database and no sync.
  Clearing site data clears your history; nothing is backed up for you.
- No guarantees are made about data security, availability, correctness, or
  fitness for any purpose. For full control, **self-host** it — see
  [`deploy/`](./deploy/).

## Development

The project is driven by Architecture Decision Records in [`docs/adr/`](docs/adr/).
Each ADR is the spec for its slice of work: scope, implementation outline, and
acceptance criteria. Start with [`PLAN.md`](PLAN.md) for the product intent, then
read the ADRs in order.

The repo is two independent npm packages — `web/` (the Next.js app, Storybook
and the e2e suite) and `backend/` (the Express Todoist proxy) — each with its
own lockfile and `node_modules`. There is no root `package.json`; a
[`just`](https://just.systems) task runner at the root fans out to both
(ADR 22).

```bash
just install        # installs both packages
just dev            # Next on :3000 and the API on :4000, together
just web storybook  # component and clock gallery review at :6006
just                # list every recipe; `just web` / `just backend` list theirs
```

Prefer npm directly? Each package is self-contained: `cd web && npm install &&
npm run dev`, and the same in `backend/`.

The app is at **http://localhost:3000/glu** — the root `/` 404s, by design
(`basePath: '/glu'`, ADR 01).

### Todoist setup (optional)

Without credentials everything still runs: the Todoist region shows a clean
logged-out state and nothing errors. To make login work:

1. Register **two** apps in Todoist's
   [App Management Console](https://app.todoist.com/app/settings/integrations/developer)
   — one for development, one for production. One app with a production
   redirect and a dev flow that cannot complete is the classic OAuth
   time-waster.
   - development redirect URI: `http://localhost:3000/glu/api/auth/todoist/callback`
   - production redirect URI: `https://ioan.dev/glu/api/auth/todoist/callback`
2. `just backend env` (or `cp backend/.env.example backend/.env`) and fill in
   `TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET` and a fresh `SESSION_SECRET` —
   `just backend secret` prints one. Optionally add the console's
   `TODOIST_VERIFICATION_TOKEN`, which signs the OAuth state nonce; login works
   the same without it.
3. `just dev` and click **Log in with Todoist**.

The access token never reaches the browser: it lives in a sealed httpOnly
cookie only the server can open, and every Todoist call goes through
`/glu/api` (ADR 11). The server stores nothing — there is no database.

### Install to the home screen

GLU is a PWA — **installable, deliberately not offline** (ADR 04): there is no
service worker, so an already-open app keeps running without a network but a
reload on dead wifi shows the browser's offline page. Nothing is lost; the
session restores from localStorage on reconnect.

- **Android / Chrome:** open `ioan.dev/glu`, then menu → *Install app*.
- **iPad / Safari:** open `ioan.dev/glu`, then Share → *Add to Home Screen*
  (iOS offers no install prompt; this is the only path).

Icons are generated from `web/img/favicon.svg` — the mark's source of truth —
by `just web icons`. Rerun it if the mark changes; never scale
`web/img/favicon.png` (it is a non-square export).

### The three test layers

| Layer | Command | What it covers | When |
|---|---|---|---|
| **Unit** (Vitest + jsdom) | `just web test-unit` | The store's state machine, persistence and restore branches, the toggle reducer, the chrome token maths, the clock registry and helpers. Fake clock, seconds to run. | Every save |
| **Stories** (Vitest browser mode, real Chromium) | `just web test-stories` | Every component's interaction play-function *and* the a11y contrast gate, run once per colour scheme. | Every save |
| **E2E** (Playwright, production build) | `just e2e` | What the other two cannot see: true reloads, the prod build under `basePath: '/glu'`, real keyboard events, real localStorage across navigations, hydration cleanliness. Four projects — Chromium and WebKit × tablet and half-tablet. | Before a merge or a deploy |

`just web test` runs the first two layers (seconds); `just test` adds the
backend's own suite. E2E is deliberately separate (minutes) and drives time with
Playwright's clock API, so a 20-minute pomodoro completes in milliseconds — no
test ever waits.

Point the same E2E suite at a deployed instance with
`E2E_BASE_URL=https://ioan.dev/glu/ just e2e`; that is exactly what the deploy
smoke step does (ADR 16), restricted to the `@smoke`-tagged subset.

**Local note:** `test:e2e` sets `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`
because Playwright's dependency check only knows Debian/Ubuntu package names.
CI installs the real dependencies with `playwright install --with-deps`.

## License

Licensed under the **Apache License, Version 2.0** — see [`LICENSE`](./LICENSE)
and [`NOTICE`](./NOTICE). The same license covers both packages, `web/` and
`backend/`.

Third-party attribution is generated, never hand-maintained (ADR 23):

```bash
just license   # rewrites LICENSES, web/LICENSES, backend/LICENSES
```

Each manifest lists every installed npm package with its SPDX id and bundled
license text, opens with a compliance overview that flags anything that is not
clearly permissive, and embeds GLU's own `NOTICE` + Apache-2.0 text — so the
copy that ships inside each Docker image carries the whole obligation on its
own. Rerun `just license` after any dependency change; CI warns when a
committed manifest is stale.

## Credits & attribution

GLU is built and maintained by **Ioan** ([@ioandev](https://github.com/ioandev)).

If you use, fork, or build a project on top of GLU, a mention of the original
source is appreciated:

- **Source:** https://github.com/ioandev/glu
- **App:** https://ioan.dev/glu
- **Author:** https://ioan.dev

Apache-2.0's `NOTICE` covers redistribution of the *code* (keep the `NOTICE`
file with any copy). Crediting the *idea* isn't a license term — it's a request,
but a genuinely appreciated one. 🙏
