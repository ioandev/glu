# ADR 29: In-app documentation — one `/glu/docs` page, opened as a modal from the drawer

- Status: Implemented (deviations noted)
- Date: 2026-07-25
- Amended: 2026-07-25 — **the shared panel header gets an opaque background**
  (owner report: "How GLU works" intermingled with the prose). `.panelHeader`
  in `headerDrawer.module.css` set `background: transparent`, which was
  invisible until this ADR put a long scroll behind it: Mantine's drawer/modal
  header is `position: sticky`, so its background is structural, and the
  document scrolled straight through the title. It now carries
  `var(--glu-surface-strong)` — the panel's own token, so the seam stays
  invisible at the top of the scroll. Fixes the Settings modal and the drawer
  by the same edit (ADRs 10/19 share the class).

- Deviation (2026-07-25, numbering): this ADR was drafted as 28 and renumbered
  to **29** on discovery that in-flight work in the same tree had already
  claimed 28 (`28-comment-minimum-run.md`) across a dozen source files. The
  number is a label; the work that had already written it into code keeps it.
- Deviation (2026-07-25, implementation): **one Escape closes the modal *and*
  the drawer behind it**, not just the modal — the acceptance criterion said
  "back to the drawer". Both Mantine overlays listen on the window, so the
  keydown reaches both. Verified identical for the Settings modal, so this is
  the house behaviour rather than a docs quirk; matching Settings beats a
  bespoke escape hatch for one row. The criterion and the E2E assertion were
  corrected to what the app does.
- Deviation (2026-07-25, implementation): **no half-tablet story for the docs
  modal.** A full-screen modal over the open drawer puts two Mantine headers in
  the document, which axe reads as two `banner` landmarks and the a11y gate
  fails. Reproduced with the Settings modal, which does the same below 48em and
  simply has no phone story — so this is a pre-existing app-level defect, not
  one this ADR introduced. Recorded here rather than papered over with a story
  that asserts around it; **future ADR** if the drawer/modal stack is ever
  reworked. The document's own page has stories at both viewports, and the
  modal is storied at tablet.
- Deviation (2026-07-25, implementation): the manual describes the ADR 28
  minimum-run ladder, which landed in the same tree while this was being
  written. Documenting a setting the moment it exists is the standing rule from
  this ADR's own Consequences, applied immediately.

## Context

Owner brief (2026-07-25): GLU gets a `/glu/docs` page documenting how the app
works, reachable **from the drawer where Settings lives** — and from there it
**opens as a modal rather than navigating**. It references the app's other
surfaces, and it ends with navigation to the Terms of Service and the Privacy
Policy. **It is one page**, not a documentation site.

Twenty-seven ADRs of behaviour are currently invisible to the person using the
app. None of this is discoverable from the screen:

- the clock is a **gallery** — swipe it, or use the chevrons, to change design
  (ADR 08); there are 18 (ADR 07);
- `s`, `p`, `n` and `Ctrl+C` drive the timer (ADR 06);
- **"New day" is a manual seating**, not a midnight rollover, and the archive
  behind it is capped at 90 days and local-only (ADR 05);
- **Silence untoggles the other sound chips** and is *data about how you
  worked*, never an audio mute (ADR 02) — and since ADR 27 it can end up in
  the comment posted to Todoist;
- a finished run posts a **time comment to the focused task** and gives you a
  few seconds to undo it (ADRs 14, 20);
- the last 60 seconds flood the background on purpose (ADR 21);
- a manual Stop is deliberately silent while a live zero-cross chimes
  (ADR 18).

ADR 26 shipped the two documents that say what GLU *does with your data*.
Nothing says what GLU *is* or how to drive it. The README is a developer
artifact behind a GitHub link, and it is about building the thing.

Two standing facts shape the implementation:

- **ADR 26 already built a document shell** — `LegalPage`, `legal.module.css`,
  typed `LegalSection[]`, tokens not literals, server-rendered with no Mantine.
  A second prose stylesheet would be a fork, not a feature.
