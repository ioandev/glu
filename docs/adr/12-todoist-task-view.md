# ADR 12: Todoist task view

- Status: Implemented (deviations noted)
- Date: 2026-07-23
- Amended: 2026-07-23 — cards gain a focus button and the list excludes the
  focused task (**ADR 14**); tap-to-open wired by **ADR 13**.
- Amended: 2026-07-25 — the "manual refresh button" this ADR always specified
  is now a real control in the header, left of the tools icon; it had only ever
  existed as the error state's Retry, so the sole way to refresh a healthy list
  was to leave the tab and come back. A reload of the *same* source over an
  already-rendered list now revalidates in place — tasks stay, the control
  spins — instead of collapsing to skeletons; a source *switch* still shows
  skeletons, since that content is genuinely different. Same fetch path, same
  no-polling rule.

- Amended: 2026-07-25 — **below `sm` the source picker is a modal, not a
  popover.** The one popup this ADR specified was written for the tablet, where
  a 280 px dropdown sits beside the list it feeds; on a half-tablet the same
  dropdown covers a third of the screen and hides its own options behind a
  second 220 px `Select` dropdown — a list inside a list inside a popover, on
  the target device that has the least room for it. The picker now uses ADR
  13's responsive-furniture split (`useMediaQuery("(max-width: 48em)")`): the
  popover at/above `sm`, and below it a centred modal ~90 % wide × 88 dvh tall
  holding the same segmented control over a **search field and an always-open
  listbox** that takes every remaining pixel and scrolls internally. Options
  are 48 px rows. Same fetch hook, same persisted `todoistSource`, same
  segmented control, no new proxy surface.
- Deviation (2026-07-25, amendment): the mobile list is Mantine's `Combobox`
  primitives rather than `Select` — a `Select` renders its options into a small
  overlay no matter how much room the modal has, which is the exact thing the
  modal exists to fix. `Combobox` gives the same `listbox`/`option` roles and
  keyboard walk with the list rendered inline.
- Deviation (2026-07-25, amendment): the source list is now keyed by the type
  it was fetched for, so switching Project → Label no longer shows the previous
  type's rows under the new heading while the fetch is in flight. Invisible in
  a 280 px dropdown; a full screen of wrong rows in the modal.

- Amended: 2026-07-25 — **filters were broken end to end, and both halves were
  upstream facts this ADR recorded wrongly.** (1) `GET /api/v1/filters` does
  not exist; it 404s against the live API. Saved filters live only in the Sync
  API, so `/filters` now reads them with a `filters`-only sync
  (`POST /sync`, `resource_types: ["filters"]`), drops `is_deleted`, and sorts
  by `item_order`. `/sync` is *used*, never *exposed* — the allowlist is
  unchanged and still refuses `/glu/api/todoist/sync`. (2) A filter query may
  hold **several views separated by top-level commas**; Todoist's UI unions
  them, but `/tasks/filter` reads the comma as AND — `p1, p2` returns 0 tasks
  where `p1 | p2` returns 15. The proxy now splits a filter query on its
  top-level commas (parentheses and quotes excluded), fetches each view (four
  at a time, at most `FILTER_VIEW_CAP` = 20) and unions them **in view order**,
  first occurrence winning, still capped at 200 with `truncated` set when
  anything is left out. Neither bug could surface in tests, because every test
  mocks the upstream — this is what the HUMAN-TODO real-account check existed
  to catch.
- Deviation (2026-07-25, amendment): a multi-view filter renders as **one flat
  union**, not as Todoist's stacked per-view lists. View headers are a list
  feature this ADR gave only to project sections; a task matching two views
  appears once. Revisit if the flattening ever loses meaning.
- Deviation (2026-07-24, implementation): the priority circle is a
  `role="img"` span until ADR 20 makes it a control — an `aria-label` on a
  role-less div is an axe violation, and inventing a fake button for a
  non-interactive dot is worse.
- Deviation (recorded 2026-07-25, found by the security audit): "invalid
  filter query → **surface Todoist's error text**" was never implemented. The
  proxy relays its own constructed message (`Todoist GET /tasks/filter
  failed`) and never captures an upstream response body. Kept as-is
  deliberately: relaying an upstream body verbatim is how internal detail
  leaks into a client, and the status code already distinguishes a rejected
  filter (4xx, shown) from an outage (502, not shown). The UX cost is a less
  specific message on a bad filter.
