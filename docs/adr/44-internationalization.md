# ADR 44: Six languages — internationalization without locale URLs

- Status: Implemented (deviations noted)
- Date: 2026-07-26

## Context

Brief (2026-07-26, owner): *"I need translations in the most common 5
languages!"*

GLU has been English-only since ADR 01, and English is baked in at every layer:
`<html lang="en">` in the root layout, `og:locale: "en_GB"` in `OG_SITE`, the
manual, the Privacy Policy and the Terms as English JSX, and — the one that
reaches other people — the time comment GLU writes into a Todoist task.

An inventory before deciding anything found **≈480 user-facing strings**, and
the interesting fact is their distribution:

| Where | Strings | Kind |
| --- | --- | --- |
| `components/docs/DocsSections.tsx` | ~150 | long-form JSX prose |
| `components/legal/PrivacyContent.tsx` | ~70 | long-form JSX prose |
| `components/legal/TermsContent.tsx` | ~50 | long-form JSX prose |
| clocks (`ClockFrame` + ~15 designs + `Words`) | ~55 | short labels |
| settings (3 files + `alertSounds`) | ~40 | labels, descriptions |
| Todoist components and hooks | ~35 | labels, errors, aria |
| metadata (`siteMetadata.ts`) | ~25 | titles, descriptions, card copy |
| chrome / drawer | ~17 | labels, aria |
| timer | ~12 | labels, aria, tooltips |
| welcome | ~12 | short prose |
| environment, notifications, misc | ~15 | labels |

**~280 of those are full sentences of prose and ~200 are interface strings.**
Those two populations want opposite things from a translation system, and that
is the whole design problem this ADR answers.

Three existing decisions constrain the answer before it is written:

- **The docs and legal pages are deliberately hook-free and Mantine-free**
  (`DocsSections.tsx:18`) so their text ships as server-rendered HTML. Routing
  280 sentences through a React hook would undo that on the three routes where
  it was bought on purpose.
- **`proxy.ts` mints the CSP nonce** (ADR 16 amendment) and is the one file that
  must see every request. It is also the natural home for locale *routing* —
  which is exactly why locale routing is dangerous here: a redirect emitted
  before the CSP block ships a nonce-less page, and every navigation would be
  metered twice by ADR 24's limiter.
- **The store sets `skipHydration: true`** (ADR 02 / ADR 05), so nothing in the
  `glu:vN` blob is readable at first paint. The colour scheme (ADR 01) and the
  chrome (ADR 15) each solve this with a nonce'd pre-paint inline script. A
  third one for language would work, and would also mean the server rendered
  the wrong language and the client corrected it — a visible flash on every
  page of prose.

The nonce turns out to be the lever. Because it already forces **every page to
render dynamically**, reading a cookie on the server costs nothing that has not
already been spent — there is no static prerender to lose, no `s-maxage` to
fragment. Server-side locale resolution is, uniquely in this app, free.

## Decision

**Six locales — `en` (default), `es`, `zh-Hans`, `fr`, `pt`, `de`.** All
left-to-right; no RTL work, and none is implied.

**A cookie decides the language. There is no locale in the URL.**

**Two mechanisms, split along the line the inventory found:** `next-intl`
(without its routing) for the ~200 interface strings, per-locale server
content modules for the ~280 sentences of prose.

### Why the cookie, and not `/glu/es/docs`

Locale URLs buy exactly one thing GLU cannot otherwise have: crawlable,
shareable, `hreflang`-able translated pages. They cost a `[locale]` segment
under `app/` (which moves `manifest.ts`, `sitemap.ts` and the icon conventions
off the paths their basePath behaviour depends on — see the comments in
`siteMetadata.ts` and `layout.tsx`), a negotiation redirect inside `proxy.ts`
that must be taught about the nonce and the rate limiter, and a rewrite of every
URL in the e2e suite.

GLU is a personal focus timer with no account, reached from a bookmark or the
home screen far more often than from a search result. The SEO is worth less than
the machinery, so: **one canonical URL per page, English for crawlers, the
reader's language for the reader.**

### Resolution order

