# ADR 26: Privacy Policy and Terms of Service pages

- Status: Implemented (deviations noted)
- Date: 2026-07-25
- Amended: 2026-07-25 — **the document shell now serves three documents.**
  ADR 29 reuses it for the GLU manual rather than forking a second prose
  stylesheet, which means two changes here: `LegalPage.tsx` gained a
  `DocumentProse` export (the intro block plus `sections.map`, which
  `LegalPage` now renders in the place that markup used to sit — no visual
  change to either legal page), alongside `DocumentUpdated`, `DocumentNav` and
  `DocumentNavLink` for the surface that renders the prose without the page
  header; and the footer nav gained a **"Documentation"** link, so the three
  documents cross-link as a set rather than a one-way chain. A change to
  `legal.module.css` now restyles three documents, not two.

- Deviation (2026-07-25, implementation): the Storybook drawer story asserts
  **unprefixed** hrefs (`/privacy`). Storybook does not run `next.config.ts`,
  so `next/link` emits no basePath there; the `/glu/…` assertion lives in the
  E2E block, which runs against the production build and is the only layer
  that can see it.
- Deviation (2026-07-25, implementation): the document footer carries a third
  link, "Source on GitHub", beyond the ADR's cross-links + back-link. The
  Terms already point readers at the repository for the code licence; a link
  beats asking them to retype a URL.
- Deviation (2026-07-25, implementation): the Privacy Policy's "what is
  stored" section renders as a **card list, not a table** — a three-column
  table is unreadable at half-tablet width, and the tablet-first rule outranks
  the sibling site's layout.
- Note (2026-07-25, verification): the full E2E suite has 12 failures owned by
  unrelated in-flight work in the same tree (a new `swipeHintDismissed`
  persisted field the fixture defaults do not list yet, plus a half-tablet
  swipe-hint overlay). ADR 26's own 16 tests and ADR 10's drawer block pass on
  all four projects.

## Context

Owner brief (2026-07-25): GLU gets a Privacy Policy and Terms of Service,
reachable **from the header drawer where Settings lives**, each opening in a
**new tab**. `ioan.dev` (the sibling personal site, `/privacy` and `/terms`)
already ships the pair; GLU is the same operator on the same domain and has
been shipping without them.

The disclosure is not ceremonial — GLU actually touches three things people
care about:

- **A third-party account.** ADR 11 takes a Todoist OAuth grant at
  `data:read_write`, and ADRs 14 and 20 *write* with it (time-tracking
  comments, task complete/undo). An app that writes to someone's task manager
  owes them a written statement of what it writes and how to revoke it.
- **A behavioural record.** ADR 05 keeps a day's completed sessions plus a
  90-day archive — when you focused, for how long, in what environment. It is
  localStorage-only and there is no server copy; that is a *strong* privacy
  fact and it currently exists only in an ADR nobody outside this repo reads.
- **Device permissions.** Notifications and audio (ADR 18), wake lock
  (ADR 17). Prompts arrive with no accompanying explanation today.

Two standing facts shape the implementation:

- **The layout contract is `100dvh`, no page scroll at/above `sm`** (ADR 02) —
  but that contract belongs to `AppShell`, not to the origin. A legal document
  is long-form prose that must scroll. These are separate routes; they must
  not be rendered inside the shell.
- **`basePath: '/glu'`** (ADR 01) — `app/privacy/page.tsx` serves
  `/glu/privacy`, and every link to it goes through `next/link`, never a
  hand-written root-relative URL.

**Prerequisites: ADR 10 Implemented** (the drawer is the entry point) and
ADR 15 Implemented (the pages are styled through chrome tokens). This ADR
amends ADR 10's "exactly three entries" criterion.

## Decision

### The pages are routes, not a modal

- **We will add two App Router routes** — `app/privacy/page.tsx` and
  `app/terms/page.tsx`, served at `/glu/privacy` and `/glu/terms`. A legal
  document has to be linkable, quotable, and reachable by someone who was sent
  the URL; a modal is none of those. This is the first time GLU has a second
  screen, and it stays chrome, not navigation: nothing links *into* the app
  except a "Back to GLU" link.
- **Server components, zero client JavaScript.** The content is static prose,
  so it is plain semantic HTML styled by a CSS module reading `--glu-*` tokens
  (ADR 15) — **not** Mantine components. Mantine would ship a client bundle to
  a text page for nothing, and the tokens are what make the pages theme
  correctly anyway: `ColorSchemeScript` and ADR 15's `ChromeBootstrap` live in
  the **root layout**, so every route inherits scheme and chrome direction for
  free. A page that doesn't change when the chrome switches is an ADR 15
  review defect, legal page or not.
