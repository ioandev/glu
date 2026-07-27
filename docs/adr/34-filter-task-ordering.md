# ADR 34: Filter and label task order — reproducing Todoist's default sort

- Status: Implemented (deviations noted)
- Date: 2026-07-26
- Deviation (2026-07-26, implementation): **numbered 34, not 33.** ADR 33
  (notification service worker) was written in a parallel session on the same
  day and claimed the number first.
- Interaction (2026-07-26): ADR 12's same-day amendment gives filter and label
  lists **running section headers** via `labelSections()`, on the stated
  premise that "task order stays exactly as fetched". That premise is what this
  ADR overturns, and the mechanism still composes — `labelSections()` walks
  whatever order it is handed — but the *result* is louder: sorting by priority
  first fragments a filter's section runs, so a header repeats each time the
  sort re-enters a section it has already left. Both features are correct
  separately. Whether a header per run is still the right treatment on a sorted
  list is a question for whichever ADR next touches that view.

## Context

Owner report (2026-07-26): **"The ordering of the tasks from Todoist is not the
same as the app itself for filters, even though those are not ordered a specific
way."**

The last clause is the interesting one. The filters in question have no sort
applied in Todoist — no "Sort by: Priority", no manual arrangement inside the
view. The user's reasonable inference is that an unsorted view has no order to
preserve, so any order should do. It does not: **an unsorted Todoist view is not
an unordered one.** Todoist applies a default sort client-side, and it is
specific:

| View | Todoist's default order |
| --- | --- |
| Filter without a date query | Priority (descending, P1→P4) → date and time → deadline → project order → task order within its project |
| Filter with a date query | Date and time (deadline if undated) → priority → deadline → manual order → creation date |
| Label | Priority (descending) → date and time → deadline → project order → task order within its project |

Tasks with no date sink to the bottom of the date key. Priority is the one key
that runs descending; everything else ascends.

GLU reproduces none of this. ADR 12 wrote the contract as:

> **Task order is Todoist's order** (`child_order` within sections; API order
> for filters/labels) — we never re-sort; the user's Todoist arrangement is the
> arrangement.

The parenthesis is half right. For a **project**, `child_order` within
`section_order` genuinely *is* what Todoist shows, and that half stands
untouched. For a **filter or label**, "API order" was an assumption that
`/tasks/filter` returns rows in the order Todoist's own UI paints them. It does
not, and it never claimed to — the endpoint's response order is unspecified.
`collect()` appends pages verbatim, `collectFilterViews()` unions views in view
order, and `TaskList.tsx` deliberately renders non-project sources as one flat
group in array order. Every layer is faithfully preserving an order that was
never meaningful.

This is the third time ADR 12 recorded an upstream fact wrongly and no test
could see it, for the same reason as the previous two (`GET /filters` 404ing,
the comma read as AND): **every test mocks the upstream, so a mock's array order
is whatever the fixture author typed.** A mock cannot disagree with an
assumption it was written from.

The same amendment also claimed the union is ordered "in view order, which is
the order Todoist itself shows". That is wrong twice over — Todoist stacks the
views as separate lists *and* sorts within each — and this ADR supersedes it.

## Decision

**Filter and label task lists are sorted by GLU, in the proxy, using Todoist's
documented default order. Project lists are untouched.**

### One rule, not two

Todoist switches to a date-first order when the filter query contains a date
term. GLU applies the **no-date-query rule to every filter and label**:

1. **Priority**, descending — P1 first, P4 last.
2. **Date and time**, ascending — undated tasks last. A date-only task sorts at
   the start of its day, ahead of that day's timed tasks, which is where Todoist
   paints it.
3. **Deadline**, ascending — no deadline last.
4. **Project order**, ascending — the project tree in Todoist's own arrangement,
   Inbox first, a parent ahead of its sub-projects.
5. **`child_order`**, ascending — the task's manual position in its project.
6. **Task id**, ascending — never user-visible, present so the same list never
   renders in two different orders.

