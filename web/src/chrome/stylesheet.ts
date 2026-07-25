import { NEUTRAL_CLOCK_THEME, type ClockTheme } from "@/theme/palette";
import { chromeCssVariables } from "./cssVariables";
import { CHROME_LIST } from "./registry";

/**
 * Variables whose value depends only on the chrome direction (shape/material).
 * Emitted once per direction; everything else depends on the clock too.
 */
const SHAPE_KEYS = [
  "--glu-border-width",
  "--glu-border",
  "--glu-radius-control",
  "--glu-radius-card",
  "--glu-radius-pill",
  "--glu-shadow",
  "--glu-dot-radius",
  "--glu-control-radius",
  "--glu-label-transform",
  "--glu-label-tracking",
  "--glu-label-family",
  "--glu-label-weight",
  "--glu-label-size",
  "--glu-heading-family",
  "--glu-heading-weight",
  "--mantine-radius-default",
  "--mantine-shadow-md",
  "--mantine-shadow-lg",
];

function block(selector: string, vars: Record<string, string>): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `${selector}{${body}}`;
}

/**
 * The whole chrome × clock token space as static CSS. Static is the point:
 * `data-chrome`/`data-clock` are set by a tiny bootstrap script before first
 * paint, so neither the chrome nor the palette can flash (ADR 15's gotcha), and
 * flipping the colour scheme stays pure CSS via `light-dark()`.
 */
export function buildChromeStylesheet(
  clockThemes: Record<string, ClockTheme> = { neutral: NEUTRAL_CLOCK_THEME },
): string {
  const rules: string[] = [];

  // A root default so the tokens resolve even before/without the attributes —
  // an unset `--glu-page-bg` is a transparent page, not a graceful fallback.
  rules.push(block(":root", chromeCssVariables(CHROME_LIST[0], NEUTRAL_CLOCK_THEME)));

  for (const chrome of CHROME_LIST) {
    const all = chromeCssVariables(chrome, NEUTRAL_CLOCK_THEME);
    // The per-chrome rule carries shape *and* the neutral colours, so a clock id
    // with no registered palette still lands on a complete token set.
    rules.push(block(`[data-chrome="${chrome.id}"]`, all));

    for (const [clockId, clockTheme] of Object.entries(clockThemes)) {
      const vars = chromeCssVariables(chrome, clockTheme);
      const colors = Object.fromEntries(
        Object.entries(vars).filter(([k]) => !SHAPE_KEYS.includes(k)),
      );
      rules.push(
        block(`[data-chrome="${chrome.id}"][data-clock="${clockId}"]`, colors),
      );
    }
  }

  return rules.join("\n");
}
