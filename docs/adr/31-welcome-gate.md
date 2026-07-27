# ADR 31: Welcome gate — a front door for the first visit

- Status: Implemented (deviations noted)
- Date: 2026-07-25
- Amended (2026-07-26): **the install fact gets its own visible callout**,
  promoted out of the trailing footnote. Owner report: installability was
  going unnoticed, and a one-clause mention below the feature grid and the
  footer nav was too easy to scroll past. `WelcomeSections.tsx` gains
  `welcomeInstallNote` (the callout copy — points at the browser's own install
  control: the address-bar icon, "Add to Home Screen", the Android install
  menu item; it does not claim to trigger installation itself, and does not
  wire `beforeinstallprompt`), and `welcomeFootnote` shrinks to the one
  sentence that is genuinely a footnote ("GLU is free and open source").
  `WelcomeContent.tsx` renders the callout right after the hero/CTA, in a new
  `.installCallout` card (`welcome.module.css`, `--glu-*` tokens only, same as
  every other rule on this page — accent-bordered rather than filled, so it
  reads as a highlight and not a warning). House rule honoured: no ADR
  numbers, and no fact this callout states that ADR 04/29's manual does not
  already state. Same-day ADR 29 amendment reorders the manual's own install
  section for the same reason.

## Context

Owner brief (2026-07-25): "a homepage similar to `/repos/canvas` — users join
first, read something about the app, and then they can join the app itself."

Today `/glu` is the app and nothing else. A first-time visitor lands on a
20:00 clock, six unlabelled chips and a chevron in the corner, with no sentence
anywhere on the page saying what GLU is, that there is no sign-up, that the
clock is a gallery of eighteen, or that Todoist is optional. ADR 29 wrote all
of that down — and then put it behind a drawer, a Docs row and a modal, which
is three deliberate actions after the moment the question is actually being
asked. The manual answers "how does this work"; nobody has answered "what is
this" yet.

The sibling project solves it with two files: `HomeGate` reads a
`canvas:started` flag out of `localStorage` and renders `Landing` until the
visitor presses the CTA, then the editor forever. That shape is right for GLU
and the reasoning transfers — a focus timer is a *daily* tool, so the front
door has to be a one-time toll, not a permanent lobby.

Four standing facts shape the implementation, and three of them are traps:

- **The persisted blob is a single versioned object** (ADR 02): `glu:v2`,
  written by Zustand `persist` through `store/storage.ts`. Canvas's second
  standalone `localStorage` key has no equivalent here — a stray `glu:entered`
  would be the review defect, not the shortcut.
- **The store sets `skipHydration: true`.** Before the mount effect runs, the
  store holds *defaults*, and any `setState` at that moment writes those
  defaults straight over the real blob. A CTA that flips a flag without
  waiting for hydration does not "set a boolean" — it silently erases the
  visitor's 90-day archive, clock choice and Todoist source. This is the one
  genuinely dangerous line in the feature.
- **The additive-blob pattern gives new fields their default on read**
  (ADR 19), and the default here is `false` — meaning every existing user's
  next load would greet them with a landing page for an app they have been
  using for a month. Absent-means-false is wrong for this field; the migration
  has to say so explicitly.
- **`e2e/fixtures.ts` waits on `[data-testid="clock-slot"]` in `open()`**, the
  one door all ~330 Playwright tests walk through. A gate in front of the shell
  fails the entire suite by timeout, not by assertion.

## Decision

**We will add one document-class route, `/glu/welcome`, and gate `/glu` on a
persisted one-way flag.**

1. **The copy lives once, and two frames render it** — the same arrangement
   ADR 29 uses for the manual (`DocsSections` → route + modal) and ADR 26 uses
   for the legal pair. `components/welcome/WelcomeSections.tsx` holds the hero,
   the feature cards and the footnote; `WelcomeContent.tsx` is the frame and
   takes its call-to-action as a prop. The route and the gate are two mounts of
   that one component, so the pitch cannot drift from itself.

2. **`/glu/welcome` is a real route**, server-rendered, linkable, shareable and
   crawlable — the same class of page as `/glu/docs`, `/glu/privacy` and
   `/glu/terms`, and outside `AppShell` for the same reason: the `100dvh`
   no-scroll contract belongs to the shell, and a pitch has to scroll. It is
   what you paste into a chat when someone asks what you use.

