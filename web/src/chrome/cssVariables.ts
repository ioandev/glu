import {
  bestContrast,
  ensureContrast,
  mix,
  NEUTRAL_CLOCK_THEME,
  type ClockPalette,
  type ClockTheme,
} from "@/theme/palette";
import type { ChromeTheme, LabelFamily } from "./types";

const FONT_VAR: Record<LabelFamily, string> = {
  sans: "var(--glu-font-sans)",
  mono: "var(--glu-font-mono)",
  display: "var(--glu-font-display)",
};

export interface ResolvedChromeScheme {
  pageBg: string;
  pageFg: string;
  muted: string;
  /** Accent as a fill (buttons, active chips). */
  accentFill: string;
  /** Text/icon colour that sits on `accentFill`. */
  onAccent: string;
  /** Accent used as text directly on the page. */
  accentText: string;
  surface: string;
  surfaceStrong: string;
  borderColor: string;
  shadow: string;
}

/**
 * The mix function: **chrome base × clock palette × scheme**.
 *
 * Requirement, not formula (ADR 15): the result must read as *both* the clock's
 * colour family and the chrome direction. The chrome contributes the base and
 * every shape/material token; the clock contributes the family, blended in at
 * the direction's own `paletteMix`. Surfaces are the chrome's alpha formula
 * flattened over the mixed base, so they follow the family for free — and being
 * opaque means every pair is contrast-checkable, which is what lets the a11y
 * matrix be a test instead of a screenshot review.
 */
export function resolveScheme(
  chrome: ChromeTheme,
  palette: ClockPalette,
  scheme: "light" | "dark",
): ResolvedChromeScheme {
  const pageBg = mix(chrome.background[scheme], palette.background, chrome.paletteMix);
  const surface = mix(pageBg, chrome.surface.tint[scheme], chrome.surface.alpha[scheme]);
  const surfaceStrong = mix(
    pageBg,
    chrome.surface.tint[scheme],
    chrome.surface.strongAlpha[scheme],
  );

  // Ink has to clear the gate on the page *and* on both surfaces — a token that
  // only passes on the page is exactly how a task card ends up unreadable.
  const backgrounds = [pageBg, surface, surfaceStrong];
  const againstAll = (start: string, target: number) =>
    backgrounds.reduce((ink, bg) => ensureContrast(bg, ink, target), start);

  const pageFg = againstAll(mix(chrome.ink[scheme], palette.ink, 0.25), 4.5);
  const muted = againstAll(mix(chrome.muted[scheme], palette.muted, 0.35), 4.5);

  const onAccent = bestContrast(palette.accent, palette.onAccent, "#ffffff", "#101010");
  const accentFill = ensureContrast(onAccent, palette.accent, 4.5);
  const accentText = againstAll(palette.accent, 4.5);

  return {
    pageBg,
    pageFg,
    muted,
    accentFill,
    onAccent,
    accentText,
    surface,
    surfaceStrong,
    borderColor: chrome.border.color[scheme],
    shadow: chrome.mantine.shadow,
  };
}

const pair = (light: string, dark: string) => `light-dark(${light}, ${dark})`;

/**
 * Emits the token map for a (chrome × clock) pairing. Both schemes are baked
 * into every variable via `light-dark()`, so flipping dark/light is pure CSS —
 * a JS-only mapping would reintroduce the theme-flash bugs ADR 01 killed.
 */
export function chromeCssVariables(
  chrome: ChromeTheme,
  clockTheme: ClockTheme = NEUTRAL_CLOCK_THEME,
): Record<string, string> {
  const light = resolveScheme(chrome, clockTheme.light, "light");
  const dark = resolveScheme(chrome, clockTheme.dark, "dark");

  return {
    "--glu-page-bg": pair(light.pageBg, dark.pageBg),
    "--glu-page-fg": pair(light.pageFg, dark.pageFg),
    "--glu-muted": pair(light.muted, dark.muted),
    "--glu-accent": pair(light.accentFill, dark.accentFill),
    "--glu-on-accent": pair(light.onAccent, dark.onAccent),
    "--glu-accent-text": pair(light.accentText, dark.accentText),
    "--glu-surface": pair(light.surface, dark.surface),
    "--glu-surface-strong": pair(light.surfaceStrong, dark.surfaceStrong),
    "--glu-border-color": pair(light.borderColor, dark.borderColor),
    "--glu-clock-bg": pair(clockTheme.light.background, clockTheme.dark.background),

    "--glu-border-width": `${chrome.border.width}px`,
    "--glu-border": `${chrome.border.width}px solid var(--glu-border-color)`,
    "--glu-radius-control": `${chrome.radius.control}px`,
    "--glu-radius-card": `${chrome.radius.card}px`,
    "--glu-radius-pill": `${chrome.radius.pill}px`,
    "--glu-shadow": chrome.elevation === "none" ? "none" : chrome.mantine.shadow,
    "--glu-dot-radius": chrome.dotShape === "circle" ? "50%" : "0px",
    "--glu-control-radius":
      chrome.controlShape === "pill"
        ? `${chrome.radius.pill}px`
        : chrome.controlShape === "square"
          ? "0px"
          : `${chrome.radius.control}px`,

    "--glu-label-transform": chrome.labels.case === "upper" ? "uppercase" : "none",
    "--glu-label-tracking": chrome.labels.tracking,
    "--glu-label-family": FONT_VAR[chrome.labels.family],
    "--glu-label-weight": String(chrome.labels.weight),
    "--glu-label-size": chrome.labels.size,
    "--glu-heading-family": FONT_VAR[chrome.mantine.headingFamily],
    "--glu-heading-weight": String(chrome.mantine.headingWeight),

    // The Mantine override slice (ADR 15) — expressed as variable remaps rather
    // than a JS theme object, so switching direction needs no re-render and no
    // per-component props, and cannot flash.
    "--mantine-color-body": "var(--glu-page-bg)",
    "--mantine-color-text": "var(--glu-page-fg)",
    "--mantine-color-dimmed": "var(--glu-muted)",
    "--mantine-primary-color-filled": "var(--glu-accent)",
    "--mantine-primary-color-filled-hover": "var(--glu-accent)",
    "--mantine-primary-color-contrast": "var(--glu-on-accent)",
    "--mantine-primary-color-light-color": "var(--glu-accent-text)",
    "--mantine-radius-default": "var(--glu-radius-control)",
    "--mantine-shadow-md": "var(--glu-shadow)",
    "--mantine-shadow-lg": "var(--glu-shadow)",
  };
}

/** Serialises the token map into a CSS declaration block body. */
export function chromeCssText(
  chrome: ChromeTheme,
  clockTheme: ClockTheme = NEUTRAL_CLOCK_THEME,
): string {
  return Object.entries(chromeCssVariables(chrome, clockTheme))
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n  ");
}