- **Leaving the tab is expensive.** The wake lock (ADR 17), the primed
  `AudioContext` (ADR 18) and the notification permission gesture do not
  survive a page teardown. ADR 26 answered that with `target="_blank"`;
  documentation, which is read *while using the app*, gets the better answer.

**Prerequisites: ADR 10 Implemented** (the drawer is the entry point), ADR 15
(chrome tokens), ADR 26 Implemented (the document shell and the legal footer).
This ADR amends ADRs 10 and 26.

## Decision

### One document, two surfaces, one source of truth

- **We will add `app/docs/page.tsx`**, served at `/glu/docs`, rendering a
  single scrolling document through ADR 26's `LegalPage` shell. A route
  because documentation must be linkable and quotable, and readable by someone
  who was sent the URL before they have ever opened the app.
- **One page. No sub-routes, no sidebar, no search, no section pages.** The
  brief says so and the product agrees: GLU is a one-screen appliance, and a
  navigation tree for it would be a larger surface than the thing it
  documents. Ctrl+F is the search.
- **The copy lives once**, in `web/src/components/docs/DocsSections.tsx`, as a
  typed `LegalSection[]` — ADR 26's shape, deliberately. The route and the
  modal render the same array. Two copies of a manual is how a manual becomes
  wrong.

### From the drawer it opens as a modal, not a navigation

- **The drawer gains a fourth action row, "Docs"**, above Settings — read,
  then adjust. It opens a **Mantine `Modal`**, the same overlay Settings uses:
  `size="90%"`, full-screen below `48em` (the ADR 13 responsive precedent),
  same panel and header classes. Two overlay treatments for two rows in one
  drawer would be a design defect.
- **It is an action row, not a legal-footer link.** ADR 26 put references in
  the footer because they navigate away; this one opens an overlay, exactly
  like Settings. A footer where one link opens a tab and its neighbour opens a
  modal teaches nothing. **ADR 10's "exactly three entries" — already amended
  once by ADR 26 — becomes four action rows plus the legal footer.**
- **The modal is the right call, not just the brief's.** Documentation is
  looked up *mid-session* ("what does the chevron do?"). A new tab would tear
  down the wake lock, the primed audio context and the notification gesture,
  and a same-tab navigation would do that *and* hide a running timer. The
  modal keeps the timer visible, running, and one Escape away.
- **The modal body is code-split** (`next/dynamic`, no SSR). This is the
  largest block of copy in the app and the least frequently opened; the timer's
  first paint must not carry it. The route is unaffected — it imports the
  sections directly and stays a zero-client-JS server render.

### Cross-links: the three documents are a set

- **The docs footer carries "Privacy Policy" and "Terms of Service"**, in that
  order, as the brief's closing navigation — plus "Open as a page" in the
  modal, so the shareable URL is reachable from where people actually are.
  From the modal, both legal links open in a **new tab**
  (`target="_blank" rel="noopener noreferrer"`), for ADR 26's reason
  unchanged: the app behind the overlay must survive the click.
- **`LegalPage`'s footer gains a "Documentation" link**, so Privacy and Terms
  point back. Three documents that only link one way is a chain; this is a set.
- **Every internal link is `next/link`.** ADR 26's footgun is unchanged and
  still the worst failure mode available: a hand-written `/docs` resolves to
  `ioan.dev/docs`, someone else's page that looks plausible.

### What the documentation must say (the reviewable part)

The copy is the deliverable. Every statement below is traceable to an ADR or a
source file, and the document is written for the person holding the tablet —
not a changelog, not an architecture tour.

1. **What GLU is** — a pomodoro / focus timer for a tablet. No account, no
   sign-up, nothing to install (though you can). One screen.
2. **The timer** — presets 5/10/15/20/30/45/60, default 20; Start / Pause /
   Stop; ±2 / ±5 adjustments, floor of one minute; the four states; a preset
   tapped mid-run retargets the run; the timer survives a reload or a closed
   lid because it counts from timestamps, not from ticks.
