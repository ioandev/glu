import type { Locale } from "@/lib/locale";
import type { DocumentContent } from "@/components/docs/content/types";
import privacyEn from "./privacy/en";
import termsEn from "./terms/en";

/**
 * The two legal documents, per language (ADR 44).
 *
 * Same literal-`switch` shape as the manual's loader and the message catalogs',
 * and for the same bundling reason. Unlike the manual, these are only ever
 * rendered by a route — there is no modal — so both resolve on the server.
 */
export async function loadPrivacy(locale: Locale): Promise<DocumentContent> {
  switch (locale) {
    case "es":
      return (await import("./privacy/es")).default;
    case "zh-Hans":
      return (await import("./privacy/zh-Hans")).default;
    case "fr":
      return (await import("./privacy/fr")).default;
    case "pt":
      return (await import("./privacy/pt")).default;
    case "de":
      return (await import("./privacy/de")).default;
    case "en":
      return privacyEn;
  }
}

export async function loadTerms(locale: Locale): Promise<DocumentContent> {
  switch (locale) {
    case "es":
      return (await import("./terms/es")).default;
    case "zh-Hans":
      return (await import("./terms/zh-Hans")).default;
    case "fr":
      return (await import("./terms/fr")).default;
    case "pt":
      return (await import("./terms/pt")).default;
    case "de":
      return (await import("./terms/de")).default;
    case "en":
      return termsEn;
  }
}