- **One shell, two content modules.** `LegalPage` renders
  `{title, updated, intro, sections[]}`; `PrivacyContent` and `TermsContent`
  are typed section arrays in `web/src/components/legal/`. The two documents
  stay structurally identical, and adding a section is a data edit. This is
  the shape the sibling site already uses — deliberately copied, so whoever
  edits both is editing the same thing twice, not two inventions.
- **Each page carries its own `metadata`** (title + description). The root
  layout's `title: "GLU"` would otherwise label all three screens identically
  in tab strips and share sheets.

### Entry point: a legal footer in the drawer, not two more rows

- **The drawer gains a `<nav aria-label="Legal">` footer** below the three
  action rows, holding "Privacy Policy" and "Terms of Service" as
  text-weight links. ADR 10's own consequence section warns the drawer
  becomes a junk drawer if every addition is a full action row — and these are
  *references*, not actions. Visually secondary, structurally separate.
- **Both links are ≥44 px touch targets** despite the lighter treatment. The
  tablet-first rule has no legal-boilerplate exemption.
- **Both open in a new tab** — `target="_blank"`, with
  `rel="noopener noreferrer"`, per the brief. Reading a policy should not
  replace the running app: the timer state survives (ADR 02 persists it), but
  the wake lock (ADR 17), the primed `AudioContext` (ADR 18) and the
  notification permission gesture do not survive a page teardown. The new tab
  is the correct call for a timer appliance, not just a preference.
- **The links are `next/link`**, so the basePath is applied. A hardcoded
  `/privacy` lands on `ioan.dev/privacy` — the *sibling site's* policy, which
  is the worst possible failure mode for this feature: a plausible-looking
  wrong document.

### What the documents must say (this is the reviewable part)

The copy is the deliverable; the plumbing is an hour. Both documents state
only what the code actually does, and every claim below is traceable to an
ADR or a source file:

**Privacy Policy**
- **No analytics, no advertising, no third-party scripts, no tracking
  cookies** — enforceable, not aspirational: the CSP is `default-src 'self'`
  (ADR 16 amendment, `web/src/proxy.ts`) and nothing in either package loads
  an off-origin script.
- **Session history never leaves the device.** The `glu:vN` blob is
  localStorage (ADR 02/05): timer state, environment toggles, the day's
  sessions, the ≤90-day archive, clock/chrome preferences, focused task and
  the ADR 14 outbox. There is no account, no server copy, and **no database
  anywhere** — clearing site data is a complete erasure, and it is the user's
  to perform.
- **Todoist**: OAuth grant at `data:read_write`; tokens sealed in an
  encrypted httpOnly cookie the browser cannot read and the server does not
  store (ADR 11); all API traffic proxied so the token never reaches the page;
  what GLU *writes* — a time-tracking comment on the focused task (ADR 14) and
  task complete/uncomplete (ADR 20), both only on the user's action; how to
  revoke — Log out in Settings (ADR 19), or revoke the app in Todoist.
- **Rate limiting** (ADR 24): an IP-derived counter held **in process memory
  only** — never written to disk, gone on restart, and the rejection log line
  deliberately carries no address. IPv6 is keyed by /64. This is a
  legitimate-interest processing note, and the honest version is short.
- **Device permissions and why**: notifications and sound at session end
  (ADR 18), screen wake lock (ADR 17) — all local to the browser, none of it
  reported anywhere.
- **Attachments** (ADR 13): task images load through the server proxy, so the
  browser never contacts Todoist's CDN directly.
- **Server logs**: ordinary operational logs, no analytics pipeline.
- Controller, contact address, rights, children, changes, "Last updated".

**Terms of Service**
- Personal project, free, provided **as-is**, no warranty, may change or
  disappear.
- **Acceptable use** — don't abuse the proxy; rate limits exist and are
  enforced (ADR 24); don't use a Todoist account you don't control.
- **Your Todoist account is yours**: GLU acts on your instruction and you are
  responsible for reviewing what it writes; comments and completions are
  yours to undo in Todoist.
- **Not a system of record** — session history is one browser's localStorage,
  capped at 90 days, and clearing site data destroys it. Anyone treating GLU
  as durable timekeeping has been told otherwise, in writing.
