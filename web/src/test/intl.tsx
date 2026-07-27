import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/locales/en";

/**
 * The next-intl context, for tests that render a translated component
 * (ADR 44).
 *
 * The app mounts its provider in the root layout and Storybook mounts one in
 * `preview.tsx`; a jsdom test renders a component with neither, and
 * `useTranslations` throws rather than falling back — deliberately, because a
 * silently missing context in the *app* would be a blank UI.
 *
 * Always English. These tests assert behaviour, and pinning the language keeps
 * them asserting behaviour rather than translation: `e2e/i18n.spec.ts` is the
 * one place that exercises the other five.
 */
export function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Pass to `render`/`renderHook` as `{ wrapper: intlWrapper }`. Named rather
 * than inlined so the reason above has one place to live.
 */
export const intlWrapper = IntlWrapper;