3. **`/glu` renders `WelcomeGate`, not `AppShell` directly.** After hydration
   the gate renders `AppShell` when `hasEnteredApp` is true and the welcome
   when it is false. **Before hydration it renders `null`** — the same choice
   canvas makes, and for a sharper reason here: the alternative is that every
   returning user, on every load, gets a flash of a marketing page in front of
   the timer they opened the tab to look at. `/glu` already paints an empty
   shell for that beat (`AppShell` gates its whole interior on `useHydrated`),
   so nothing is lost, and the crawlable prose is at `/glu/welcome` where it
   belongs.

4. **The flag is `hasEnteredApp`, a field in the `glu:v2` blob**, alongside
   `swipeHintDismissed` and `hasStartedRun` — the two one-way UI facts that
   already live there. No version bump (additive), but the `migrate` step sets
   it to **`true`** whenever a blob was read: *possessing a blob is proof of a
   prior visit*. `initialPersistedState()` keeps `false`, which is the only
   place a genuine first visit is decided.

5. **One `EnterAppButton`, used by both frames, and it waits for hydration.**
   On the gate it flips the flag in place. On the route it flips the flag and
   then routes to `/` — because a plain link there would bounce off the gate
   and land the visitor back on the welcome, a loop that only shows up when
   someone actually reads the page before entering. It is disabled until
   `useHydrated()` is true, which is what keeps decision 4's trap shut.

6. **The welcome is never shown twice, and never becomes unreachable.** Once
   entered, `/glu` is the app forever; `/glu/welcome` stays live and gains a
   link in the shared document footer, so the page a visitor skipped is still
   one click from the manual they eventually read.

## Options considered

| Option | Why it lost |
| --- | --- |
| **Gate `/glu` client-side, welcome as a route (chosen)** | — |
| Welcome as the gate only, no route | The pitch would exist solely inside a client branch: uncrawlable, unlinkable, and impossible to give an Open Graph card. ADR 30 is mid-flight specifically so GLU's pages unfurl. |
| Server-side gate: cookie + redirect in `proxy.ts` | Needs a cookie GLU does not set and a stateful read the "stateless proxy" constraint exists to prevent, and it makes the first byte of every load a redirect. The flag is a client preference; it belongs with the other client preferences. |
| `/glu/welcome` as the permanent landing, `/glu/app` as the app | Moves the app off the URL people bookmark, breaks the PWA `start_url`, and charges a daily user one extra click forever to solve a first-visit problem. |
| Separate `glu:entered` localStorage key (canvas parity) | Two sources of persisted truth, one of them outside the versioned blob and invisible to `migrate` — so an existing user gets the landing on their next load. The blob field is both safer and less code. |
| Onboarding overlay on top of a mounted `AppShell` | Boots the wake lock, the alert hooks and the Todoist status probe for someone who has not agreed to use the app yet, and puts a running timer behind a marketing page. |

## Scope

### In scope

- `web/src/components/welcome/WelcomeSections.tsx` — the copy, one module.
- `web/src/components/welcome/WelcomeContent.tsx` — the frame, server component.
- `web/src/components/welcome/WelcomeGate.tsx` — `"use client"`, the gate.
- `web/src/components/welcome/EnterAppButton.tsx` — the CTA, both frames.
- `web/src/components/welcome/welcome.module.css` — chrome tokens only.
- `web/src/app/welcome/page.tsx` + `opengraph-image.tsx` — the route.
- `web/src/app/page.tsx` — renders `WelcomeGate`.
- Store: `hasEnteredApp` field, `enterApp()` action, `partialize`, `migrate`.
- `siteMetadata.ts`: `"/welcome"` added to `SiteRoute` and `PAGE_META` (ADR 30).
- `LegalPage`'s shared footer gains a "Welcome" link (ADR 26 amendment).
- `DocsSections.tsx` gains one paragraph naming the welcome page (ADR 29's
  standing obligation — a screen the manual does not mention is a manual that
  is already wrong).
- Tests: store unit tests for the flag and its migration, a component test for
  the gate's three states, a Storybook story, and e2e coverage of first visit /
  enter / return, plus the fixture change that keeps the existing suite green.
- `UI.md` and `CLAUDE.md` kept in sync (new document page, new ADR row).

### Out of scope

- **A drawer row or Settings control to re-show the welcome.** It would be an
  ADR 10 + ADR 19 amendment and one more row in a section list ADR 19 already
  calls too thin to design. `/glu/welcome` is reachable by URL and from every
  document footer; if someone asks for a "show me the intro again" control it
  arrives as an ADR 19 amendment.
- **Screenshots, clock previews or motion on the welcome.** A live `ClockGallery`
  on the landing means mounting the clock registry and a tick loop in front of
  the gate; a static screenshot means an asset that goes stale every time a
  clock is retouched, and eighteen of them in two schemes. Text and tokens
  only. A future design pass (UI.md "Open canvas") can revisit it.