`glu-locale` cookie → `Accept-Language` negotiation → `en`.

**A cookie exists only once the user has explicitly picked a language.**
"Automatic" in Settings *deletes* it rather than writing a resolved value. Two
reasons: a traveller's browser preference is renegotiated on every request
instead of being frozen at whatever it said on their first visit, and no server
component ever needs to *write* a cookie — which a React Server Component
cannot do.

`resolveLocale` and `negotiate` live in `web/src/lib/locale.ts`, which is
deliberately dependency-free (`siteMetadata.ts` imports `OG_LOCALE` from it, and
a cycle between those two would be felt in `generateMetadata` on every route).
`zh-*` collapses to `zh-Hans` **including the Traditional tags** — a lossy
choice made knowingly, because Simplified is closer for a `zh-TW` reader than
English is. A Traditional catalog would replace that line, not extend it.

### Why prose is not in the message catalog

`t.rich()` can carry inline `<b>` and `<i>`, so this was a real option. It was
rejected because 280 sentences of ICU rich text is 280 sentences nobody can
proofread, and because the moment prose lives in the catalog the obvious way to
render it is `useTranslations` — which would turn three server-rendered routes
into client ones and quietly delete the property `DocsSections.tsx:18` exists to
protect.

So the manual, the Privacy Policy and the Terms become **per-locale modules of
plain JSX** implementing a shared section type. A missing section is a type
error. They are imported by the server route directly, and by the drawer's Docs
modal through a per-locale lazy import map so the client chunk carries one
language rather than six.

### What deliberately stays English

- **Open Graph images.** Crawlers send no cookies, so there is no locale to
  render them in. `next/og`'s bundled face is Latin-only besides.
- **`manifest.webmanifest`.** Manifest requests are made with credentials mode
  `omit`; the cookie is not sent, and Next's file convention exposes no way to
  add `crossorigin="use-credentials"` to the link.
- **Metadata served to cookieless clients**, which is to say metadata served to
  crawlers: English, `og:locale: en_GB`, unchanged from ADR 30.
- **The ~40 clock design names** (`registry.ts`) — proper nouns, like "Nixie".
- **Hotkey letters.** The keys stay Latin in every locale; only the sentence
  around them translates (`"Stop — {key}"`).
- **The `[Nm]` prefix** on time comments and the regex that parses it back
  (`todoistRoutes.ts`). It is locale-independent, which is what lets an English
  comment written last week still be recognised by a German UI today.

### The time comment, and a locale on the wire

The one string GLU writes into someone else's system. ADR 14 makes the **server**
its only writer and the browser sends enumerated keys, never text — that stays
true. The comment POST gains a `locale` field, allowlist-validated server-side,
defaulting to `en`.

The fragment catalog is therefore **duplicated** into
`backend/commentLocales.ts`. That is deliberate and it is ADR 22's rule, not an
oversight: `web/` and `backend/` are separate packages with separate lockfiles
and separate build contexts, and there is no shared module to put it in. Drift is
caught the way ADR 24's duplicated rate limits are — by literals pinned in both
packages' tests.

### Store, and the Settings row

`locale: "auto" | Locale` joins the `glu:vN` blob by the **additive-blob
pattern** (ADR 19, `gluStore.ts:722`): added to `GluPersistedState`,
`partialize` and `initialPersistedState()`, **with no version bump**, because a
field absent from an older blob picks up its default in both `migrate`'s tail
and `merge`.

It is a **mirror, not a source**. Nothing renders from it — it cannot, at first
paint — it exists so the Settings row can show which option is selected. Writing
the row sets the store field, writes or deletes the cookie, and calls
`router.refresh()` so the server re-renders `<html lang>`, the prose and the
metadata together.

Settings gains a **Language section**, and it is the first row in the app that
is not a `SegmentedControl`: seven options (Automatic plus five endonyms plus
English) do not fit one on a half-tablet. It is a `Select`. **Endonyms are never
translated** — a reader stranded in the wrong language needs to find their own
on sight, and "Spanish" is no help to someone who only reads Spanish.

## Options considered

