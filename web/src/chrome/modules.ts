import type { ChromeTheme } from "./types";

/**
 * Values transcribed from `docs/design/chrome/glu-concepts.dc.html` — the
 * *system*, not the pixels: every mockup value collapses into one of the
 * contract's axes (ADR 15).
 */

/** 1a — soft surfaces, hairlines, 12–16px radii, soft shadows, sentence case. */
export const studioQuiet: ChromeTheme = {
  id: "studio-quiet",
  name: "Studio Quiet",
  background: { light: "#e9f2f1", dark: "#0b1e1f" },
  ink: { light: "#14302e", dark: "#dcecea" },
  muted: { light: "#4a6764", dark: "#9dc0bc" },
  radius: { control: 12, card: 16, pill: 23 },
  border: {
    width: 1,
    style: "hairline",
    color: { light: "rgba(20, 48, 46, 0.16)", dark: "rgba(220, 236, 234, 0.16)" },
  },
  elevation: "soft",
  surface: {
    // Dark surfaces are a *lift* off the base, not a light fill — the same
    // formula, an order of magnitude less of it (see the mockup's dark phone).
    tint: { light: "#ffffff", dark: "#dcecea" },
    alpha: { light: 0.55, dark: 0.07 },
    strongAlpha: { light: 0.85, dark: 0.13 },
  },
  labels: {
    case: "sentence",
    family: "sans",
    tracking: "0.01em",
    weight: 500,
    size: "0.8125rem",
  },
  controlShape: "rounded",
  dotShape: "circle",
  paletteMix: 0.5,
  mantine: {
    defaultRadius: "md",
    shadow: "0 8px 28px rgba(16, 49, 47, 0.14)",
    headingFamily: "sans",
    headingWeight: 600,
  },
};

/** 1b — square corners, 1px ruled panels, zero elevation, UPPERCASE mono. */
export const instrument: ChromeTheme = {
  id: "instrument",
  name: "Instrument",
  background: { light: "#eef4ec", dark: "#060d08" },
  ink: { light: "#0e2013", dark: "#d2e9d5" },
  muted: { light: "#3f5c47", dark: "#83ad8b" },
  radius: { control: 0, card: 0, pill: 0 },
  border: { width: 1, style: "rule", color: { light: "#ccdccb", dark: "#1c2f1e" } },
  elevation: "none",
  surface: {
    tint: { light: "#ffffff", dark: "#d2e9d5" },
    alpha: { light: 0.3, dark: 0.05 },
    strongAlpha: { light: 0.55, dark: 0.09 },
  },
  labels: {
    case: "upper",
    family: "mono",
    tracking: "0.2em",
    weight: 500,
    size: "0.6875rem",
  },
  controlShape: "square",
  dotShape: "square",
  paletteMix: 0.44,
  mantine: {
    defaultRadius: "0",
    shadow: "none",
    headingFamily: "mono",
    headingWeight: 500,
  },
};

/** 1c — 2px ink borders, pill radii, hard offset shadows, Archivo Black. */
export const poster: ChromeTheme = {
  id: "poster",
  name: "Poster",
  background: { light: "#f6ecc7", dark: "#17120a" },
  ink: { light: "#191305", dark: "#f4ecd4" },
  muted: { light: "#5c5330", dark: "#c9bd98" },
  radius: { control: 14, card: 18, pill: 27 },
  border: {
    width: 2,
    style: "ink",
    color: { light: "#191305", dark: "rgba(244, 236, 212, 0.55)" },
  },
  elevation: "offset",
  surface: {
    tint: { light: "#fffdf2", dark: "#f4ecd4" },
    alpha: { light: 0.9, dark: 0.09 },
    strongAlpha: { light: 1, dark: 0.16 },
  },
  labels: {
    case: "sentence",
    family: "display",
    tracking: "0.04em",
    weight: 700,
    size: "0.8125rem",
  },
  controlShape: "pill",
  dotShape: "circle",
  paletteMix: 0.55,
  mantine: {
    defaultRadius: "lg",
    shadow: "4px 4px 0 rgba(25, 19, 5, 0.28)",
    headingFamily: "display",
    headingWeight: 700,
  },
};
