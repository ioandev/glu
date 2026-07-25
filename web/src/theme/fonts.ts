import { Archivo_Black, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

/**
 * Self-hosted via `next/font` (ADR 07): no third-party fetch on every load, no
 * layout-shifting fallback swap, no font-CDN dependency — and the CSP in ADR 16
 * stays `default-src 'self'` because of it. `@storybook/nextjs-vite` supports
 * `next/font`, so Storybook renders identically.
 */
export const fontSans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--glu-font-sans",
  display: "swap",
});

export const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--glu-font-mono",
  display: "swap",
});

export const fontDisplay = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--glu-font-display",
  display: "swap",
});

export const fontClassNames = [fontSans.variable, fontMono.variable, fontDisplay.variable].join(
  " ",
);
