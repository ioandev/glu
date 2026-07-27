import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { ChromeBootstrap } from "@/chrome/ChromeBootstrap";
import { ChromeSync } from "@/chrome/ChromeSync";
import { ClockSync } from "@/components/clock/ClockSync";
import { CLOCK_THEME_BY_ID } from "@/clocks/themes";
import {
  absoluteUrl,
  METADATA_BASE,
  OG_SITE,
  PAGE_META,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TITLE,
  TWITTER_CARD,
} from "@/lib/siteMetadata";
import { fontClassNames } from "@/theme/fonts";
import { theme } from "@/theme";
import "./globals.css";

export const metadata: Metadata = {
  // Origin **plus basePath** — the `opengraph-image` convention emits a
  // basePath-free URL and Next joins it onto `metadataBase.pathname`, so a bare
  // origin here points every social card at `ioan.dev/opengraph-image` (ADR 30).
  metadataBase: METADATA_BASE,
  title: {
    default: SITE_TITLE,
    // The `<title>` only — Next does *not* run this over an explicit
    // `openGraph.title`, which is why the cards read "Privacy Policy" beside an
    // `og:site_name` of "GLU" rather than saying GLU twice (ADR 30).
    template: `%s — ${SITE_NAME}`,
  },
  description: PAGE_META["/"].description,
  applicationName: SITE_NAME,
  authors: [{ name: "Ioan Bițicu", url: SITE_ORIGIN }],
  creator: "Ioan Bițicu",
  publisher: "Ioan Bițicu",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  // The defaults, which in practice only `/_not-found` ever uses: Next
  // *replaces* `openGraph` and `twitter` on merge rather than deep-merging
  // them, so every real page restates the whole object via `pageMetadata()`.
  // That is why `OG_SITE` and `TWITTER_CARD` are shared constants and not
  // written out here — setting `siteName` upstairs and `description`
  // downstairs ships a card with neither (ADR 30).
  //
  // No `twitter-image` convention anywhere, deliberately: Next fills
  // `twitter:image` from `opengraph-image`, so a second set of files would
  // double the build renders to produce byte-identical PNGs.
  openGraph: {
    ...OG_SITE,
    title: SITE_TITLE,
    description: PAGE_META["/"].description,
    url: absoluteUrl("/"),
  },
  twitter: {
    card: TWITTER_CARD,
    title: SITE_TITLE,
    description: PAGE_META["/"].description,
  },
  // **No `icons` key here, deliberately.** Declaring it overrides the App
  // Router icon file convention wholesale — `app/icon.{svg,png}` and
  // `app/apple-icon.png` — so a partial `icons: { apple }` silently deletes
  // every `<link rel="icon">` from the page. The convention also applies the
  // basePath, which a hand-written URL does not (ADR 01 / ADR 04).
};

/**
 * `themeColor` belongs in the **viewport** export — Next warns-and-ignores it
 * under `metadata`, a classic silent miss (ADR 04).
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9f2f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1e1f" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Minted per request by `proxy.ts`, which also sends the CSP. Both
  // inline scripts below are *required* before first paint (ADR 01's colour
  // scheme, ADR 15's chrome), so under `script-src 'self'` they need this or
  // the page never hydrates (ADR 16 amendment).
  //
  // Both also take `suppressHydrationWarning`, for the nonce alone: a
  // header-delivered CSP makes the browser blank the `nonce` *attribute* and
  // keep the value on the element's `.nonce` property, so hydration — which
  // reads attributes — sees `""` against the real nonce and warns about a
  // mismatch it won't patch. See `ChromeBootstrap` for the long version.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Resolved server-side from the cookie (ADR 44), which is what keeps the
  // language out of the first-paint problem the colour scheme and the chrome
  // both have. The store's copy of this setting is a *mirror* for the Settings
  // row; nothing renders from it, because `skipHydration: true` means it does
  // not exist yet at first paint. Here it is simply known.
  const locale = await getLocale();

  return (
    // mantineHtmlProps carries suppressHydrationWarning — this is what kills the
    // color-scheme hydration mismatch (ADR 01).
    <html lang={locale} className={fontClassNames} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} suppressHydrationWarning />
        <ChromeBootstrap clockThemes={CLOCK_THEME_BY_ID} nonce={nonce} />
      </head>
      <body>
        {/*
         * Messages are read from the request configuration rather than passed
         * explicitly, so the whole UI catalog reaches client components. The
         * *prose* — the manual, Privacy, Terms — is deliberately not in it and
         * never crosses this boundary: those are per-locale server modules
         * (ADR 44), which is how `/glu/docs` keeps shipping its text as HTML
         * rather than as a payload.
         */}
        <NextIntlClientProvider>
          <MantineProvider theme={theme} defaultColorScheme="auto">
            <ChromeSync />
            <ClockSync />
            {children}
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