- **Licensing** points at the repo: Apache-2.0, with third-party notices
  generated per ADR 23. Code terms live in the repo; these Terms govern the
  hosted instance.
- Limitation of liability, governing law (England and Wales, matching the
  sibling site), changes, contact.

- **Contact and operator match `ioan.dev`'s existing pages** — same operator,
  same domain, one inbox. Two different addresses on one domain is a support
  bug wearing a legal hat.
- **These are owner-authored operator documents, not legal advice.** The copy
  is drafted to be accurate about the system; a lawyer has not reviewed it,
  and the owner signs off on the claims. Recorded so nobody later mistakes
  generated boilerplate for counsel.

## Options considered

- **A settings section instead of pages** — legal text inside the modal is
  unlinkable, unquotable, and buried two taps deep behind an app that must be
  loaded first. Rejected.
- **Markdown/MDX sourced content** — nicer to write, but adds an MDX toolchain
  dependency to a package that has none, for two documents. Rejected; typed
  section arrays cost nothing and keep JSX links working.
- **Mantine components for the prose** (the sibling site's approach) — pulls a
  client bundle into a static page and tempts hardcoded colours (the sibling
  literally hardcodes `#ddd`, which under ADR 15 is a defect). Rejected;
  tokens + CSS module.
- **Two more action rows in the drawer** — crowds three actions with two
  references and reads as equal weight. Rejected in favour of the footer nav.
- **Same-tab navigation** — cheaper, but tears down the wake lock, the primed
  audio context and the notification gesture mid-session. Rejected; the brief
  asked for `_blank` and the app agrees with it.
- **A cookie banner** — there is nothing to consent to: the only cookies are
  the strictly-necessary sealed session and OAuth `state` cookies (ADR 11),
  and consent UI for those is theatre that trains people to click through
  real ones. Rejected, and the Privacy Policy says why.

## Scope

### In scope

- `app/privacy/page.tsx`, `app/terms/page.tsx` with per-page metadata.
- `web/src/components/legal/`: `LegalPage`, `legal.module.css`,
  `PrivacyContent`, `TermsContent`.
- Drawer legal footer (two `next/link`s, `target="_blank"`, ≥44 px).
- Cross-links between the two documents and a "Back to GLU" link.
- Stories at both viewports (a11y contrast gate applies), and an ADR 09 e2e
  block: links present and correct, both routes render, the pages scroll.
- Amendments: ADR 10 ("exactly three entries" → three actions + a legal
  footer), CLAUDE.md's ADR index, UI.md's overlay/drawer section.

### Out of scope

- **A third-party-notices route** (`/glu/licenses` rendering ADR 23's
  generated `LICENSES`) — the Terms link to the repo instead. Future ADR if a
  hosted notices page is ever wanted.
- **A cookie banner / consent manager** — nothing non-essential to consent to.
- **An in-app "delete my data" button** — "New day" (ADR 05) and the browser's
  clear-site-data already cover it; a settings-level export/erase belongs to
  the ADR 05 archive-export pencil.
- **`robots.txt` / `sitemap.xml` / SEO metadata beyond title+description** —
  GLU is an appliance, not a content site.
- **i18n** — English only, like the rest of the app.
- **Any change to what the app collects.** This ADR documents the system as
  built; if a claim here is false, the fix is the code, in its own ADR.
- **Registering the URLs anywhere external** (Todoist's OAuth app console,
  store listings) — deploy configuration, not repository work.

## Implementation outline

1. **`legal.module.css`** — page column (`max-width: 72ch`), token-driven:
   `--glu-page-bg`, `--glu-page-fg`, `--glu-muted`, `--glu-surface`,
   `--glu-border`, `--glu-radius-card`, `--glu-heading-family/weight`. No
   literal colours. **Gotcha:** the app's no-scroll rule lives on
   `AppShell.module.css`'s `.shell`, so simply *not* using the shell is what
   makes these pages scroll — do not reach for a global `overflow` override.
2. **`LegalPage`** — server component: header (title + "Last updated"), intro,
   `sections.map`, footer with the cross-links and "Back to GLU"
   (`next/link`, so basePath applies). Sections keyed by heading.
3. **`PrivacyContent` / `TermsContent`** — the copy, per the claim list above.
   Each file owns its `UPDATED` constant; changing copy means changing it.
4. **Routes** — thin `page.tsx` files exporting `metadata` and rendering the
   content component. **Gotcha:** no `export const dynamic` needed — the CSP
   nonce (ADR 16 amendment) already makes every page dynamic; adding a
   directive here would look like an unexplained special case.
5. **Drawer footer** — `<nav aria-label="Legal">` after the `Stack` of action
   rows; `Anchor component={Link}` with `target`/`rel`; `min-height: 44px`.
   **Gotcha:** ADR 10's e2e test is named "opens with exactly three entries"
   and its story comments say the same — update both, and amend ADR 10, or the
   suite silently encodes a superseded contract.
6. **Stories** — `LegalPage.stories.tsx`: Privacy and Terms at tablet and
   half-tablet. The a11y addon's contrast gate is the real check here; ADR 15's
   `againstAll` already guarantees `--glu-muted` ≥ 4.5 on every surface, so a
   failure means the CSS reached for something that isn't a token.
7. **E2E block** (`features.spec.ts`) — drawer exposes both links with
   `target="_blank"` and the basePath-prefixed hrefs; `/glu/privacy` and
   `/glu/terms` render their `<h1>`; each cross-links to the other; the
   document scrolls at tablet width (`scrollHeight > clientHeight`, the
   inverse of the layout-contract assertion). **Gotcha:** the ADR 09 fixture's
   `open()` is relative-path-only by design — pass `"privacy"`, never
   `"/privacy"`, and its `clock-slot` wait does not apply to these routes, so
   they need a plain `page.goto` variant.
8. **Amendments + docs** — ADR 10 amendment line, CLAUDE.md index row, UI.md
   drawer contents.

Honest sizing: **~half a day.** The routes and shell are an hour. The copy is
the rest, and it is the part that has to be *right* — every sentence is a
claim about the system, and a wrong one is worse than no page.

## Acceptance criteria

- [x] `/glu/privacy` and `/glu/terms` render full documents with an `<h1>`, a "Last updated" date, and every section listed in the Decision's claim list.
- [x] Both pages scroll at tablet width and at half-tablet; the app screen's no-scroll contract is unchanged (ADR 09's layout test still passes).
- [x] Both pages render correctly in dark and light, and restyle when the chrome direction changes — no literal colour appears in `legal.module.css`.
- [x] The header drawer shows a legal footer with "Privacy Policy" and "Terms of Service"; the three action rows (GitHub, Appearance, Settings) are unchanged.
- [x] Each legal link carries `target="_blank"`, `rel="noopener noreferrer"`, and an href under `/glu/` — clicking opens a new tab and leaves the app tab's timer running.
- [x] Both links are ≥44 px tall.
- [x] Each document cross-links to the other and back to the app; every link resolves under the basePath (no 404, verified by the ADR 09 no-404 tripwire).
- [x] Each route sets its own `<title>` and meta description.
- [x] Neither page ships app client JavaScript beyond the root layout's (they import no Mantine component and no store hook).
- [x] Stories exist for both documents at both viewports and pass the a11y contrast gate in both schemes.
- [x] The ADR 09 block for this ADR is active and green, and ADR 10's drawer tests are updated rather than broken.
- [x] `npm test` (346 unit/story + 123 dark-scheme story tests), `npm run build`, `npm run lint` green; the e2e suite green apart from the 12 pre-existing failures noted above.
- [x] ADR 10, CLAUDE.md and UI.md are amended in the same session.

## Consequences

- GLU can be honestly described to a stranger: what it keeps, where it keeps
  it, what it writes to their Todoist, and what it never does. That was
  previously true but undocumented, which is indistinguishable from untrue
  to the person deciding whether to log in.
- **The privacy claims become a constraint on future ADRs.** Adding analytics,
  a durable server-side record, or a new third party is now a copy edit with a
  date bump, not a silent change. That friction is the feature.
- The app gains a second route family. Navigation is still not a concern — the
  pages link back and nothing links in — but the "one screen" simplification
  in older ADRs is no longer literally true, and the drawer now has a
  precedent for reference links alongside actions.
- Two documents to keep in sync with the sibling site's pair when the
  operator's details change. Accepted: they are separate deployments, and
  sharing text across repos would be worse.

## Amendment (2026-07-25, ADR 31)

The shared document footer gains a fourth link, **"Welcome"**, pointing at
`/glu/welcome`. ADR 31's gate is one-way: once a visitor is in the app, nothing
else in the UI leads back to the pitch, and a page that is only reachable by
typing its URL is not reachable. The footer is already the place these documents
point at each other from, so it is the natural home for the fourth. `LegalPage`
renders it, which means Privacy, Terms and the manual all gain it at once.