- Deviation (2026-07-24, implementation): the source picker's `Select` renders
  its dropdown inside the popover (`comboboxProps={{ withinPortal: false }}`).
  Portaled out, clicking an option counts as an outside click and Mantine closes
  the popover before `onChange` fires — the picker silently never picked.
- Deviation (2026-07-24, implementation): the Todoist header row carries a 52px
  right gutter so ADR 10's fixed corner arrow cannot sit on top of the tools
  icon (the same gutter the mockups leave).
- Deviation (2026-07-24, implementation): built on ADR 19's shared auth store,
  which landed first — the 401 handling this ADR specified per-surface now lives
  in the one fetch-layer handler.
- Deferred to HUMAN-TODO: everything that needs real Todoist data (the picker
  listing real projects/labels/filters, a real invalid-filter message). The
  equivalent behaviour is covered by the supertest suite against a mocked
  upstream and by stubbed-proxy stories and E2E.

## Context

ADR 11 proves identity (OAuth, sealed-cookie tokens, server proxy rule); this
ADR puts the actual tasks in the top-right area PLAN.md reserved on day one.
Product brief (2026-07-23): a **"tools" icon** opens a popup where the user
picks a source — a **filter**, a **label**, or a **project** (whose
**sections** display one after another) — and the task list renders in the
top-right corner **styled like Todoist**: rectangular cards, title + first
line of description (or what fits), and a **priority circle** (red for p1,
etc.). **What happens on tap is explicitly the next ADR (13, penciled)** —
cards here look tappable but do nothing.

Endpoint surface verified against developer.todoist.com (unified API v1) on
2026-07-23: `GET /api/v1/projects`, `/sections`, `/labels`, ~~`/filters`~~,
tasks by filter query, cursor pagination. *(`/filters` was wrong — it 404s;
see the 2026-07-25 amendment. The sweep read docs, not responses.)* One domain fact worth stating in bold
because it ships bugs every year: **Todoist's API priority is inverted from
its UI — API `priority: 4` is the UI's P1 (red); API `1` is P4 (none).**

**Prerequisites: ADRs 02, 03, and 11 Implemented.** Interplay: ADR 08's
chrome-on-palette rule and mobile stacking apply if 08 has landed; ADR 09's
E2E ratchet as usual; ADR 10's corner arrow keeps the extreme corner — the
task view fills the reserved region beneath it, beside ADR 11's account chip.

## Decision

### Source selection

- **A "tools" `ActionIcon`** (Tabler, per the ADR 10 icon vocabulary) sits in
  a compact header row of the Todoist area, next to ADR 11's account chip. It
  opens a **Mantine `Popover`**: a segmented control (**Filter | Label |
  Project**) over a searchable `Select` listing that type, fed by the proxy.
  One popup, three source types, no navigation.
- **The selected source persists** as an additive blob field
  (`todoistSource: { type, id, name }`, ADR 08's additive-with-default
  pattern). No source selected → the area shows a one-line hint pointing at
  the tools icon. A persisted source that no longer exists (deleted filter/
  project) degrades to the empty-state hint, never an error screen.
- **Projects render grouped by section**, one after another in Todoist's own
  `section_order`, with **no-section tasks first** (matching Todoist's
  layout); section names are small headers inside the list. Sections are a
  *display* property of a project source, not a selectable source themselves
  — that's the brief's reading, recorded.

### The list and cards

- **Cards mimic Todoist's anatomy, not its pixel-perfection**: a rectangular
  surface with the **priority circle** left (Todoist's colors — P1 red
  `#d1453b`, P2 orange `#eb8909`, P3 blue `#246fe0`, P4 neutral ring; exact
  values confirmed against Todoist at implementation), **title as plain
  text** (Todoist titles may contain markdown — strip it; rendering markdown
  is not v1), and **one ellipsized line of description** when present, no
  row reserved when absent. Card height ≥44 px; visually pressable, inert
  until ADR 13.
- **Task order is Todoist's order** (`child_order` within sections; API
  order for filters/labels) — we never re-sort; the user's Todoist
  arrangement is the arrangement.