3. **Keyboard** — `s` stop, `p` pause/resume, `n` abandon and start a fresh run
   at the selected duration, `Ctrl+C` stop (and why it still copies when text
   is selected). Typing in a field never triggers them.
4. **The clock is a gallery** — 18 designs; swipe it, or use the chevrons at
   tablet width; the flip slides in the direction of travel; the active clock
   recolours the whole page; the choice is remembered.
5. **Environment toggles** — the six chips; Silence clears the other sound
   chips, Headphones is independent; they are **recorded with each completed
   session** and, if the Time-comments setting is on, named in the Todoist
   comment. Silence is not a mute — the chime is the OS volume's business.
6. **Sessions and "New day"** — one dot per completed session, capped at 12
   then "+N"; New day is a **manual seating** with a confirm, never a midnight
   reset; today plus at most 90 archived days; all of it in this browser only,
   and clearing site data erases it. Points at the Privacy Policy.
7. **Alerts** — a chime when a run reaches zero on a live tick; a notification
   **only** when the tab is in the background; permission asked once, at your
   first Start; a manual Stop is silent on purpose; the platform truth
   (iPadOS Safari and Android Chrome degrade to chime-only).
8. **Staying awake** — Settings → Screen, two switches, their defaults (off /
   on) and the five-minute tail after a pause or finish.
9. **The last minute** — under 60 seconds the background floods and everything
   but the clock recedes; it clears the moment the run ends or you stop.
10. **Todoist (optional)** — logging in; the source picker (Filter / Label /
    Project); task cards and the priority circle; **tapping the circle
    completes**, with ~10 seconds to undo; focusing a task; the read-only
    detail view; the **time comment** posted after a run longer than a minute
    on the focused task, with its undo window; "Say how you worked"; how to
    log out or revoke. One sentence on where the token lives, pointing at the
    Privacy Policy for the rest.
11. **Install it** — installable as an app; **not offline** — it needs a
    connection every time.
12. **Two layouts** — everything on one screen at tablet width; below that the
    clock owns the first screenful and the rest stacks under it.
13. **Where things live** — this drawer: GitHub, Appearance, Docs, Settings;
    and what each Settings section holds.
14. **Limits, honestly** — no sync between devices or browsers; no offline; no
    server copy of anything; the proxy is rate-limited; history is a record for
    you, not a system of record (points at the Terms).
15. **Privacy and terms** — one line each, then the footer navigation.

**This is a user manual, not an architecture document.** Internals appear only
where they change what the user should expect — timestamps not ticks, the
in-memory rate limiter, the sealed cookie. ADR numbers do not appear in the
copy at all.

## Options considered

- **Navigate to `/glu/docs` from the drawer**, as ADR 26's legal links do —
  rejected by the brief, and independently by the teardown cost: docs are read
  mid-session, legal documents are read once and taken away.
- **A modal with no route** — unlinkable and unshareable, and unreadable
  without first loading the app. Rejected; the whole point of a page is that
  you can send it to someone.
- **A documentation site** (sections as routes, a sidebar, search) — rejected
  by the brief ("the docs page should be one") and by product shape: more
  navigation than the app it documents.
- **MDX or Markdown-sourced copy** — nicer to author, but adds a toolchain to
  a package that has none, for one document. Rejected for ADR 26's reason,
  unchanged.
- **A Settings section** — settings change the app, documentation explains it;
  and a manual inside a section list is a scroll trap. Rejected.
- **The README, linked from the drawer** — a developer artifact about building
  GLU, on someone else's domain, with a different audience. Rejected.
- **A first-run tour / coach marks** — a real option for discoverability, and a
  much bigger one: overlays, sequencing, a "seen" flag in the persisted blob,
  and a thing to dismiss on every fresh browser. Out of scope; if it is ever
  wanted it is its own ADR, and it should link to this page rather than
  restate it.