**next-intl with its routing integration** — the documented happy path, and
wrong here. It wants a `[locale]` segment and a middleware, and GLU already has
a middleware whose job (the nonce) cannot be delegated. Rejected with locale
URLs, above.

**A hand-rolled provider over `Intl`.** Tempting: the app needs plurals, lists
and a message lookup, all of which `Intl` provides. Rejected because ICU
MessageFormat is the part that is genuinely hard, "1 minute / 2 minutes" is a
two-case rule that most of the roster disagrees with, and writing a second
message formatter is exactly the kind of shared machinery this repo avoids.
Retained as the escape hatch if the plugin ever fights `basePath`.

**Machine translation at request time.** Rejected outright: a paid dependency on
the render path, for text that changes a handful of times a month.

**Leaving Privacy and Terms in English.** The common practice, and the owner
chose against it. They are translated, and every non-English copy carries a
notice that it is a convenience translation and the English text controls.

## Scope

### In scope

- Six locales; catalog, loader, request configuration, `<html lang>`.
- A Language row in Settings and a `locale` field in the persisted blob.
- Every interface string, aria-label, tooltip and notification.
- The manual, the welcome, the Privacy Policy and the Terms, in six languages.
- Per-locale `<title>`, meta description and `og:locale` for cookie-bearing
  requests.
- Localized Todoist time comments, and a locale field on the comment route.
- Localized failure text in place of the raw upstream string, which also stops
  `apiFetch`'s internal `GET /path failed` reaching the UI. **One message, not a
  code-keyed map**: `apiFetch` discards the response body, so the backend's
  snake_case `error` never reaches the client to key off. Making that map real
  means teaching `lib/api.ts` to keep the body — a separate change, and the same
  one that would restore a filter author's upstream diagnosis.
- Per-locale number spelling for the `Words` clock design.

### Out of scope

- **Traditional Chinese, and any seventh language.** Adding one is a catalog
  module plus a content module per prose document; the machinery does not change.
- **RTL.** No locale in this roster needs it. Arabic or Hebrew would be a new
  ADR — it is a layout problem, not a translation one.
- **Locale URLs, `hreflang`, per-locale sitemap entries.** Named above as the
  reopening condition: if translated pages ever need to be findable, that is the
  ADR that adds the `[locale]` segment.
- **Localized Open Graph images and manifest.** Unreachable, per above.
- **CJK webfonts.** `zh-Hans` renders in the system CJK fallback; Space Grotesk
  and Archivo Black have no CJK coverage and subsetting them would be a
  several-hundred-kilobyte decision taken on its own merits.
- **Localized clock design names.**
- **A translation-management pipeline.** Six TypeScript modules reviewed in the
  diff, not a service.

## Implementation outline

Six phases, each of which leaves English behaviour unchanged and the suite green.

1. **Scaffolding.** `next-intl` in `web/` only; `lib/locale.ts`,
   `i18n/request.ts`, `locales/{en,es,zh-Hans,fr,pt,de}.ts` + loader,
   `createNextIntlPlugin` in `next.config.ts`, provider and `<html lang>` in
   `layout.tsx`, `global.d.ts` type augmentation.
2. **Interface strings.** Store field, Language section, ~200 strings extracted
   and translated, ICU replacing every concatenated plural, clock labels and
   `Words` spelling tables, notification text, error-code map.
3. **Prose.** `DocsSections` dissolves into `docs/content/{types,en,…}.tsx`;
   Privacy and Terms likewise, with the convenience-translation notice; welcome
   into the catalog.