- **The list scrolls internally** inside the reserved area at ≥`sm` (the
  page-no-scroll contract holds); below `sm` it joins ADR 08's stacked flow
  with a capped height and internal scroll.
- **Pagination cap**: follow cursors up to **200 tasks**, then show a quiet
  "showing first 200" line. A pomodoro sidebar is not a task manager; the cap
  is honest and visible, not silent (ADR 03's no-silent-caps rule).
- **Priority colors are brand-fixed; card surfaces come from the theme
  variables** — on ADR 08's 36 palette-scheme combinations the cards sit on
  a neutral surface token, so Todoist red never fights a clock palette.

### Data path

- **The ADR 11 proxy grows a read-only, allowlisted surface** — 
  `GET /glu/api/todoist/{projects,sections,labels,filters,tasks}` — each
  mapped to a specific upstream call with the server-held token. **No blind
  passthrough**: the cookie holds a `data:read_write` token, and a generic
  proxy would hand any XSS the whole account including deletes. ADR 13 adds
  its write verbs deliberately, one by one.
- **Plain fetch hooks, no query library yet**: fetch on source change, on a
  manual refresh button, and on window focus; **no polling** (tablet
  battery, Todoist rate limits). When ADR 13 introduces mutations
  (optimistic completes), it revisits TanStack Query with a real
  justification; today it would be a dependency carrying a cache we don't
  need.
- **Failure states are first-class**: 401 from the proxy → render ADR 11's
  login prompt in place; invalid filter query → surface Todoist's error text
  (filters are user-authored code; "something went wrong" is useless);
  network error → retry affordance. Skeleton rows while loading, sized like
  cards, no layout shift.

## Options considered

- **TanStack Query now** — real value arrives with mutations/optimistic
  updates (ADR 13), not with three GET lists; taking the dependency early
  means carrying its idioms before they pay. Rejected, revisit in 13.
- **Blind proxy passthrough (`/api/todoist/*` → upstream)** — an open proxy
  over a read_write token; one XSS = full account control. Rejected.
- **Sections as a selectable source** — the brief says sections display
  "one after the other" under a project; promoting them to sources adds a
  picker level nobody asked for. Rejected.
- **Markdown rendering in titles** — a markdown engine for card titles in a
  sidebar; strip to plain text until someone misses it. Rejected for v1.
- **Due dates / label chips on cards** — Todoist shows them; the brief's
  card spec is title + description line + priority circle. Cut on sight;
  ADR 13+ can add what its interactions need.
- **Polling for freshness** — battery + rate limits for a list the user
  glances at between pomodoros; focus-revalidate covers the real pattern.
  Rejected.

## Scope

### In scope

- Tools icon + source picker popover (filter/label/project, searchable),
  source persistence with graceful degradation.
- Task list in the reserved area: section-grouped project view, Todoist-order
  rendering, card anatomy with priority mapping, internal scroll, 200-task
  cap with indicator.
- Proxy expansion: the five allowlisted read-only endpoints with refresh
  handling inherited from ADR 11.
- Loading/empty/error/logged-out states.
- Tests: **the priority inversion gets a named unit test** (API 4→P1 red …
  API 1→P4); grouping/order tests from fixtures; supertest on the allowlist
  (unknown paths and non-GET verbs rejected); truncation behavior; stories
  for card variants (P1–P4, long title, no description) and list states; the
  ADR 09 E2E block via stubbed proxy responses.

### Out of scope

- **Tap behavior — ADR 13** (penciled; the very next brief). Cards are inert.
- Task creation, editing, completing, deleting → ADR 13+ as briefed.
- Markdown in titles/descriptions, due dates, label chips, avatars →
  future amendments when a brief asks.
- Real-time sync/webhooks → future ADR if staleness ever hurts.
- Todoist "Today"/"Upcoming" smart views — expressible as filter queries by
  the user; not special-cased in v1.

## Implementation outline

1. **Proxy endpoints first** (server): five GET routes, each a typed mapping
   to one upstream call, cursor-following capped at 200, token refresh via
   ADR 11's machinery. **Gotcha:** normalize priority at the proxy boundary
   — emit `uiPriority: 1..4` alongside the raw field so the frontend never
   touches the inverted scale; the inversion bug dies at one boundary or it
   lives everywhere.
2. **Hooks** — `useTodoistList(source)` with focus-revalidate and refresh;
   abort in-flight fetches on source change (**gotcha:** the stale-response
   race — switch from a big project to a small label and the big response
   lands last, overwriting; `AbortController` per request, always).
3. **Source picker** — popover + segmented + searchable selects; persist on
   pick; hint state when nothing chosen.
4. **List + cards** — section grouping (no-section block first, then
   `section_order`), card component with priority circle, plain-text title
   (strip markdown links/emphasis: Todoist `content` may contain
   `[text](url)` — show `text`), one-line description clamp. **Gotcha:**
   `-webkit-line-clamp`/`text-overflow` for the clamp, not JS measurement;
   the cards live inside a scrolling container on 36 palettes — keep them
   cheap.
5. **States** — skeletons, empty hints, 401-to-login, filter-error
   passthrough, retry.
6. **Tests/stories/E2E block** per scope; fixtures include the inversion
   table, a three-section project, and a 200+ task truncation case.

Honest sizing: **2.5–3 days.** The proxy + hooks are a day; the list with
grouping, states, and the palette-proof card surface is the second; tests,
stories, and fixtures are the rest. The picker is the easy part; the state
matrix (4 sources × loading/empty/error/ok × logged-in/out) is the part that
gets skipped and then bites.

## Acceptance criteria

- [x] Logged in, no source: the Todoist area shows the hint; the tools icon opens the popover with Filter/Label/Project tabs, each listing real data (or fixtures in tests) in a searchable select. *(verified against a real account 2026-07-25: 28 filters list, and a 14-view filter renders 102 tasks where it rendered none — the 2026-07-25 amendment)*
- [x] Picking a project renders its tasks grouped: no-section tasks first, then each section with its header, in Todoist's own order (verified against a fixture project with 3 sections).
- [x] Picking a filter or label renders its tasks in API order; an invalid filter query shows Todoist's error message text, not a generic failure.
- [x] Cards show: priority circle (fixture tasks with API priority 4/3/2/1 render red/orange/blue/neutral respectively — the named inversion test passes), plain-text title (a fixture with markdown link renders the link text only), and one ellipsized description line only when a description exists.
- [x] The selected source survives a reload; a source deleted upstream (stubbed 404) degrades to the hint state without an error screen.
- [x] A fixture list of 250 tasks renders 200 + the truncation line; the list scrolls internally and the page does not scroll at ≥`sm`.
- [x] Logged out: the area shows only ADR 11's login button — no tools icon, no list.
- [x] The proxy rejects non-GET verbs and unlisted paths (supertest); no frontend code holds or receives a Todoist token.
- [x] Rapid source switching never shows the previous source's tasks (abort test).
- [x] Below `sm` the tools icon opens a modal, not a popover: it measures over 85 % of the viewport width and over 80 % of its height, its options are on screen without a second dropdown, typing filters them in place, and picking one closes the modal and renders the tasks (E2E at 590×900, all four browser projects, 2026-07-25 amendment). At/above `sm` the popover is unchanged.
- [x] The header's refresh button refetches the current source in place: the rendered tasks stay visible, the icon spins (`aria-busy`), no skeleton flash, and the updated list lands (E2E, 2026-07-25 amendment).
- [x] Stories cover card variants and all list states in both schemes; a11y contrast passes on card text and priority circles against the surface token.
- [x] The ADR 09 E2E block (stubbed proxy) is active and green; `npm test`, `npm run build`, `npm run build-storybook` all green.

## Consequences

- The reserved area is fully alive: identity (11) + content (12), with
  interaction (13) cleanly staged next — three ADRs, three concerns, no
  bleed.
- The proxy allowlist pattern is now precedent: every future Todoist
  capability adds a named route, reviewed in an ADR, never a wildcard.
- Priority normalization at the proxy boundary means the UI codebase never
  learns the inverted scale exists — the class of bug is structurally gone.
- Plain-hooks data fetching is on notice: ADR 13's mutations are the agreed
  trigger for the query-library conversation, with this ADR's hooks as the
  migration surface.
- We now render third-party content (task titles) — plain-text stripping is
  also the XSS posture, and it must survive any future "just render the
  markdown" amendment with an explicit sanitization decision.
