export const CHROME_IDS = ["studio-quiet", "instrument", "poster"] as const;
export type ChromeId = (typeof CHROME_IDS)[number];

export const DEFAULT_CHROME_ID: ChromeId = "studio-quiet";

export type BorderStyle = "hairline" | "rule" | "ink";
export type Elevation = "soft" | "none" | "offset";
export type ControlShape = "rounded" | "square" | "pill";
export type DotShape = "circle" | "square";
export type LabelCase = "sentence" | "upper";
export type LabelFamily = "sans" | "mono" | "display";

export interface SchemePair<T> {
  light: T;
  dark: T;
}

/**
 * Surfaces are alpha fills over the page base, which is exactly what makes them
 * palette-portable: mix a different clock family into the base and every panel
 * follows without a single hardcoded colour (ADR 15).
 */
export interface SurfaceFormula {
  /** The colour the alpha fill is made of, per scheme. */
  tint: SchemePair<string>;
  /** Quiet panels (task cards, preset buttons), per scheme. */
  alpha: SchemePair<number>;
  /** Prominent panels (focused task, drawers), per scheme. */
  strongAlpha: SchemePair<number>;
}

export interface BorderSpec {
  width: number;
  style: BorderStyle;
  color: SchemePair<string>;
}

export interface LabelTreatment {
  case: LabelCase;
  family: LabelFamily;
  /** CSS letter-spacing. */
  tracking: string;
  weight: number;
  /** Font size for the small label/legend role. */
  size: string;
}

export interface RadiusScale {
  control: number;
  card: number;
  pill: number;
}

/**
 * The whole contract. Every value a direction differs by has to collapse into
 * one of these axes — a mockup value that doesn't fit is a contract bug, not a
 * one-off style (ADR 15).
 */
export interface ChromeTheme {
  id: ChromeId;
  name: string;
  /** The page base per scheme — the user-requested exposure. */
  background: SchemePair<string>;
  /** Primary ink on that base. */
  ink: SchemePair<string>;
  /** Secondary ink (labels, hints). */
  muted: SchemePair<string>;
  radius: RadiusScale;
  border: BorderSpec;
  elevation: Elevation;
  surface: SurfaceFormula;
  labels: LabelTreatment;
  controlShape: ControlShape;
  dotShape: DotShape;
  /** How much of the clock palette's family bleeds into the chrome base. */
  paletteMix: number;
  /** Mantine override slice, so components inherit the direction. */
  mantine: {
    defaultRadius: string;
    /** The shadow Mantine's `shadow` props resolve to. */
    shadow: string;
    headingFamily: LabelFamily;
    headingWeight: number;
  };
}
