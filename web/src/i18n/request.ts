import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, isLocale, resolveLocale } from "@/lib/locale";
import { loadMessages } from "@/locales";

/**
 * next-intl's one integration point (ADR 44), and the *only* one — GLU runs it
 * **without i18n routing**. There is no `[locale]` segment, no middleware, and
 * `proxy.ts` is untouched: the locale comes from a cookie, falling back to
 * `Accept-Language`.
 *
 * Reading `cookies()`/`headers()` here would normally be a cost — it opts a
 * route out of static prerendering. It costs nothing in GLU, because every
 * page is *already* fully dynamic: `proxy.ts` mints a per-request CSP nonce
 * and the root layout reads it from `headers()` (ADR 16 amendment). That is
 * what makes cookie-based locale selection essentially free here, and it is
 * why URL locales were not worth their price.
 */
export default getRequestConfig(async ({ locale: override }) => {
  // `getTranslations({locale})` passes an explicit locale through this
  // parameter — it is a plain string from the caller, so it is validated
  // rather than trusted.
  const locale = isLocale(override)
    ? override
    : resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"));

  return { locale, messages: await loadMessages(locale) };
});