- **A multi-step tour, tooltips or coach marks** over the app itself.
- **Any analytics, conversion or funnel measurement.** ADR 26's privacy text
  says GLU has none, and this ADR is not the one that makes that sentence false.
- **A/B testing the copy**, which needs a server that remembers people.
- **Changing the PWA `start_url`** — it stays `/glu`; an installed app going
  through a gate its owner already passed is exactly what the flag prevents.

## Implementation outline

1. **Store first** (`store/gluStore.ts`). Add `hasEnteredApp: boolean` to
   `GluPersistedState` with the comment explaining why it is one-way, `false`
   in `initialPersistedState()`, the field in `partialize`, and
   `enterApp: () => set({ hasEnteredApp: true })` on `GluState`. In `migrate`,
   after the existing spread, force the value:
   `hasEnteredApp: state.hasEnteredApp ?? true`. Do this in **both** migration
   branches — the v1 branch spreads `initialPersistedState()` too, and a v1
   blob is the strongest possible evidence of a prior visit.

2. **The copy** (`WelcomeSections.tsx`). Hero eyebrow / headline / two-sentence
   sub, four feature cards, one footnote. House rule, carried from ADR 29: no
   ADR numbers, and **no number or default that the manual does not also
   state** — "eighteen clock designs" and "six chips" are safe because
   `DocsSections` says them; a preset list or a hotkey here would be a second
   place to forget to update.

3. **The frame** (`WelcomeContent.tsx`). Server component, no Mantine, no store
   hooks — the same discipline as `LegalPage`. Props: `action: ReactNode`.
   Every internal link is `next/link`; a hand-written `/docs` lands on the
   sibling site under `basePath: '/glu'`.

4. **The CTA** (`EnterAppButton.tsx`). `"use client"`. Calls `useHydrated()`
   and `enterApp()`. **Do not call `enterApp()` before `useHydrated()` returns
   true** — with `skipHydration: true` the store is still holding defaults, and
   `persist` writes the whole partialized object on every `set`, so an early
   click overwrites `glu:v2` with a blank app. Render it `aria-disabled` and
   inert until then; hydration is sub-100 ms and the button is below a
   paragraph of prose, so no real click ever hits the closed window. Prop
   `navigateTo?: "/"` decides whether it also `router.push`es — set on the
   route, absent on the gate.

5. **The gate** (`WelcomeGate.tsx` → `app/page.tsx`). `useHydrated()`;
   `null` → `WelcomeContent` → `AppShell`. Keep `app/page.tsx` a server
   component that renders the client gate, exactly as it renders `AppShell`
   today.

6. **The route** (`app/welcome/page.tsx`). `pageMetadata("/welcome")`, and add
   the route to `SiteRoute` + `PAGE_META` in `siteMetadata.ts` — the union type
   makes the compiler find the entry you forgot. Copy
   `app/docs/opengraph-image.tsx` for the card.

7. **Styling** (`welcome.module.css`). `--glu-*` tokens only; a literal colour
   is a review defect (ADR 15). Do **not** reach into `legal.module.css` — it
   is shared by Privacy, Terms and the manual, and a hero rule added there
   restyles all three. Touch targets ≥ 44 px; the CTA is the largest thing on
   the page. Feature grid: one column below `48em`, two above. The page
   scrolls at every width — the shell's no-scroll contract does not apply here,
   which is also true of the gate, since the gate is not the shell.

8. **The e2e fixture** (`e2e/fixtures.ts`). `open()` waits on `clock-slot`, so
   it must seed `hasEnteredApp: true` before the first script runs — the
   returning user is the app's normal state and every existing test means to be
   one. Tests that seed their own blob must not lose it: fold the flag into the
   seeding path so an explicit `seedStorage` call still lands inside the app.

9. **Tests.** Store: default `false`, `enterApp()` one-way, and — the one that
   matters — a v1 and a v2 blob without the field both migrate to `true`.
   Component: gate renders nothing pre-hydration, the welcome when false, the
   shell when true. E2E: a clean profile lands on the welcome, the CTA reveals
   the clock, a reload goes straight to the app, and `/glu/welcome` renders
   for a visitor who has already entered.

10. **Documents.** One paragraph in `DocsSections.tsx`; the footer link in
    `LegalPage`; `UI.md`'s "Document pages" section gains the fourth route and
    a line about the gate; `CLAUDE.md` gains the ADR 31 row and its build-order
    entry. ADR 26 and ADR 30 each take a one-line amendment naming this ADR.

