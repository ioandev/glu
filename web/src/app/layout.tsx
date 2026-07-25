import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { ChromeBootstrap } from "@/chrome/ChromeBootstrap";
import { ChromeSync } from "@/chrome/ChromeSync";
import { ClockSync } from "@/components/clock/ClockSync";
import { CLOCK_THEME_BY_ID } from "@/clocks/themes";
import { fontClassNames } from "@/theme/fonts";
import { theme } from "@/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLU",
  description: "Tablet-first pomodoro and focus tracker.",
  applicationName: "GLU",
  appleWebApp: {
    capable: true,
    title: "GLU",
    statusBarStyle: "default",
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // mantineHtmlProps carries suppressHydrationWarning — this is what kills the
    // color-scheme hydration mismatch (ADR 01).
    <html lang="en" className={fontClassNames} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
        <ChromeBootstrap clockThemes={CLOCK_THEME_BY_ID} nonce={nonce} />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <ChromeSync />
          <ClockSync />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