4. **Metadata.** `pageMetadata(route, locale)`; every route converts to
   `generateMetadata` and restates `OG_SITE` with its own `og:locale` (ADR 30's
   replace-don't-merge rule).
5. **The time comment.** `backend/commentLocales.ts`, `locale` on the route,
   pinned literals in both packages' tests.
6. **Tests and contracts.** `e2e/i18n.spec.ts`; the manual documents the
   Language row in all six languages; `CLAUDE.md` and `UI.md` updated.

### What has actually landed (2026-07-26)

**Done — every phase:**

- The whole substrate: `lib/locale.ts`, `i18n/request.ts`, `locales/*` for all
  six languages, the plugin, the provider, `<html lang>`, `global.d.ts`.
  Verified against the **standalone production build**, not just `next dev`:
  next-intl bundles into the server chunks, so ADR 16's image needs nothing
  added.
- The Language row, the `locale` blob field, and the cookie write/reconcile.
- Translated interface surfaces: **chrome/drawer, timer, app shell,
  environment, Todoist, notifications, error text**, and every Settings row.
- **The prose, in all six languages.** `DocsSections.tsx` dissolved into
  `components/docs/content/{types,index,en,es,fr,de,pt,zh-Hans}.tsx`; Privacy
  and Terms into `components/legal/content/{privacy,terms}/<locale>.tsx`. Every
  non-English legal document renders the convenience-translation notice above
  the prose. `/glu/docs`, `/glu/privacy` and `/glu/terms` still serve their text
  as **server-rendered HTML** in every language — asserted against the response
  body in `e2e/i18n.spec.ts`, because a regression to a client hook would look
  identical in a browser.
- **The welcome is the one piece of prose that lives in the catalog**, and
  deliberately: it is short, and the first-visit gate renders it on the client,
  so a lazily-loaded content module would put a loading flash in front of the
  very first thing a new visitor sees. `<b>` arrives through `t.rich`.
- **Page metadata.** `pageMetadata` is `async` and locale-aware; all five
  routes export `generateMetadata` and each restates `ogSite(locale)`, so
  `<title>`, the meta description and `og:locale` follow the reader. The brand
  half of `"%s — GLU"` never translates. A **cookieless request still gets
  English and `en_GB`** — that is the price of having no locale in the URL, and
  it is asserted so it cannot drift.
- `PAGE_META`'s descriptions now **derive from the English catalog** rather than
  being a second copy. They were already drifting: the table said "eighteen
  clock designs" long after the roster passed eighty.
- **The Todoist time comment**, the one string GLU writes into someone else's
  system. `backend/commentLocales.ts` holds the vocabulary; the browser sends a
  `locale` **code** on the comment POST and never the sentence, so ADR 14's
  "server is the only writer" is untouched. The locale is read at *send* time,
  not at run-end time — a comment can sit in the outbox across a language change.
  An unrecognised code is English rather than a 400, for the same reason an
  unknown environment key is ignored: a vocabulary mismatch must not strand a
  queued comment in the outbox's permanent-failure path and lose tracked time.
  The Settings preview composes from the web's mirror of the same vocabulary, and
  **the two copies are pinned by identical literals in both packages' suites** —
  change a word in one and the other fails.
- `e2e/i18n.spec.ts` (16 tests × 4 projects), the suite pinned to English in
  `e2e/fixtures.ts`, the Storybook provider, and `src/test/intl.tsx` for jsdom
  tests.

- **The clock designs**, all 86 of them. `ClockFrame` exports `useStateLabel`
  and designs pass a **key**, not a sentence — `stateLabel(state, "orbit")` —
  which is what kept thirty-nine call sites from each having to reach for
  `useTranslations`. Naming the hook's result `stateLabel` meant the ~85 plain
  call sites did not have to change at all.
  - The six `.toUpperCase()` calls are `toLocaleUpperCase(locale)` now. They
    were a live bug for Turkish, which the roster does not have yet — but the
    fix is free and the trap is invisible until it is not.
  - `Terminal` used to print the raw `TimerStatus` union ("running", "idle")
    into the UI. It goes through the shared label now, so it is both translated
    and finally says the same word every other face says.
  - `Words` — the design whose whole idea is that it *says* the time — gets
    `designs/wordsNumbers.ts`: 0–99 spelled out in six languages. This is the
    one piece that could not be a catalog entry, because the *rules* are what
    differ. German compounds and inverts ("dreiundzwanzig" — three-and-twenty),
    French runs out of tens at sixty and counts in twenties above it
    ("soixante-douze" is 72), Chinese composes positionally with no irregular
    forms. So each locale brings a builder, not a table of a hundred strings.
    A test spells every minute 0–99 in every language and fails on a leaked
    digit.
  - The 86 `registry.ts` design names stay English. Nothing renders them today
    — they are latent copy, and they become real the moment a clock *picker*
    lands (ADR 08's reopening condition, which ADR 45's roster makes loud).

**Outstanding: nothing.**

### The cookie's path

`LOCALE_COOKIE_PATH` is **`/`**, not `basePath`. The language is a property of
the reader rather than of a subtree, and a root-path cookie is sent under `/glu`
just as happily.

This is not hypothetical tidiness. The basePath was experimentally removed and
restored while this ADR was being implemented, and a cookie scoped to `/glu`
would have stopped being sent the moment it moved — **silently**, because a
cookie that is not sent is indistinguishable from one that was never set. The
language would simply have reverted to `Accept-Language` with nothing in the
logs to say why.

### A stale number the translation caught

The welcome said "**eighteen** clock designs" — ADR 07's original roster, left
behind by ADR 42 and ADR 45, which took it to eighty-six. Rewriting the pitch as
a message made it interpolate `CLOCK_COUNT` instead, which is the rule ADR 42
set and the reason CLAUDE.md forbids writing the number down. The manual was
already correct.

### One behaviour reversed, and it needs a look

`TaskList` and `TaskDetail` no longer render the upstream error string; they
render a localised message keyed off the failure instead. That **reverses ADR
12's intent** — a filter is user-authored code, so its author was meant to see
Todoist's own diagnosis rather than "went wrong".

It was reversed knowingly, because the intent was already not being met:
`apiFetch` (`lib/api.ts:52`) discards the response body and throws
`` `${method} ${path} failed` ``, so what actually reached the user was
`GET /todoist/tasks?type=project&id=… failed` — an internal route, not
Todoist's words. A localised sentence is both translatable and more honest than
that. **Recovering the real upstream diagnosis is a separate, worthwhile
change**: parse the backend's `{ error, message }` body in `apiFetch`, keep the
`message` for filter errors specifically, and leave every other surface on the
localised text.

## Acceptance criteria

1. `just web build`, `just web test`, `just web e2e`, `just backend test` and
   `just lint` all pass.
2. `<html lang>` is `en` with no cookie and no header; follows `Accept-Language`
   with no cookie; follows the cookie when one is set; a bogus cookie value
   falls back to the header rather than erroring.
3. `zh-TW` in `Accept-Language` resolves to `zh-Hans`.
4. Choosing a language in Settings changes the whole app — interface, manual,
   welcome, Privacy, Terms, `<title>` — without a reload, and survives one.
5. Choosing "Automatic" deletes the cookie and returns the app to the browser's
   preference.
6. `/glu/docs` still serves its text as HTML in every locale, and gains no
   client chunk it did not have.
7. The CSP header is still nonce-based and both inline scripts still carry the
   nonce; `proxy.ts` is unmodified by this ADR.
8. A time comment written with the UI in Spanish arrives in Todoist in Spanish,
   and the undo path still recognises it.
9. A cookieless request still gets English metadata and `og:locale: en_GB`; a
   cookie-bearing one gets its own.
10. No `PAGE_META` route, and no message key, exists in `en` without existing in
    all five translations — enforced by `satisfies Messages` and by the content
    module type, not by review.

## Consequences

The app is readable by a great deal more of the world, and the manual now has to
be maintained six times. That last part is the real cost, and it is a **contract
change**: ADR 29 said the manual is a contract because a stale manual ships a
lie; from here, an English docs edit landed without its five translations ships
five lies. `CLAUDE.md` says so.

The catalog crosses to the client on every route — roughly the size of the prose
it replaced on one route, and smaller than the Mantine bundle already there.

`og:locale` becoming per-locale means every page's `generateMetadata` has one
more thing to restate, and ADR 30's warning applies unchanged: a page that
forgets ships `en_GB` silently, and `e2e/metadata.spec.ts` is the only thing
that can see it.

The `Words` clock is the only design that could not be translated mechanically;
it now carries six spelling tables, and a seventh language means a seventh table
or a digit fallback for that locale.