## Acceptance criteria

1. A browser with no `glu:*` key open on `/glu` shows the welcome — headline,
   four feature cards, one primary CTA — and **no clock**.
2. Pressing the CTA reveals the app in place, with no navigation and no reload.
3. Reloading `/glu` after that goes straight to the app, with **no frame of
   the welcome**, and `glu:v2` contains `"hasEnteredApp":true`.
4. A `glu:v2` blob written before this ADR (no `hasEnteredApp` key) loads
   straight into the app; a `glu:v1` blob does too, and its sessions survive.
5. Clicking the CTA at t=0 on `/glu/welcome`, in a browser holding a populated
   blob, does not alter any other field in that blob.
6. `/glu/welcome` renders server-side (visible in `curl` output, JavaScript
   disabled), carries a canonical URL, an `og:image` resolving under
   `https://ioan.dev/glu/`, and a description distinct from `/glu`'s.
7. The CTA on `/glu/welcome` lands on the app, not back on the welcome.
8. Both surfaces restyle with all three chrome directions and both colour
   schemes; no hardcoded colour in `welcome.module.css`.
9. No horizontal scroll at 590 px; every interactive element ≥ 44 px.
10. `just web check` passes: lint, types, unit tests, build.
11. The full Playwright suite passes, including the pre-existing tests.
12. `DocsSections.tsx` names the welcome page, and the document footers link
    to it.

## Consequences

**Easier.** GLU can be linked to a stranger. There is one place that answers
"what is this", it is server-rendered, it unfurls with a card, and the app
finally has the front door every other document page implied.

**Harder.** `/glu` now has a branch in front of it, and that branch is a
persisted boolean — meaning "clear site data" is now indistinguishable from
"new user", and any future test or tool that drives `/glu` from a clean profile
has to know about the flag. The fixture change hides that cost from the suite;
it does not remove it.

**Committed to.** A fourth document-class page to keep in sync — the pitch now
joins the manual, Privacy and Terms in the set of files that go stale when a
feature changes. The welcome deliberately states almost nothing specific for
exactly that reason, and that restraint is the contract, not an accident of
first-draft copy.

## Deviations from the outline (2026-07-25)

Three, all found by running the thing rather than reading it.

1. **`migrate` was the wrong hook, and alone it would have shipped the bug this
   ADR spent a paragraph promising to avoid.** Step 1 said to resolve
   `hasEnteredApp` in `migrate`. Zustand calls `migrate` **only when the stored
   version differs from the current one** — so every existing user, holding a
   *v2* blob against a *v2* store, never reaches it. The field would have
   arrived absent, defaulted to `false`, and put a landing page in front of the
   app. The resolution moved to **`merge`**, which runs on every rehydrate that
   found a blob, with `migrate` keeping a matching line for the v1 path (its
   output passes through `merge` with the field already set, so one hook alone
   cannot cover both). Both call one helper, `enteredBefore()`.

2. **A corrupt blob was being read as a first visit** — caught by ADR 03's
   existing "a corrupt blob loads clean defaults" e2e test, which started
   failing on all four projects. `createVersionedKeyStorage.getItem` returns
   `null` when a blob will not parse, and `null` is indistinguishable from "no
   blob" at the `merge` layer. But the *key* is still there, and the key is the
   evidence. The adapter gained an optional `onCorrupt` fallback — kept as a
   parameter so `storage.ts` stays ignorant of what is inside the blob — and
   `gluStore` passes one returning clean defaults **plus** `hasEnteredApp: true`.
   Losing an archive to a mangled write is bad enough without also being handed
   a landing page for the app you use daily.

3. **The CTA is a `next/link` when it navigates, not a `router.push`.** The
   outline had one `<button>` calling `useRouter()`. That put a router
   dependency on a component that mostly does not navigate — the gate's copy
   never moves — and `useRouter()` throws outside an app-router context, which
   would have meant mocking it in the unit test and in Storybook, for a code
   path neither exercises. It renders an `<a>` via `next/link` when `navigateTo`
   is set and a `<button>` otherwise. The `localStorage` write is synchronous,
   so the flag is durable before the navigation it precedes.

Two smaller notes, neither a change of decision:

- **Two existing e2e tests now seed.** "Back to GLU returns to the app under the
  basePath", in the ADR 26 and ADR 29 blocks, navigate from a document into the
  app without going through the `open` fixture — so they met the gate. They now
  declare themselves returning visitors, which is what they always meant.
- **The sitemap needed no code change** (it iterates `PAGE_META`), only a
  priority for the new route and a corrected count in its comment.
