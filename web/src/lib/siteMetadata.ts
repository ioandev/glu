import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { OG_LOCALE, type Locale } from "@/lib/locale";
import en from "@/locales/en";

/**
 * One place for "what does GLU say about itself" — the titles, the meta
 * descriptions, the canonical URLs, and the copy printed on the Open Graph
 * cards (ADR 30).
 *
 * The two halves have to live together: a description and its social card are
 * the same claim shown to two different readers, and the failure mode of
 * splitting them is that a feature ships, one of the two gets edited, and the
 * link previews keep advertising last month's app.
 */

/**
 * GLU deploys to exactly one origin, and social crawlers need **absolute**
 * URLs — a relative `og:image` is dropped by every unfurler there is.
 *
 * This is a **source constant**, the way ADR 24's rate limits are. A
 * `NEXT_PUBLIC_*` variable would be baked into the image at build anyway
 * (ADR 16's poached footgun: env read at build, not at run), so it would buy
 * no flexibility while adding a required setting to a tier that otherwise
 * needs none — and a wrong value would surface as a bad link preview nobody
 * looks at, rather than a diff.
 */
export const SITE_ORIGIN = "https://ioan.dev";

/**
 * Mirrors `basePath` in `next.config.ts`, and has to, because **hand-written
 * metadata URLs never get the basePath**. That is the same rule that keeps an
 * `icons` key out of the root layout (ADR 01 / ADR 04): the App Router *file
 * conventions* apply the prefix, a string in a `Metadata` object does not.
 */
export const BASE_PATH = "/glu";

export const SITE_NAME = "GLU";

/**
 * `metadataBase` **includes the basePath**, and that is load-bearing.
 *
 * The `opengraph-image` file convention emits a basePath-free URL
 * (`/opengraph-image?<hash>`), and Next resolves it with
 * `posix.join(metadataBase.pathname, url)`. With a bare origin here the card
 * URL comes out as `https://ioan.dev/opengraph-image` — a 404 on the sibling
 * site, and a silent one, because nothing in the app ever fetches it.
 * Verified against the built HTML, which is the only place this is visible.
 *
 * It does not double-apply to anything hand-written: `resolveUrl` returns any
 * string that parses as an absolute URL untouched, and every URL this module
 * writes goes through `absoluteUrl()` below.
 */
export const METADATA_BASE = new URL(`${SITE_ORIGIN}${BASE_PATH}`);

/** Routes as the app knows them — basePath-free, the way `next/link` takes them. */
export type SiteRoute = "/" | "/welcome" | "/privacy" | "/terms" | "/docs";

/**
 * A route as a crawler must see it: origin + basePath + route, no trailing
 * slash (the app does not run `trailingSlash`, so a slashed canonical would
 * point at a URL that redirects).
 */
export function absoluteUrl(route: SiteRoute): string {
  return route === "/" ? `${SITE_ORIGIN}${BASE_PATH}` : `${SITE_ORIGIN}${BASE_PATH}${route}`;
}

export interface PageCopy {
  /**
   * The `<title>`, before the root layout's `"%s — GLU"` template. Absent on
   * the home route, which uses the layout's `title.default` — a page whose
   * title is "GLU — GLU" helps nobody.
   */
  title?: string;
  /**
   * `<meta name="description">` in English (ADR 44). **Read from the English
   * catalog, never written here** — the localised descriptions live in
   * `locales/*.ts`, and a second copy in this table is a second place for a
   * stale claim to hide. It did exactly that: this table said "eighteen clock
   * designs" long after ADR 42 and ADR 45 took the roster past eighty.
   *
   * Still needed as a *value* because the root layout's defaults, the manifest
   * and `siteMetadata.test.ts` are all outside a request and cannot call
   * `getTranslations`.
   */
  description: string;
  /** The card's headline. Two short lines at most — it is set at 74px. */
  heading: string;
  /** The card's supporting line, under the headline. */
  blurb: string;
  /** `og:image:alt`, for the readers who get the card as text. */
  imageAlt: string;
}

/**
 * Meta descriptions are written for the ~155 characters Google renders. The
 * card blurb is written for a 1200×630 rectangle, so it is allowed to be a
 * sentence rather than a summary; they say the same thing at different widths.
 */
