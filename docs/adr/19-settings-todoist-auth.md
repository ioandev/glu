# ADR 19: Settings — Todoist log out / log in

- Status: Implemented (deviations noted)
- Date: 2026-07-24
- Amended: 2026-07-24 — Zustand adoption (ADR 02): the auth substrate is a
  Zustand store (`useTodoistAuth`), not a React context provider. It is
  **deliberately outside the persisted partition** — auth status is server
  truth (the sealed cookie), never localStorage's. Semantics and all
  criteria unchanged; "provider" below reads as "store".

- Deviation (2026-07-24, implementation): the global-401 handler lives in the
  fetch layer (`src/lib/api.ts`) as a subscription the auth store registers, so
  the fetch wrapper never imports the store and the two cannot cycle.
- Deviation (2026-07-24, implementation): the store is `useTodoistAuth`; ADR
  11's button was migrated onto it and its private `/status` fetch deleted — the
  single fetch now happens once at the app shell.
- Deviation (2026-07-24, implementation): the "one component, verified by import"
  criterion is met by extracting `TodoistLogin`, which both the top-right area
  and the Settings section import.

## Context

ADR 10 shipped the Settings socket (a Mantine modal with placeholder text).
Product brief (2026-07-24): the modal gets its first real content — **the
only setting is logging out of Todoist and logging back in** — but the
**popup takes most of the screen**, deliberately, because more settings are
expected later. And the load-bearing sentence: **"it should sync with the
rest of the page"** — logging out in Settings must instantly flip every
Todoist surface (the ADR 11 button, ADR 12's list and tools icon, ADR 13's
detail, ADR 14's focused slot).

That sentence is the actual work: today each surface learns auth state on
its own (ADR 11's button fetches `status`; 12–14 react to 401s). Sync
demands **one shared auth state** — which this ADR builds, and which is why
it moves ahead of 12–14 in the build order: they get built *on* the shared
substrate instead of being retrofitted to it.

The settings pencil was carrying four other line items (chrome-direction
selection · ADR 15, archive export/import · ADR 05, wake-lock opt-out ·
ADR 17, alert volume/chime · ADR 18). **They are not absorbed and not
killed**: v1 is auth-only per the brief; the four stay penciled as future
amendments to this ADR's surface, and the section-list skeleton below is
what makes each of them a cheap row later.

**Prerequisites: ADRs 10 and 11 Implemented.** ADRs 12–14 are consumers,
not prerequisites — each picks up the shared auth state as it lands (build
order: … 10 → 11 → **19** → 12 → 13 → 14).

## Decision

### The shared auth substrate (the "sync" work)

- **We will introduce the `useTodoistAuth` Zustand store** — one store
  slice owning `{status: 'unknown'|'out'|'in', name?, id?}`, the single
  `status` fetch, and the `login()`/`logout()` actions (excluded from the
  persisted partition — server truth is never cached in localStorage). **Every Todoist surface consumes
  it**: ADR 11's button, the Settings section, and (as they land) 12's
  list/tools, 13's detail, 14's focused slot. Logout is one state
  transition observed everywhere at once — that is the whole meaning of
  "sync with the rest of the page".
- **Any 401 from any proxy call flips the shared state to logged-out**,
  through one handler in the fetch layer — today that logic is specified
  per-ADR (11/12/13); it consolidates here, once.
- **Logout does not clear preferences.** `todoistSource` (ADR 12) and
  `focusedTask` (ADR 14) stay in the blob; the UI simply renders logged-out.
  Re-login restores the whole setup. If the re-login is a *different*
  Todoist account, stale ids degrade through the gone-state paths 12/13/14
  already ship — single-user app, recorded and accepted.
- **Both logout affordances stay** (ADR 11's chip menu and the Settings
  row) and both call the same provider action — two doors, one lock.
- **No logout confirmation**: re-login is one OAuth tap when the Todoist
  session is live; a confirm dialog would protect against an inconvenience,
  not a loss. (Contrast ADR 05's New day confirm, which guards visible
  data.)

### The modal

- **Large by design**: Mantine `Modal` at near-full size on ≥`sm`
  (`size="90%"`-class), full-screen below `sm` (the ADR 13 responsive
  precedent). Content is a **settings skeleton** — a section list with one
  section today ("Todoist") and visible room to grow; the four penciled
  items each arrive later as one more section row plus an amendment here.
- **The Todoist section**: logged in → account name + **Log out** row;
  logged out → the **same Todoist-branded login component ADR 11 ships**
  (reused, not cloned — one brand treatment to maintain). **Login from
  Settings is the OAuth full-page redirect** (ADR 11's flow): the modal
  does not survive navigation, and on return the app lands on `/glu` with
  the modal closed — recorded as expected behavior, not a bug.
- **The modal stays open after logout** — the user who logged out to
  switch accounts is one tap from logging back in, right where they are.
- Chrome tokens (ADR 15) style everything; ≥44 px rows throughout.

## Options considered

- **Per-surface status polling instead of a provider** — N fetches, N
  eventual-consistency bugs, and "sync" by coincidence. Rejected; this is
  the textbook case for one context.
- **A React context instead of the store** — this ADR originally specced a
  context; superseded the same day by the owner's Zustand decision (ADR 02
  amendment) — one state idiom across the app beats a special case here.
- **Sized-to-content modal now, grow later** — resizing the modal every
  time a section lands relitigates layout per amendment; the owner already
  called the end state ("most of the space"). Rejected; big now.
- **Clearing `todoistSource`/`focusedTask` on logout** — punishes the
  overwhelmingly common re-login-as-self case to protect a switch-account
  case the gone-states already handle. Rejected.
- **Logout confirmation** — see Decision; guards nothing recoverable.
  Rejected.
- **Shipping any of the four penciled settings "while we're in here"** —
  the exact scope creep this process exists to cut. Rejected on sight;
  each arrives with its own amendment.

## Scope

### In scope

- `TodoistAuthProvider` (single status fetch, login/logout actions,
  global-401 handler) and migration of ADR 11's button onto it.
- The large responsive Settings modal with the section skeleton and the
  Todoist section (both auth states, reusing ADR 11's branded component).
- Sync obligations wired for whatever of 12–14 is implemented at build
  time; later ADRs consume the provider as they land (their build now
  post-dates this ADR).
- Tests per ADR 03's checklist (list in outline); stories (modal in both
  auth states × both schemes × chrome tokens); ADR 09 E2E block.

### Out of scope

- The four penciled settings (chrome selection · 15, archive export · 05,
  wake-lock opt-out · 17, alert volume · 18) → **future amendments to this
  ADR**, one section row each. The pencil list lives in CLAUDE.md.
- Multi-account switching UX — logout → login *is* the switch; anything
  fancier needs a brief.
- Any new proxy endpoint — `login`/`logout`/`status` (ADR 11) already
  exist; this ADR adds zero server surface.
- Settings persistence machinery — nothing here persists; future sections
  bring their own fields via the additive-blob pattern.

## Implementation outline

1. **`useTodoistAuth` store** — slice + actions; single `status` fetch on
   app mount; `logout()` = POST + set `out` (optimistic — the proxy logout
   cannot meaningfully fail closed; if the POST errors, state still goes
   `out` and the cookie dies on next 401); `login()` = full-page navigate
   to the login endpoint (via the ADR 11 API-base helper — the basePath
   rule). **Gotcha:** the provider must distinguish `unknown` (fetch in
   flight) from `out` — ADR 11's button already renders optimistically;
   consumers like 12's tools icon must not flash in during `unknown`.
2. **Global 401 handler** — the shared fetch wrapper (12's hooks land on
   it later) maps any proxy 401 → provider `out`. **Gotcha:** only proxy
   401s — a Todoist *upstream* error relayed as 502/4xx-not-401 must not
   log the user out; the distinction is the proxy's status code contract
   (ADR 11's `status` refresh semantics), test both.
3. **Migrate ADR 11's button** to the provider (delete its private fetch);
   verify the chip menu logout now routes through the provider.
4. **Settings modal content** — replace the ADR 10 placeholder: section
   skeleton, Todoist section with the two states, modal-stays-open-after-
   logout. Full-screen below `sm`; state survives breakpoint crossing
   (ADR 13 precedent).
5. **Tests**: logout in Settings flips the top-right button in the same
   render pass (integration, stubbed endpoints); modal open after logout;
   login navigates to the login URL; 401-from-proxy flips everything /
   upstream-502 flips nothing; preferences survive logout→login
   (blob untouched); `unknown` renders no logged-in-only chrome. Stories +
   a11y per standing rules.
6. **E2E block** (ADR 09 pattern, stubbed `/status` + `/logout`): drawer →
   Settings → Log out → assert top-right shows Log in, tools icon gone,
   modal still open showing the branded login.

Honest sizing: **~1 day.** Half of it is the provider migration and the
401-contract tests — the modal itself is an afternoon. The quiet payoff:
12–14 now build against a real auth substrate, which is cheaper than the
three retrofits this ADR just prevented.

## Acceptance criteria

- [x] Drawer → Settings opens a near-full-size modal (≥`sm`) / full-screen (below `sm`) with a section list containing exactly one section: Todoist.
- [x] Logged in: the section shows the account name and a Log out row; tapping it flips the top-right area to the Log in button **without a reload** and the modal remains open showing the branded login. (ADRs 12–14 landed after this one and consume the same store — their surfaces are covered by their own criteria.)
- [~] Logged out: the section shows the same branded login as the top-right area (one component, verified by import, not resemblance); tapping it performs the ADR 11 OAuth redirect; after the round trip the app is logged in everywhere with the modal closed. — the component identity and the redirect URL are verified; **the round trip itself is [deferred → HUMAN-TODO]** (needs a registered Todoist app)
- [x] `todoistSource` and `focusedTask` survive a logout→login cycle (inspect the blob before/after).
- [x] A stubbed 401 from any proxy endpoint flips all surfaces to logged-out; a stubbed 502 does not.
- [x] During the initial `unknown` state, no logged-in-only chrome flashes (throttled-network check).
- [x] ADR 11's chip-menu logout and the Settings logout produce identical state (both through the provider — verified by spy).
- [x] No new proxy endpoints exist (allowlist test unchanged); no new blob fields were added.
- [x] All modal rows ≥44 px; both schemes and all three chrome directions render the modal correctly (stories + a11y pass).
- [x] `npm test`, `npm run build`, `npm run build-storybook` green; the ADR 09 block is active and green.

## Consequences

- "Logged in" becomes a single fact with many observers instead of a
  rumor each surface verifies independently — the class of
  half-logged-out UI bugs is structurally gone, and ADRs 12–14 inherit
  the substrate before they're built.
- The Settings surface is now real and deliberately oversized: the four
  penciled items each cost one section row + one amendment here, which is
  the cheapest future this modal could have bought.
- ADR 10's placeholder criterion is superseded (amended there); the
  drawer's Settings entry now opens something worth the tap.
- Logout being preference-preserving makes it safe enough to need no
  confirmation — and makes account-switching degrade through paths that
  already exist rather than paths this ADR had to invent.
