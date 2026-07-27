import type { Locale as GluLocale } from "@/lib/locale";
import type { Messages as GluMessages } from "@/locales/en";

/**
 * Teaches next-intl the shape of GLU's catalog and roster (ADR 44), which is
 * what makes `useTranslations("settings")` autocomplete its keys and makes a
 * typo in a message id a build error rather than a string that renders as
 * `settings.saveButtno` in the UI.
 */
declare module "next-intl" {
  interface AppConfig {
    Messages: GluMessages;
    Locale: GluLocale;
  }
}