Detecting a date query means parsing filter syntax — `today`, `overdue`,
`due before: …`, `7 days`, `no date`, all of it composable with `&`, `|`, `!`
and parentheses, and all of it Todoist's grammar to change, not ours. A
heuristic that is right most of the time produces a *third* order — neither
Todoist's nor a predictable one — and the failure is silent. One rule is right
for the majority of filters, wrong in a bounded and explainable way for
date-driven ones (a `today` filter orders by priority where Todoist orders by
time of day), and cannot drift out of sync with a grammar we do not own.

If date-driven filters turn out to matter, the switch is a later ADR with a
real parser, not a regex added quietly to this one.

### The sort happens in the proxy, on raw Todoist fields

The keys need `priority`, `due`, `deadline`, `child_order` and `project_id`.
Four of the five are already on the wire and thrown away at `toUiTask`; `due`
and `deadline` are not even declared on `RawTask`. Sorting in `backend/` means
those fields are read where they arrive and die there, `UiTask` gains nothing,
and the web keeps its "we never re-sort" property intact and true.

This also keeps the priority inversion in one place. `toUiPriority` is the only
line in the codebase that knows API 4 is P1; sorting before that call means the
comparator sorts raw priority descending and never has to restate the inversion.

### Project order costs one extra upstream call, best-effort

Key 4 is the only one not in the task payload. A filter or label fetch therefore
also fetches `/projects`, and builds each project's rank as the path of
`child_order` values from the root, compared lexicographically — so a parent
sorts ahead of its own children rather than interleaving with them, and Inbox
sorts ahead of everything.

If that call fails, **the task list still renders**, sorted on the other five
keys. A degraded order is worth more than an error page, and the degradation is
invisible except where two tasks tie on priority, date and deadline.

There is no cache. The backend holds no per-user state by contract (ADR 11), and
a list that refetches on window focus (ADR 12) is a poor reason to start.

### The flat union gets sorted too

ADR 12's deviation stands — a multi-view filter renders as one flat union, not
Todoist's stacked per-view lists — but the union is now sorted rather than left
in view order. First-occurrence-wins still decides *which* copy of a duplicated
task survives; the sort decides where it lands.

### The 200 cap gets less honest, and says so in this ADR

The cap is applied on fetch and the sort runs after it, so a truncated list is
the API's arbitrary first 200 put in order — not Todoist's first 200. A filter
with 500 P4 tasks and three P1s can miss the P1s entirely. Sorting *before*
truncating would need every page of every view fetched, which is exactly the
unbounded work the cap exists to prevent. The "Showing first 200" line already
tells the user the list is partial; this ADR records that it is also
unrepresentative, and leaves the cap where it is.

## Options considered

- **Sort in the web, in `TaskList`.** Needs `due`, `deadline` and `projectId` on
  `UiTask`, plus a projects fetch in `useTodoistList`, to move a decision that
  has no UI component. It also breaks the one-way property that makes the
  current code readable: the proxy normalises, the components render.
- **Detect date queries and switch rules.** Matches Todoist on `today`-style
  filters, at the cost of owning a parser for someone else's grammar. See above.
- **Ask Todoist for the order.** There is no order parameter on `/tasks/filter`,
  and the Sync API returns the same unordered items. The sort is client-side in
  Todoist's own apps, which is why it has to be client-side in ours.
- **Sort projects too, for consistency.** Project view is already correct —
  `section_order` then `child_order` *is* Todoist's project order. Applying the
  filter rule there would break a working view to make two code paths match.
- **Fetch every page before sorting, so the cap is representative.** Correct and
  unbounded: a 20-view filter over a 5000-task account is 100+ upstream requests
  per focus event. The cap is a product decision (ADR 12), not an accident.

## Scope

### In scope

- `RawTask` gains `due` and `deadline`; a `compareTasks` comparator in
  `backend/todoistRoutes.ts` implementing the six keys.
- A `projectRanks()` helper reading `/projects` for `parent_id`, `child_order`
  and the Inbox flag, returning a comparable rank per project id; best-effort.
