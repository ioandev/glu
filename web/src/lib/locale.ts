/**
 * The locale primitives: which languages exist, how a request is resolved to
 * one, and the cookie that remembers the choice (ADR 44).
 *
 * This module is deliberately **dependency-free** — no `next`, no
 * `siteMetadata`. `siteMetadata.ts` imports `OG_LOCALE` from here, and a cycle
 * between the two would be a real hazard given both are pulled into
 * `generateMetadata` on every route.
 */

/**
 * The roster, English first. `en` is the default and the fallback, and it is
 * the language every other file is authored *from*: `locales/en.ts` is the
 * canonical catalog and the five translations are typed against it.
 *
 * Written as a `const` tuple because `Locale` is derived from it — the roster
 * is stated exactly once, the way ADR 42 states the clock count exactly once.
 */
export const SUPPORTED_LOCALES = ["en", "es", "zh-Hans", "fr", "pt", "de"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * What each locale is called **in itself**. Endonyms are never translated: a
 * reader who has landed in the wrong language needs to recognise their own on
 * sight, and "Spanish" is no help to someone who only reads Spanish.
 */
export const LOCALE_ENDONYM: Record<Locale, string> = {
  en: "English",
  es: "Español",
  "zh-Hans": "简体中文",
  fr: "Français",
  pt: "Português",
  de: "Deutsch",
};

/**
 * `og:locale` wants an underscored POSIX-ish tag, not a BCP 47 one, and it
 * wants a region. `en_GB` is preserved from ADR 30 — GLU's English is British
 * ("colour scheme", "Log out"), and the card said so before this ADR existed.
 */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_GB",
  es: "es_ES",
  "zh-Hans": "zh_CN",
  fr: "fr_FR",
  pt: "pt_PT",
  de: "de_DE",
};

/**
 * The cookie the Settings row writes and the server reads.
 *
 * **`path` matters and must be explicit.** `document.cookie` defaults a cookie
 * to the *directory* of the current path, so the same setting would land in a
 * different jar depending on which page you happened to be on when you chose
 * it — and the delete, which must match the path it was written with, would
 * then silently miss.
 *
 * `/` rather than `basePath`, deliberately: the language is a property of the
 * reader, not of a subtree, and a root-path cookie is sent under `/glu` just as
 * happily. Scoping it to the prefix would tie the language setting to a value
 * that is allowed to move — and it would fail *silently* when it did, because a
 * cookie that is not sent is indistinguishable from one that was never set.
 *
 * Not `httpOnly` — the Settings row writes it from the browser. Nothing
 * security-relevant is decided by it: the worst a forged value can do is show
 * you the app in German.
 */
export const LOCALE_COOKIE = "glu-locale";
export const LOCALE_COOKIE_PATH = "/";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * What the *setting* holds, which is not the same thing as a locale.
 *
 * `"auto"` is a standing instruction — "keep asking the browser" — and it is
 * stored as itself rather than resolved once and frozen. A user who picks
 * Automatic in Madrid and opens GLU in Berlin gets German, which is what the
 * word means.
 */
export type LocalePreference = "auto" | Locale;

export const DEFAULT_LOCALE_PREFERENCE: LocalePreference = "auto";

/**
 * Same posture as `resolveSectionItemLimit` and `resolveAlertSound`: the blob
 * is hand-editable and the roster may lose an entry, so an unrecognised value
 * reads as Automatic — never as a crash, and never as a language the user
 * cannot read their way out of.
 */
export function resolveLocalePreference(value: unknown): LocalePreference {
  if (value === "auto") return "auto";
  return typeof value === "string" && isLocale(value) ? value : DEFAULT_LOCALE_PREFERENCE;
}

/**
 * Picks the best supported locale from an `Accept-Language` header.
 *
 * Hand-rolled rather than pulling in a matcher: the roster is six entries with
 * no region variants to disambiguate, so the whole problem is "sort by q, then
 * try exact, then try base language". `@formatjs/intl-localematcher` arrives as
 * a transitive dependency of `next-intl`, and importing a transitive is how you
 * get a build break from someone else's minor release.
 *
 * `zh-*` collapses to `zh-Hans` including the Traditional tags (`zh-Hant`,
 * `zh-TW`, `zh-HK`). That is a deliberate lossy choice: GLU has no Traditional
 * catalog, and Simplified is closer for a Traditional reader than English is.
 * A `zh-Hant` catalog would replace this line rather than extend it.
 */
export function negotiate(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number.parseFloat(q);
      return {
        tag: tag.trim().toLowerCase(),
        // NaN from a malformed `q=` is treated as "unacceptable", which is what
        // a header that cannot be parsed deserves.
        quality: Number.isNaN(quality) ? 0 : quality,
        index,
      };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    // Sort is not guaranteed stable across every engine for large arrays, so
    // the original position is the explicit tiebreak.
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { tag } of ranked) {
    if (tag === "*") return DEFAULT_LOCALE;

    const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === tag);
    if (exact) return exact;

    const base = tag.split("-")[0];
    if (base === "zh") return "zh-Hans";

    const byBase = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().split("-")[0] === base);
    if (byBase) return byBase;
  }

  return DEFAULT_LOCALE;
}

/**
 * The whole resolution order, in one place: an explicit choice beats the
 * browser's preference, and the browser's preference beats English.
 *
 * **A cookie only exists once the user has picked a language.** "Auto" in
 * Settings *deletes* the cookie rather than writing a resolved value, so a
 * traveller's `Accept-Language` is renegotiated on every request instead of
 * being frozen at whatever it said the day they first visited. It also keeps
 * server components out of the business of *writing* cookies, which a React
 * Server Component cannot do.
 */
export function resolveLocale(
  cookieValue: string | undefined | null,
  acceptLanguage: string | null | undefined,
): Locale {
  return isLocale(cookieValue) ? cookieValue : negotiate(acceptLanguage);
}
