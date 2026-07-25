# ADR 30: Social preview and page metadata — Open Graph cards for all four routes

- Status: Implemented (deviations noted)
- Date: 2026-07-25

- Deviation (2026-07-25, implementation): **`metadataBase` carries the
  basePath after all** — the decision below originally said the bare origin,
  reasoning from Next's `resolveUrl` that the file-convention image URL already
  includes it. It does not: the convention emits `/opengraph-image?<hash>`
  basePath-free, and with a bare `metadataBase` every card resolved to
  `https://ioan.dev/opengraph-image` — a 404 on the sibling site. Caught only
  by reading the built HTML, which is why that reading is now an e2e test.
- Deviation (2026-07-25, implementation): **`openGraph` and `twitter` are
  restated in full on every route.** Next merges `Metadata` *shallowly*: a page
  that exports `openGraph` replaces its parent's object outright, so declaring
  `siteName`/`type`/`locale` once in the root layout silently dropped all three
  from all four pages, and `twitter:card` fell back to `summary` — the value
  that crops a 1200×630 card to a square. `OG_SITE` and `TWITTER_CARD` are
  shared constants for exactly this reason.
- Deviation (2026-07-25, implementation): `title.template` applies to the
  `<title>` **only**, not to an explicit `openGraph.title`. Left as found
  rather than worked around: an unfurler renders `og:site_name` beside the
  title, so "Privacy Policy" under a "GLU" label reads better than
  "Privacy Policy — GLU" under one.
- Deviation (2026-07-25, implementation): the e2e block lives in its own
  `e2e/metadata.spec.ts` rather than as a block in `features.spec.ts`. It is
  cross-cutting rather than per-feature — one loop over the copy table — and it
  drives `request` rather than `page`, since the head is server-rendered and has
  nothing to do with the viewport.
- Deviation (2026-07-25, implementation): the card's copy column is capped at
  620px, not "as wide as it fits". The first render put the accent arc's near
  end through the headline.
- Note (2026-07-25): ADR 31 landed `/glu/welcome` in the same session and
  reuses this substrate unchanged — a `PAGE_META` entry plus a four-line
  `opengraph-image.tsx`. That is the intended shape for every future route.

## Context

Owner brief (2026-07-25): every GLU page gets an Open Graph image, social text
and a description — "and anything else missing".

GLU has four routes and, until now, roughly one page's worth of metadata
between them:

- **`/glu`** carries the root layout's `title: "GLU"` and
  `description: "Tablet-first pomodoro and focus tracker."` — a two-character
  title that says nothing in a search result, and a description that predates
  the clock gallery, the session archive and the Todoist integration.
- **`/glu/privacy`, `/glu/terms`, `/glu/docs`** each set a title and a
  description (ADRs 26 and 29 both remembered) and nothing else.
- **No route has an `og:` or `twitter:` tag at all.** Paste any GLU URL into
  Slack, iMessage, Signal, Mastodon or a Todoist comment and you get a bare
  link with no title card, no image, and — because the unfurler falls back to
  scraping — whatever the first text node happens to be.
- **`metadataBase` is unset.** Next answers that with a build-time warning and
  resolves social URLs against `http://localhost:3000`, which is exactly the
  failure this ADR exists to prevent.

Three standing facts shape the implementation, and each of them is a trap that
has already been paid for once in this repo:

- **`basePath: '/glu'` is not applied to hand-written metadata URLs.** ADR 01
  and ADR 04 learned this with `metadata.icons` and left a warning comment in
  `layout.tsx` that is still there. Metadata *file conventions*
  (`app/icon.png`, `app/opengraph-image.tsx`) do get the prefix; a string in a
  `Metadata` object does not.
- **The CSP is nonce-based and pages are dynamic** (ADR 16 amendment). An OG
  image must not become another per-request render on a 512 MB container.
- **Theming is chrome × clock palette × scheme** (ADR 15), and "any styling
  that doesn't change when the chrome switches is a review defect". A social
  card is a *static* asset, so it cannot switch — which makes "what colour is
  GLU, exactly?" a question this ADR has to answer rather than dodge.

## Decision

### One card generator, four routes, rendered at build

