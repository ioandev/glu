import type { Locale } from "@/lib/locale";
import type { DocumentContent } from "./types";
import en from "./en";

/**
 * Loads one language's manual (ADR 44).
 *
 * A literal `switch` over dynamic imports, for the same reason
 * `src/locales/index.ts` uses one: a computed specifier would make the bundler
 * treat every file in this directory as a possible chunk. Here it matters more
 * than it does for the catalogs — each of these modules is the largest block of
 * prose in the app, and the drawer's modal must carry exactly one of them.
 *
 * English is eager: it is the default, and on the server it is already in the
 * graph.
 */
export async function loadDocs(locale: Locale): Promise<DocumentContent> {
  switch (locale) {
    case "es":
      return (await import("./es")).default;
    case "zh-Hans":
      return (await import("./zh-Hans")).default;
    case "fr":
      return (await import("./fr")).default;
    case "pt":
      return (await import("./pt")).default;
    case "de":
      return (await import("./de")).default;
    case "en":
      return en;
  }
}

export type { DocumentContent };