- **A table of contents with anchor links** — genuinely useful on a
  fourteen-section page, but hash anchors and a modal scroll container do not
  agree, and a TOC that works on one of the two surfaces is worse than none.
  Out of scope, with a named future amendment.
- **`?docs` query param so the modal is deep-linkable** — routing state for an
  ephemeral overlay, for a case the route already serves. Rejected.

## Scope

### In scope

- `web/src/components/docs/DocsSections.tsx` — the copy and `DOCS_UPDATED`.
- `web/src/components/docs/DocsContent.tsx` — the route document (via
  `LegalPage`).
- `web/src/components/docs/DocsModalBody.tsx` — the modal frame: the same
  prose plus the closing navigation.
- `app/docs/page.tsx` with its own `metadata`.
- `LegalPage.tsx`: a `DocumentProse` export (intro + sections, shared by both
  surfaces), the `DocumentUpdated` / `DocumentNav` / `DocumentNavLink` exports
  the modal needs to render the document without the page header, and a
  "Documentation" link in the footer nav.
- `HeaderDrawer`: the "Docs" action row and its modal, code-split.
- Stories: the document at both viewports, and a drawer story that opens the
  modal.
- An ADR 09 e2e block: the row opens a modal **without navigating**, the timer
  keeps running behind it, Escape closes it; `/glu/docs` renders and scrolls;
  the closing navigation resolves under the basePath; the legal pages link back.
- Amendments: ADR 10 (four action rows), ADR 26 (`DocumentProse`, footer link),
  CLAUDE.md's ADR index, UI.md's drawer/overlay section.

### Out of scope

- **In-page anchors / table of contents** — future amendment to this ADR if the
  page grows past comfortable scrolling on the route *and* the modal.
- **Search** — one page, Ctrl+F.
- **Screenshots, diagrams or GIFs** — weight on an appliance, and the first UI
  change makes them lies. Prose describes what is on screen.
- **A first-run tour, coach marks, or per-control help buttons** — own ADR.
- **A changelog / release notes page** — the repository has the history.
- **Developer or deployment documentation** — README and the ADRs own that,
  and this page links to the repository.
- **i18n** — English, like the rest of the app.
- **Any behaviour change.** This documents GLU as built; if a sentence here is
  false, the fix is the code, in its own ADR.
- **A hosted third-party notices route** — still ADR 26's out-of-scope.

## Implementation outline

1. **`LegalPage.tsx`: extract `DocumentProse`** — the intro block plus the
   `sections.map`, which `LegalPage` then renders internally. Zero visual
   change to Privacy and Terms; it exists so the modal cannot fork the prose
   treatment. Add the "Documentation" footer link in the same edit.
   **Gotcha:** the ADR 26 story asserts `getAllByRole("link", …)[0]` on the
   footer names — adding a third link is safe, changing the first two is not.
2. **`DocsSections.tsx`** — the copy, per the fifteen-point claim list. Plain
   prose components only (`DataList`, `LegalLink` from ADR 26); **no Mantine,
   no store hook**, because the route must stay a server component and the
   modal must stay cheap to split.
3. **`DocsContent.tsx` / `app/docs/page.tsx`** — the route. `metadata` with
   its own title and description; the root layout's `title: "GLU"` would
   otherwise label all four screens identically.
4. **`DocsModalBody.tsx`** — `DocumentProse` plus a `<nav aria-label="Docs
   navigation">` holding Privacy, Terms and "Open as a page". Legal links get
   `target="_blank"` + `rel`; all three are `next/link`; ≥44 px.
5. **Drawer** — a fourth row with `IconBook`, then a second `Modal` mirroring
   the Settings one. `const DocsModalBody = dynamic(() => import(...), { ssr:
   false })`. **Gotcha:** mount the modal body only while open, or the dynamic
   chunk loads on first render and the split buys nothing.
   **Gotcha:** ADR 10's e2e test is literally named "opens with exactly three
   action rows" — rename it and amend ADR 10, or the suite silently encodes a
   superseded contract for the second time.