Each of the four routes gets its own `opengraph-image.tsx`, and all four call a
single renderer in `web/src/og/socialCard.tsx` that returns a `next/og`
`ImageResponse`. Next prerenders metadata image routes at build time, so the
runtime cost is a static PNG on disk and the per-request render the CSP
amendment already forced on the *pages* does not spread to the *images*.

Per-route cards rather than one shared image, because the four pages are four
different documents: a link to the Terms of Service that previews as "GLU —
pomodoro and focus timer" is a worse card than no card.

### The card is the chrome identity, not the app screenshot

The card uses `resolveScheme(studioQuiet, NEUTRAL_CLOCK_THEME.dark, "dark")` —
the same ADR 15 mix function the app runs, called at build with the default
chrome direction and the neutral palette, in dark. Every colour on the card
therefore comes out of the token pipeline; none is typed as a literal.

The neutral palette rather than the default clock's (`halo`) is deliberate.
The clock palette is the user's choice out of eighteen (ADR 07/08) and it
repaints the whole site; a card in Halo's peach would be advertising one
option as though it were the product. The chrome direction is what stays put
when the gallery moves, so the chrome direction is what the card shows.

The mark is `img/favicon.svg`'s geometry, re-inked to the resolved accent
rather than the file's hardcoded `#141D2A`, plus one decorative progress ring
— the Halo motif, which is the shape the whole app is organised around.

### Copy lives in one table, and the card cannot drift from the description

`web/src/lib/siteMetadata.ts` exports a `PAGE_META` record keyed by route.
Each entry carries the `<title>`, the meta description, and the card's heading
and blurb. `page.tsx` and `opengraph-image.tsx` both read from it, so a
description and its social card are edited together or not at all — the same
reason ADR 29 keeps `DOCS_UPDATED` next to the copy it dates.

### `metadataBase` carries the basePath, and it is a source constant

`metadataBase: new URL("https://ioan.dev/glu")`. Next resolves relative
metadata URLs with `posix.join(metadataBase.pathname, url)`, and the
file-convention image URLs are emitted **basePath-free**
(`/opengraph-image?<hash>`) — so the prefix has to come from here or every
social card points at the sibling site's root. See the first deviation above:
this ADR originally decided the opposite, from reading Next's resolver rather
than its output.

Nothing hand-written is at risk of a doubled prefix: `resolveUrl` returns any
string that already parses as an absolute URL untouched, and every URL this ADR
writes is built absolute by `absoluteUrl()`.