export const PAGE_META: Record<SiteRoute, PageCopy> = {
  "/": {
    description: en.meta.homeDescription,
    heading: "Pomodoro and focus timer",
    blurb:
      "Eighteen clock designs, environment tracking, and a session record that never leaves your device.",
    imageAlt: "GLU — a tablet-first pomodoro and focus timer",
  },
  /**
   * ADR 31. This is the route that gets *shared* — `/glu` is where the app
   * lives, but the link you paste when someone asks what you use is this one,
   * so its card carries the pitch rather than the feature list.
   */
  "/welcome": {
    title: "A focus timer for the tablet on your desk",
    description: en.meta.welcomeDescription,
    heading: "A focus timer for your desk",
    blurb: "Pick a length, press start, work until the clock runs out. No account, no sign-up.",
    imageAlt: "GLU — a focus timer for the tablet on your desk",
  },
  "/privacy": {
    title: "Privacy Policy",
    description: en.meta.privacyDescription,
    heading: "Privacy Policy",
    blurb:
      "No accounts, no analytics, no server copy. Your history stays on the device you focused on.",
    imageAlt: "GLU — Privacy Policy",
  },
  "/terms": {
    title: "Terms of Service",
    description: en.meta.termsDescription,
    heading: "Terms of Service",
    blurb: "A free personal focus timer, provided as-is. Your Todoist account stays yours.",
    imageAlt: "GLU — Terms of Service",
  },
  "/docs": {
    title: "How GLU works",
    description: en.meta.docsDescription,
    heading: "How GLU works",
    blurb:
      "The manual: the timer and its shortcuts, the clock gallery, alerts, and the Todoist connection.",
    imageAlt: "GLU — how the app works",
  },
};

/** The home route's `<title>`, used as the layout's `title.default`. */
export const SITE_TITLE = "GLU — pomodoro and focus timer";

/**
 * The card/site facts that never vary by route.
 *
 * They are spread into **every** page's `openGraph` rather than declared once
 * in the root layout, because Next merges `Metadata` shallowly: a page that
 * exports `openGraph` *replaces* its parent's object outright. Setting
 * `siteName` and `type` upstairs and a `description` downstairs silently ships
 * a card with neither — caught in the built HTML, not by the type checker.
 */
export const OG_SITE = { type: "website", siteName: SITE_NAME, locale: "en_GB" } as const;

/**
 * `OG_SITE` for one language (ADR 44). Everything but `locale` is constant, and
 * `locale` has to move or a German page advertises itself as `en_GB`.
 */
export function ogSite(locale: Locale) {
  return { ...OG_SITE, locale: OG_LOCALE[locale] };
}

/** The `meta` catalog keys, by route — the one place the mapping is written. */
const META_KEYS = {
  "/": { title: "homeTitle", description: "homeDescription" },
  "/welcome": { title: "welcomeTitle", description: "welcomeDescription" },
  "/privacy": { title: "privacyTitle", description: "privacyDescription" },
  "/terms": { title: "termsTitle", description: "termsDescription" },
  "/docs": { title: "docsTitle", description: "docsDescription" },
} as const;

/** Same rule as `OG_SITE`: without this on the page, the card falls back to `summary`. */
export const TWITTER_CARD = "summary_large_image" as const;

/**
 * Assembles a route's `Metadata`: canonical link, Open Graph and Twitter, all
 * from the one copy entry.
 *
 * The title is the *short* one, and it lands in two different shapes on
 * purpose. `title.template` applies to the `<title>` only, so the document
 * reads "Privacy Policy — GLU" while `og:title` stays "Privacy Policy" — which
 * is what an unfurler wants, because it renders `og:site_name` beside the
 * title and would otherwise print "GLU" twice.
 *
 * No `images` key on either object: each route's `opengraph-image.tsx` fills
 * `og:image` *and* `twitter:image`, and the file convention is the only form
 * that resolves against `metadataBase` rather than being taken literally.
 */
/**
 * Assembles a route's `Metadata` in the reader's language (ADR 30, ADR 44).
 *
 * The title lands in two different shapes on purpose. `title.template` applies
 * to the `<title>` only, so the document reads "Privacy Policy — GLU" while
 * `og:title` stays "Privacy Policy" — which is what an unfurler wants, because
 * it renders `og:site_name` beside the title and would otherwise print "GLU"
 * twice.
 *
 * **A cookieless request gets English**, which is to say every crawler does.
 * That is deliberate and it is the price of having no locale in the URL: one
 * canonical per page, indexed in one language. The card's image is English for
 * the same reason and cannot be otherwise.
 *
 * No `images` key: each route's `opengraph-image.tsx` fills `og:image` *and*
 * `twitter:image`, and the file convention is the only form that resolves
 * against `metadataBase` rather than being taken literally.
 */
export async function pageMetadata(route: SiteRoute): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("meta");
  const keys = META_KEYS[route];
  const url = absoluteUrl(route);
  const description = t(keys.description);

  // The home route has no `title` of its own — the layout's `title.default` is
  // already this page's title, and one here would run through the template.
  const title = route === "/" ? {} : { title: t(keys.title) };

  return {
    ...title,
    description,
    alternates: { canonical: url },
    openGraph: { ...ogSite(locale), ...title, description, url },
    twitter: { card: TWITTER_CARD, ...title, description },
  };
}