- `/todoist/tasks` sorts for `type=label` and `type=filter` only, after the
  union and the cap, before `toUiTask`.
- ADR 12 amended: its ordering line and its "in view order" claim both point
  here.
- The manual (ADR 29): the task-list bullet says what the order is. The same
  bullet currently claims section headers appear "whichever source you picked",
  which is false — they are a project-view feature — and is corrected in the
  same edit.
- Tests: comparator units for each key and each tie-break, a route test proving
  filter/label output is sorted and project output is not, a `/projects` failure
  test proving the list still renders.

### Out of scope

- **Date-query detection.** A later ADR with a real parser, if ever.
- **Stacked per-view rendering of multi-view filters.** ADR 12's deviation is
  unchanged.
- **A user-facing sort control.** GLU shows the list Todoist would show; a
  second place to configure ordering is a task manager's feature.
- **Sorting before truncation.** See options.
- **Project list order in the source picker.** `/projects` is passed through
  unsorted today; that is a different list with a different fix, and this ADR
  only reads project order, it does not display it.
- **Caching the projects fetch.** No per-user server state (ADR 11).

## Implementation outline

1. `backend/todoistRoutes.ts` — declare `due?: { date?: string; datetime?: string }`
   and `deadline?: { date?: string }` on `RawTask`.
2. `dueKey(task)` / `deadlineKey(task)` returning a sortable string with a
   sentinel that sorts last when absent; date-only values normalise to the start
   of their day.
3. `projectRanks(tokens)` — `collect('/projects')`, map id → `{ parent_id,
   child_order, inbox }`, then a memoised path walk with cycle protection.
   Returns an empty map on failure, with a `console.warn`.
4. `compareTasks(a, b, ranks)` — the six keys, in order.
5. The `/tasks` route: for `label` and `filter`, `Promise.all` the task fetch
   with `projectRanks`, sort, then map through `toUiTask`. `project` is
   unchanged.
6. `backend/todoistRoutes.test.ts` — comparator units; a route test whose mocked
   upstream returns a deliberately scrambled array; a project-fetch-fails test.
   Existing tests that index `fetchMock.mock.calls` positionally are updated for
   the extra call.
7. `web/src/components/docs/DocsSections.tsx` — the task-list bullet and
   `DOCS_UPDATED`.

## Acceptance criteria

- [x] A filter whose upstream response is scrambled renders P1 tasks first and
      P4 tasks last.
- [x] Within one priority, dated tasks precede undated ones and sort earliest
      first; a date-only task precedes a timed task on the same day.
- [x] Within one priority and date, a task with a deadline precedes one without.
- [x] Two tasks tying on priority, date and deadline order by project, with
      Inbox first and a parent project ahead of its sub-project.
- [x] Two tasks in the same project tying on everything above order by
      `child_order`.
- [x] A label view sorts by the same rule as a filter.
- [x] A project view is byte-identical to before this ADR: no-section tasks
      first, sections in `section_order`, `child_order` within each.
- [x] `/projects` returning 500 still renders the task list, sorted on the other
      five keys, with no error surfaced to the user.
- [x] A multi-view filter's flat union is sorted, and a task matching two views
      still appears once.
- [x] The manual describes the order, alongside ADR 12's same-day section
      headers for filter and label sources.

## Consequences

- **"We never re-sort" is no longer true of the proxy, and the ADR 12 line that
  says so is now scoped to projects.** The web still never re-sorts, which is
  the property worth keeping: there is one place that decides order.
- **Every filter and label fetch is two upstream requests, not one.** On a list
  that refetches on window focus, against a rate limit of 120 burst / 60 per
  minute (ADR 24), that halves the headroom for this surface.
- **A truncated filter list is now unrepresentative as well as partial.**
  Recorded above; the honest line in the UI is unchanged.
- **Date-driven filters are knowingly wrong.** A `today` filter orders by
  priority where Todoist orders by time of day. This is the deliberate cost of
  not owning a filter-grammar parser, and it is the first thing to revisit if
  the order still looks off.
