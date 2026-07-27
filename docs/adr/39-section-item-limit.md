# ADR 39: Limit the items in a section — a ceiling per section, and the row that lifts it

- Status: Implemented (deviations noted)
- Date: 2026-07-26
- Deviation (2026-07-26, implementation): **numbered 39, not 38** — ADR 38 was
  claimed by the vulnerability-scanning brief in a parallel session while this
  one was being written.
- Deviation (2026-07-26, implementation): the `TaskList` story that exercises
  the ceiling passes `onOpen`/`onFocus`, which the outline did not mention. A
  long list with no handlers is a scrollable region containing nothing
  focusable, and the a11y gate fails it — correctly. The real panel always
  wires both, so the story now matches the app rather than the fixture.

## Context

Owner brief (2026-07-26): **"Add in settings an option of 'Limit the items in a
section to' 10, 20, 50, 100. For example I have a filter with a lot of items in
a section, and I don't want to see all of them."**

The task list (ADR 12, re-cut by ADR 34) renders every task the proxy returns,
grouped under section headers — Todoist's own `section_order` for a project,
running `"<project> / <section>"` headers for a filter or label. The only
ceiling anywhere is the proxy's 200-task cap, which exists to stop a runaway
response, not to make a list readable. A filter like `overdue | today` over a
busy account routinely puts 60 tasks under one header, and the panel is a
scrolling column roughly a third of a tablet's width: the *second* section is
below the fold before the first one has said anything useful.

Three prior decisions shape this more than they look like they should:

- **The order is already correct, and this ADR must not touch it.** ADR 34 made
  the proxy sort filter and label results (priority → date → deadline → project
  order → `child_order` → id) precisely so the head of a section is the part
  worth reading. A per-section ceiling is only defensible *because* that sort
  exists — it keeps the top N, and the top N is the top N. A ceiling applied to
  an arbitrary order would be a random sample with a settings row attached.
- **Sections are two different constructs.** A project view re-buckets into
  `groupBySection`; a filter/label view keeps fetch order and drops a header
  wherever the (project, section) pair changes (`labelSections`). "A section"
  means a **run under one header** in both cases, and the setting has to mean
  the same thing in both or the row is a lie in one of them.
- **This is a display preference, not a fetch parameter.** The proxy is
  permanently stateless (ADR 11) and its 200-cap is a defence, not a view. The
  client already holds every task; hiding some of them is a render decision, and
  making it a query parameter would buy a refetch on every settings change and a
  cap that fights the one already there.

**Prerequisites: ADRs 12, 19, 29, 34 Implemented.** ADR 12 owns the list, ADR 19
the Settings section list, ADR 29 the manual, ADR 34 the order this leans on.
This ADR amends 12 and 19.

## Decision

### The setting

- **A fixed ladder — 10, 20, 50, 100, All — in a new "Tasks" Settings
  section.** The brief's four rungs plus the one it implies. ADR 28's ladder
  shape, its reasons unchanged: five ≥44 px rungs visible at once, no keyboard,
  no validation surface, no continuum where five values is the whole useful
  range.
- **Default: All.** The row exists to move off the shipped behaviour, not to
  establish it (ADR 17's pattern, ADR 28's precedent). A default of 100 would
  silently drop rows for every existing user, including the ones whose sections
  are fine — a list that quietly stops showing tasks is a worse bug than a list
  that is long.
- **"All" is stored as `0`**, the sentinel, with `SECTION_ITEM_LIMIT_ALL = 0`
  naming it once. `Infinity` does not survive `JSON.stringify` (it lands as
  `null`), and `null` in the blob is indistinguishable from a field that was
  never written. **An unrecognised value reads as the default** —
  `resolveSectionItemLimit` takes `unknown` and falls back to All, the way
  `resolveCommentThresholdMinutes` and `resolveClock` do. A hand-edited `3` must
  not become a three-task list nobody can explain.
