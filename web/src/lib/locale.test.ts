import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_ENDONYM,
  OG_LOCALE,
  SUPPORTED_LOCALES,
  isLocale,
  negotiate,
  resolveLocale,
} from "./locale";

/**
 * ADR 44. Negotiation is the half that fails *quietly* — a header parsed wrong
 * does not throw, it just shows a French reader the English app, which nobody
 * files a bug about. So the q-value ordering and the fallbacks are pinned here
 * rather than left to the one e2e assertion.
 */

describe("negotiate", () => {
  it("falls back to English for a missing or empty header", () => {
    expect(negotiate(null)).toBe("en");
    expect(negotiate(undefined)).toBe("en");
    expect(negotiate("")).toBe("en");
  });

  it("matches an exact tag", () => {
    expect(negotiate("de")).toBe("de");
    expect(negotiate("zh-Hans")).toBe("zh-Hans");
  });

  it("is case-insensitive", () => {
    expect(negotiate("DE")).toBe("de");
    expect(negotiate("ZH-HANS")).toBe("zh-Hans");
  });

  it("matches on the base language when the region is unsupported", () => {
    expect(negotiate("fr-CA")).toBe("fr");
    expect(negotiate("pt-BR")).toBe("pt");
    expect(negotiate("es-419")).toBe("es");
  });

  it("collapses every Chinese tag onto Simplified, Traditional included", () => {
    // Deliberately lossy: there is no Hant catalog, and Hans is closer for a
    // Traditional reader than English is.
    expect(negotiate("zh")).toBe("zh-Hans");
    expect(negotiate("zh-CN")).toBe("zh-Hans");
    expect(negotiate("zh-TW")).toBe("zh-Hans");
    expect(negotiate("zh-Hant-HK")).toBe("zh-Hans");
  });

  it("honours q-values over header order", () => {
    expect(negotiate("en;q=0.5,de;q=0.9")).toBe("de");
    expect(negotiate("fr;q=0.2,pt;q=0.3,de;q=0.1")).toBe("pt");
  });

  it("treats a tag with no q as q=1", () => {
    expect(negotiate("de,fr;q=0.9")).toBe("de");
  });

  it("breaks equal q-values by header order", () => {
    expect(negotiate("fr;q=0.8,de;q=0.8")).toBe("fr");
  });

  it("skips unsupported languages to reach a supported one", () => {
    expect(negotiate("ja,ko;q=0.9,de;q=0.8")).toBe("de");
  });

  it("ignores q=0, which means 'not acceptable'", () => {
    expect(negotiate("de;q=0,fr;q=0.5")).toBe("fr");
  });

  it("treats an unparseable q as unacceptable rather than as q=1", () => {
    expect(negotiate("de;q=banana,fr;q=0.5")).toBe("fr");
  });

  it("returns the default for a wildcard", () => {
    expect(negotiate("*")).toBe("en");
    // A wildcard behind a real preference does not shadow it.
    expect(negotiate("de;q=0.9,*;q=0.1")).toBe("de");
  });

  it("survives whitespace and a trailing comma", () => {
    expect(negotiate("  fr-FR , fr;q=0.9 , en;q=0.8 ,")).toBe("fr");
  });
});

describe("resolveLocale", () => {
  it("prefers a valid cookie over the header", () => {
    expect(resolveLocale("de", "fr")).toBe("de");
  });

  it("falls back to the header when there is no cookie", () => {
    expect(resolveLocale(undefined, "pt-BR")).toBe("pt");
    expect(resolveLocale(null, "es")).toBe("es");
  });

  it("falls back to the header when the cookie is not a locale", () => {
    // A cookie is user-writable and decides nothing but language, but it still
    // must not be able to produce a locale that has no catalog.
    expect(resolveLocale("klingon", "fr")).toBe("fr");
    expect(resolveLocale("", "fr")).toBe("fr");
  });

  it("ends at English when neither says anything usable", () => {
    expect(resolveLocale(undefined, null)).toBe("en");
  });
});

describe("the roster", () => {
  it("has English as the default and first entry", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(SUPPORTED_LOCALES[0]).toBe("en");
  });

  it("gives every locale an endonym and an og:locale", () => {
    // The maps are keyed by `Locale`, so a missing entry is already a type
    // error; this catches the other direction — an entry left behind by a
    // locale that was removed.
    expect(Object.keys(LOCALE_ENDONYM).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    expect(Object.keys(OG_LOCALE).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it("accepts exactly the roster as locales", () => {
    for (const locale of SUPPORTED_LOCALES) expect(isLocale(locale)).toBe(true);
    expect(isLocale("en-US")).toBe(false);
    expect(isLocale("zh")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