The origin is a **source constant**, the way ADR 24's rate limits are. GLU
deploys to exactly one place; a `NEXT_PUBLIC_*` variable would be baked into
the image at build anyway (ADR 16's poached footgun) and would add a required
environment variable to a tier that currently needs none.

### Title template, so three routes stop repeating themselves

The root layout gains `title: { default: …, template: "%s — GLU" }`. The three
sub-routes drop the `" — GLU"` they each hand-appended. The template governs
the `<title>` only — `og:title` keeps the short string, which is the wanted
shape next to an `og:site_name` of "GLU" (third deviation above).

The home `<title>` changes from `"GLU"` to `"GLU — pomodoro and focus timer"`.
Two characters is a fine tab label and a useless search result.

### `twitter:card`, but no second image file

`twitter: { card: "summary_large_image" }` on every route — restated per route,
because Next replaces rather than merges these objects, and the default it
falls back to (`summary`) crops the card to a square thumbnail.

Deliberately **no** `twitter-image.tsx`: Next fills `twitter:image` from the
`opengraph-image` convention, so a second set of files would double the build
renders to produce byte-identical PNGs.

### A sitemap, but no `robots.txt`

`app/sitemap.ts` lists the four routes at `/glu/sitemap.xml`. It is valid,
submittable, and costs fifteen lines.

`app/robots.ts` is **rejected**: the App Router convention would emit it at
`/glu/robots.txt`, and `robots.txt` is only ever read at an origin root. GLU
does not own `ioan.dev/robots.txt` — the sibling personal site does. Writing
one under the basePath would be a file that looks like a policy and is read by
nobody. If crawl directives are ever wanted, they belong in the sibling site's
root file, pointing at this sitemap.

## Options considered

- **A committed static PNG per route, generated by a script** like ADR 04's
  icons (`just web icons`) — genuinely tempting, and the icon generator's own
  comment argues for it ("a dependency tax on every build for assets that
  change roughly never"). Rejected on the second half of that sentence: icons
  change roughly never, social copy changes whenever a feature ships, and the
  authoring format would be `React.createElement` in a `.mjs` script because
  the repo has no TS runner for scripts. Four build-time renders is the
  cheaper trade.
- **One shared card for all four routes** — a third of the work and a worse
  result; see above.
- **A screenshot of the running app as the card** — it is a screenshot of
  *one* of eighteen clocks in one of three chromes, and it is a lie the first
  time the UI moves. ADR 29 rejected screenshots in the manual for the same
  reason.
- **Bundling Space Grotesk / Archivo Black for the card** — `next/font` stores
  its downloads as WOFF2 and satori cannot parse WOFF2, so this means
  committing TTFs plus their OFL notices (ADR 23) to set type on four images.
  Rejected; the card is designed around `next/og`'s bundled font instead.
- **`metadataBase` from `PUBLIC_ORIGIN`** — the backend already parses that
  variable (ADR 11 amendment), but the web tier does not read it, and adding a
  build-arg to `web/`'s Dockerfile to carry it would make a wrong social URL a
  *silent* deploy failure instead of a source-level one.
- **`app/robots.ts`** — rejected above.
- **Structured data (JSON-LD `SoftwareApplication`)** — a real option for a
  search result, and a nonce-bearing inline `<script type="application/ld+json">`
  under the ADR 16 CSP. Out of scope; named as a future amendment.

## Scope

### In scope

- `web/src/lib/siteMetadata.ts` — origin/basePath constants, `absoluteUrl()`,
  the `PAGE_META` copy table, and `pageMetadata()` which assembles the
  `Metadata` object (canonical + Open Graph + Twitter) for a route.
- `web/src/og/socialCard.tsx` — the shared card renderer, `OG_SIZE`,
  `OG_CONTENT_TYPE`.
- Four `opengraph-image.tsx` route files: `/`, `/privacy`, `/terms`, `/docs`.
- `web/src/app/layout.tsx` — `metadataBase`, the title template, the shared
  Open Graph / Twitter defaults, `applicationName`, `authors`, `creator`.
- `web/src/app/page.tsx` — its first `metadata` export.
- `privacy/page.tsx`, `terms/page.tsx`, `docs/page.tsx` — through
  `pageMetadata()`, keeping their existing descriptions.
- `web/src/app/manifest.ts` — the description brought in line with the rest.
- `web/src/app/sitemap.ts`.
- A unit test for `siteMetadata` (basePath prefixing, absolute URLs, one entry
  per route) and an ADR 09 e2e block asserting the tags on all four routes.
- Amendments: CLAUDE.md's ADR index and build order, UI.md.

### Out of scope

- **JSON-LD / structured data** — named future amendment.
- **`robots.txt`** — belongs to the origin root, which GLU does not own.
- **Per-clock or per-chrome card variants** — the card shows the chrome
  identity by decision, above.
- **`twitter-image` / `apple-touch-startup-image`** — the first is redundant,
  the second is an ADR 04 concern.
- **i18n / `alternates.languages`** — English, like the rest of the app.
- **Analytics, verification tokens, `google-site-verification`** — ADR 26's
  privacy claims say GLU runs no analytics; a verification meta tag is not
  analytics but it is a change to what the page tells third parties, and it
  needs its own decision.
- **Any behaviour change.** No component renders differently.

## Implementation outline

1. **`siteMetadata.ts`** — `SITE_ORIGIN`, `BASE_PATH`, `absoluteUrl()`,
   `PAGE_META`, `pageMetadata()`. **Gotcha:** `metadataBase` must be the bare
   origin; see the decision above for the `posix.join` reason.
2. **`socialCard.tsx`** — `resolveScheme(studioQuiet, NEUTRAL_CLOCK_THEME.dark,
   "dark")`, then a flex column. **Gotcha:** satori needs an explicit `display`
   on every element with more than one child, and no `fontFamily` may be named
   that is not loaded.
3. **Four `opengraph-image.tsx` files** — `alt`, `size`, `contentType` declared
   inline in each (not re-exported), and a default export calling the renderer.
4. **Layout + four pages** — template, defaults, `pageMetadata()`.
5. **`sitemap.ts`**, **`manifest.ts`** description.
6. **Tests** — unit for the helper; e2e asserting `og:image`, `og:title`,
   `og:url`, `twitter:card` and the canonical link resolve under `/glu` on all
   four routes, and that each `og:image` URL actually returns a PNG.
7. **Docs** — CLAUDE.md index + build order, UI.md.

Honest sizing: **two to three hours.** The metadata plumbing is under an hour;
the card design and the four-route verification are the rest.

## Acceptance criteria

- [x] Every route emits `og:title`, `og:description`, `og:url`, `og:site_name`,
      `og:type`, `og:locale`, `og:image` (with width, height, type and alt) and
      `twitter:card`, and each carries a `<link rel="canonical">`.
- [x] Every absolute URL in those tags starts `https://ioan.dev/glu` — no
      `localhost`, no missing basePath, no doubled `/glu/glu`. Asserted per
      route in `e2e/metadata.spec.ts`, including against a suite running on
      localhost, where a canonical that is *not* absolute would pass unnoticed.
- [x] Each route's `og:image` URL returns HTTP 200 with `content-type:
      image/png`, and the PNG's own IHDR says 1200×630. The cards all differ.
- [x] `next build` emits no `metadataBase` warning, and all five image routes
      report `○ (Static)` — prerendered, not rendered per request.
- [x] Titles: home is `GLU — pomodoro and focus timer`; the others are the
      unchanged strings, now produced by the template.
- [x] No colour literal appears in `socialCard.tsx`; every value comes from
      `resolveScheme(studioQuiet, NEUTRAL_CLOCK_THEME.dark, "dark")`.
- [x] `/glu/sitemap.xml` returns every route, absolute and prefixed.
- [x] `npm test` (452 unit/story + 150 dark-scheme story) and `npm run lint`
      green; a clean `npm run build` green; `e2e/metadata.spec.ts` 68/68 across
      all four projects.
- [x] CLAUDE.md (index, build order, a new hard-constraint bullet) and UI.md
      (a "social card" section) amended in the same session.

## Consequences

- A GLU link pasted anywhere unfurls as a card that names the page and shows
  the mark. That is the whole visible payoff, and it applies to the three
  documents ADRs 26 and 29 shipped precisely so they could be sent to people.
- **Three of this ADR's four defects were invisible to every other check.**
  The build was green, the types were green, the app rendered identically, and
  the cards pointed at the wrong origin with no `og:site_name` and a `summary`
  card. Nothing but reading the built HTML found them. That is the argument for
  `e2e/metadata.spec.ts` existing at all, and the reason it asserts tag *values*
  rather than tag presence.
- **The copy table becomes a constraint.** A feature that changes what GLU *is*
  now has a description and a card blurb to update, in one file. That is
  cheaper than the alternative, which is four descriptions drifting apart.
- The build renders four PNGs. `next/og`'s wasm is traced into the runtime
  image even though nothing executes it there — a few MB against a tier that
  already ships Next's server.
- The origin is now written in the source. Moving GLU off `ioan.dev` is a
  one-line edit *and* a required one: nothing at runtime will notice a wrong
  social URL, which is exactly why it is source rather than configuration.

## Amendment (2026-07-25, ADR 31)

A **fifth route**, `/glu/welcome`, joins `SiteRoute` and `PAGE_META` with its own
copy entry and its own `opengraph-image.tsx`. It is the route most likely to be
*shared* — `/glu` is where the app lives, but the welcome is the link a stranger
is given — so its card carries the pitch rather than the feature list, and the
sitemap gives it 0.8 against the app's 1 and the documents' 0.5.

This is also what settles a question this ADR left implicit: the app route's
description advertises features to someone who has not yet been told what GLU
is. It still does, and that is now correct, because there is a page whose whole
job is telling them — and `SiteRoute` being a union type is what made adding it
a compiler error until every table had an entry.