- **`sectionItemLimit: number` in the blob**, additive, no version bump
  (ADR 19's pattern).

### What it caps

- **A section is a run under one header** — a `groupBySection` group in a
  project view, a same-(project, section) run in a filter or label view. One
  meaning, both views.
- **The cap is applied after the list's own exclusions.** The focused task
  (ADR 14) and optimistically-completed ids (ADR 20) are already filtered out
  before grouping, and they stay that way: completing a visible task **promotes
  a hidden one into the ceiling**, which is the behaviour anyone would predict
  and the reason the cap cannot move upstream of those filters.
- **It never caps the ungrouped case, because there isn't one.** Every filter
  and label run carries a header (ADR 12 amendment 2026-07-26) and a project's
  no-section bucket is a run whether or not it renders a header — so the
  headerless first group of a project view is capped too. "Section" here means
  *group*, not *named group*.

### The overflow line

- **A tappable `+N more` under the capped run, which expands that run in
  place.** The setting is about the *default* density of the list, not about
  making tasks unreachable — and the alternative (raise the setting, find the
  section, lower it again) is four taps and a modal to read one task.
- **Expansion is per-visit and per-run: `useState` in `TaskList`, never
  persisted.** A ceiling the user lifted for one section on Tuesday is not a
  preference; reopening the app is the reset. It also keeps the blob free of a
  set of section ids that would outlive the sections themselves.
- **It reads `+N more`, counting the hidden tasks, not the total.** `Showing
  first 10 of 42` states the cap the user just chose back at them; the only
  number they don't have is how much is behind the line. Once expanded the line
  disappears rather than becoming "Show less" — the run is short again by
  definition, and a collapse control on a list you are already scrolling past is
  a button for undoing a tap nobody regrets.
- **It is visually the section's, not the list's.** ADR 12's `Showing first 200`
  truncation line stays exactly where it is and says exactly what it says: that
  one is the proxy's cap and it is still the honest bottom-of-list statement.
  Two truncation stories on one screen is fine as long as neither pretends to be
  the other.

### What it deliberately does not touch

- **The proxy.** No new query parameter, no per-section fetch, no change to the
  200 cap or to ADR 34's `compareTasks`. The server keeps returning everything;
  the client decides what to paint.
- **The order.** Capping keeps the first N of the run *as sorted*. Nothing
  re-sorts, re-buckets or re-prioritises to fill a ceiling.
- **The focused task card, the task detail view, and completion.** A hidden task
  is hidden from the list, not from the app; it is still completable the moment
  it is revealed, and `+N more` never hides the focused task (it was excluded
  before grouping).

## Options considered

- **Cap the whole list instead of each section** — the brief is explicit ("items
  in a section"), and a global cap on a filter spanning six projects starves the
  last five headers entirely. Rejected.
- **Default 100** — see Decision. Silent row loss for existing users on a
  setting they never opened. Rejected.
- **No "All" rung** — then the shipped behaviour becomes unreachable and every
  existing user's list changes on upgrade. Rejected.
- **A number input** — ADR 28 already litigated this: keyboard, validation, and
  values nobody wants, on a tablet. Rejected.
- **Persist which sections are expanded** — a growing map of section ids keyed
  to a preference that means nothing next week, in a blob that is already the
  app's whole state. Rejected; per-visit `useState` is the honest lifetime.
- **A static `+N more` with no expansion** — cheaper, and it makes the tail of a
  section reachable only through Settings. Rejected: the tap costs one `useState`
  and a button.
- **Send the limit to the proxy as `?perSection=`** — the proxy would have to
  learn what a section run is (it does not group, it sorts), the cap would fight
  the 200 one, and every settings change would become a refetch. Rejected.
- **Collapse sections entirely, accordion-style** — a different feature (a
  collapsed *section*, not a limited one), with its own persistence question.
  Not pursued → future brief if the density problem survives this ADR.
- **"Show more" in fixed pages of N** — a second number to reason about for a
  list whose whole length is ≤200 anyway. Rejected; one tap reveals the run.

## Scope

### In scope

- `SECTION_ITEM_LIMIT_CHOICES`, `SECTION_ITEM_LIMIT_ALL`,
  `DEFAULT_SECTION_ITEM_LIMIT` and `resolveSectionItemLimit` in
  `web/src/store/types.ts`.
- `sectionItemLimit` in the persisted blob (default All) + its setter, storing
  only resolved values, and its `partialize` entry.
- A `sectionRuns(...)` helper in `web/src/components/todoist/types.ts` that turns
  either view into the same `{ key, header, tasks }[]` shape, so `TaskList`
  renders **one** loop and the cap is written once.
- `TaskList`: the cap, the per-run `+N more` button, its per-visit expansion
  state, and the CSS (chrome tokens, ≥44 px touch target).
- A new **Tasks** section in `SettingsContent`, above Screen, with the row.
- Tests: the resolver in both directions; the cap applied per run in both views;
  the exclusions-then-cap order (completing a visible task promotes a hidden
  one); expansion revealing exactly the hidden tasks; the additive-blob round
  trip; stories for a capped list and an expanded one; an E2E through the real
  Settings surface.
- Docs in the same session: ADR 12 amendment, ADR 19 amendment,
  `DocsSections.tsx` (+ `DOCS_UPDATED`), UI.md, CLAUDE.md index and build order.

### Out of scope

- **Collapsible sections** (a section hidden entirely, with its own persisted
  open/closed state) → future brief.
- **Any change to the proxy**, ADR 34's sort, or the 200-task cap.
- **A per-source override** ("100 in projects, 10 in filters") — a taxonomy, not
  a setting. Not pursued.
- **Sorting or re-ordering controls** of any kind. ADR 34 owns the order.
- The remaining penciled settings sections (chrome direction · 15, archive
  export · 05, alert volume · 18, takeover threshold · 21) — unchanged.

## Implementation outline

1. **Constants and resolver** in `store/types.ts`. **Gotcha:** the ladder's
   "All" rung is `0`, and `0` is falsy — every read site must compare against
   `SECTION_ITEM_LIMIT_ALL` explicitly, never `limit ? … : …`, or the one value
   meaning *no ceiling* becomes the one value meaning *no tasks*.
2. **Store field, setter, `partialize`.** Additive-blob pattern: no migration to
   write, one test to prove it (ADR 19).
3. **`sectionRuns` in the Todoist `types.ts`**, built on the existing
   `groupBySection` / `labelSections` rather than beside them — `labelSections`
   and its ADR 34 tests do not move; the new helper folds its per-task labels
   back into runs. **Gotcha:** run keys must survive a refetch and a completion,
   so the key is `(projectId, sectionId, occurrence)`, not the head task's id —
   completing the top task of an expanded run must not collapse it.
4. **`TaskList` renders one loop over runs.** The two branches collapse into
   one; the cap and the overflow button are written once. **Gotcha:** the cap
   goes *after* the `excludeId` / `completingIds` filter that is already there
   (see Decision), which the single-loop shape makes structural rather than a
   comment.
5. **The overflow button.** **Gotcha:** it is inside the list flow, so it must
   not read as a task card — it gets the muted `truncation` typography plus a
   44 px hit area, not the card treatment. **Gotcha:** CSS modules are unlayered
   and outrank Mantine (ADR 37); this is an `UnstyledButton`, so restate the
   hover state rather than assuming one.
6. **The Settings row**, copying ADR 28's field/ladder shape verbatim —
   `aria-labelledby` on the visible label, no duplicate `aria-label`.
   **Gotcha:** in Playwright, `"10"` is a substring of `"100"` — every name
   lookup on this control is `exact`.
7. **Tests, stories, E2E, docs.** The manual changes in the same session
   (ADR 29): a setting that changes what the list shows is exactly the class of
   change that makes a stale manual ship a lie.

Honest sizing: **two to three hours.** The setting is an afternoon of ADR 28
copy-work; what actually costs is `sectionRuns` and collapsing `TaskList`'s two
render branches into one without disturbing ADR 12's five list states or
ADR 34's ordering tests.

## Acceptance criteria

- [x] Settings shows a **Tasks** section whose first row is "Limit the items in a section to" — a 10 / 20 / 50 / 100 / All ladder, each rung ≥44 px, with **All** selected by default.
- [x] Its accessible name is the visible label alone (`radiogroup` named "Limit the items in a section to"), and it clears the a11y gate in both schemes (the light and dark story runs). Chrome directions are covered by construction rather than by a per-direction story: every colour on the row is a token, reused verbatim from ADR 28's ladder.
- [x] With the default untouched, the task list renders exactly as it does today in both views — same tasks, same order, same headers, same `Showing first 200` line.
- [x] With 10 selected, a project section holding 25 tasks renders 10 cards and a `+15 more` line; a filter run holding 25 renders the same. Every other run on screen is capped independently.
- [x] Tapping `+15 more` reveals exactly those 15 tasks, in order, and the line disappears. Other runs stay capped, and the expansion does not persist across a reload.
- [x] The cap is applied after the list's exclusions: with 10 selected and 11 tasks in a run, completing a visible one leaves 10 cards and no overflow line.
- [x] The focused task is never hidden by the cap (it is excluded from the list before grouping).
- [x] `sectionItemLimit` lands in the `glu:v2` blob and survives a reload with no version bump; a blob written before the field reads as All.
- [x] An off-ladder value — `3`, `999`, `NaN`, `"10"`, `null` — renders the ladder with All selected and caps nothing; the setter refuses to store one.
- [x] The proxy is untouched: no new parameter, and ADR 34's ordering tests pass unchanged.
- [x] `DocsSections.tsx` documents the setting and `DOCS_UPDATED` is current.
- [x] `npm test` (both packages), `npm run lint`, `npm run build`, `npm run build-storybook` green; the ADR 09 E2E block is active and green.

## Consequences

- **The task panel gains a density dial**, which is the first setting that
  changes what the *list* shows rather than what the timer or the comment does.
  Anything that later wants to hide tasks (a filter-within-a-filter, a
  collapsed section) now has a precedent for where that decision lives: the
  client, per-run, resolved on read.
- **`TaskList` renders one loop instead of two.** ADR 12's project/filter split
  survives in `sectionRuns`, where it is a data question, and stops being a
  render question. Every future per-section behaviour is written once.
- **A capped list can hide a task the user is looking for**, and GLU says so only
  as `+N more`. Accepted: the default is All, the line is tappable, and the order
  under it is ADR 34's — the hidden tail is by construction the least urgent part
  of the run.
- **Expansion state is per-visit**, so a user who lifts a ceiling and reloads
  gets the ceiling back. Recorded as intended: the setting is the durable
  answer, the tap is the momentary one.