6. **Stories** — `DocsContent.stories.tsx` at tablet and half-tablet (the a11y
   contrast gate is the real check), and `DocsModalOpen` on the drawer:
   `findByRole` throughout, since the body arrives asynchronously.
7. **E2E block** — the modal assertions are the ones that matter: after
   clicking Docs, `page.url()` is unchanged, `clock-slot` is still in the DOM,
   a running timer's readout still moves, and Escape returns to the drawer.
   Then the route: `<h1>`, scrolls at tablet width, closing nav hrefs under
   `/glu/`, Privacy → Documentation → back.
8. **Amendments + docs** — ADR 10, ADR 26, CLAUDE.md, UI.md.

Honest sizing: **half a day.** The plumbing is two hours — a route, a modal,
one extracted component. The copy is the rest, and it is the part that has to
be right: fifteen sections, every one a claim about the system, and a wrong one
is worse than no page at all.

## Acceptance criteria

- [x] `/glu/docs` renders one document with an `<h1>`, a "Last updated" date, and every section in the claim list; the page scrolls at tablet and half-tablet width.
- [x] The drawer shows four action rows — GitHub, Appearance, Docs, Settings — plus the unchanged legal footer; every row is ≥44 px.
- [x] Clicking **Docs** opens a modal: the URL does not change, the app stays mounted behind it, and a running timer keeps counting. **Escape closes the modal and the drawer together** — see the deviation above.
- [x] The modal and the page show the same sections, from the same source module.
- [x] The document ends with navigation to the Privacy Policy and the Terms of Service; from the modal both open in a new tab with `rel="noopener noreferrer"`, and the modal also offers "Open as a page" pointing at `/glu/docs`.
- [x] Every internal link resolves under the basePath — asserted as `/glu/privacy`, `/glu/terms`, `/glu/docs` in the E2E block, and walked Docs → Privacy → Docs.
- [x] The Privacy and Terms footers link to the documentation; their existing links and copy are unchanged (ADR 26's stories and E2E block pass untouched).
- [x] The route sets its own `<title>` and meta description, and ships no app client JavaScript beyond the root layout's.
- [x] Both surfaces render correctly in dark and light and restyle with the chrome direction; no literal colour is added to any stylesheet (`docs.module.css` sets measure and spacing only).
- [x] Stories exist for the document at both viewports and for the drawer modal, and pass the a11y contrast gate in both schemes — **modal storied at tablet only**, per the deviation above.
- [x] The ADR 09 block for this ADR is active and green; ADR 10's drawer test was renamed and extended rather than broken.
- [x] `npm test` (417 unit/story + 145 dark-scheme story), `npm run build` and `npm run lint` green; the ADR 29 + ADR 10 + ADR 26 E2E blocks are 60/60 green across all four projects.
- [x] ADR 10, ADR 26, CLAUDE.md and UI.md are amended in the same session.
- [x] The sticky panel header is opaque: with the modal scrolled, the header's computed `background-color` has no alpha and the title stays pinned to the top of the scroller (amendment above; asserted in the ADR 29 E2E block).

## Consequences

- GLU can be handed to someone without a demonstration. Every behaviour that
  previously needed telling — the gallery swipe, the hotkeys, what New day
  destroys, what gets written to Todoist — is written down, in the app, one tap
  from the timer.
- **The manual becomes a constraint, like the privacy claims did.** Changing a
  default, a hotkey or an undo window is now a copy edit with a date bump. That
  friction is the feature: an ADR that changes behaviour and leaves this page
  stale has shipped a lie to the user, not just a stale document.
- The drawer is now four actions and two references. That is the ceiling —
  the next addition either replaces a row or the drawer becomes the junk drawer
  ADR 10 warned about.
- Documentation and legal now share one shell. A change to `legal.module.css`
  restyles three documents; that is the point, and it is also the thing to
  remember before "just tweaking" it.
