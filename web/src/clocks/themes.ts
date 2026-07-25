import type { ClockTheme } from "@/theme/palette";
import { CLOCKS } from "./registry";

/**
 * Every clock's exported `{ light, dark }` palette, keyed by registry id.
 *
 * ADR 15's token layer and ADR 08's page painting both consume it, and ADR 15's
 * a11y matrix sweeps it. Kept in its own module so the chrome layer never has to
 * import clock components.
 */
export const CLOCK_THEME_BY_ID: Record<string, ClockTheme> = Object.fromEntries(
  CLOCKS.map((clock) => [clock.id, clock.theme]),
);

/**
 * ADR 15's named extremes — picked once and named here so the a11y matrix is a
 * fixed, reviewable set rather than a moving target.
 */
export const EXTREME_PALETTE_IDS = ["terminal", "edge", "pill"] as const;
