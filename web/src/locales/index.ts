import type { Locale } from "@/lib/locale";
import en, { type Messages } from "./en";

/**
 * Loads one locale's catalog (ADR 44).
 *
 * An explicit `switch` over dynamic imports rather than a template literal
 * (`import(\`./${locale}\`)`): a computed specifier makes the bundler emit
 * *every* file in the directory as a possible chunk and defeats
 * `outputFileTracing`, while six literal specifiers are statically analysable
 * and each one becomes its own chunk. English is imported eagerly because it
 * is both the default and the fallback — the common request should not pay for
 * a dynamic import.
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
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

export type { Messages };
