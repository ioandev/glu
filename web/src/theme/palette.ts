/**
 * A clock's colour family (ADR 07 exports one per scheme; ADR 08 paints the page
 * with it; ADR 15 mixes it into the active chrome's base).
 */
export interface ClockPalette {
  /** The clock card's own background — the colour family's anchor. */
  background: string;
  /** Primary ink on that background. */
  ink: string;
  /** The design's signature accent. */
  accent: string;
  /** Text that sits on top of `accent`. */
  onAccent: string;
  /** Secondary/label ink. */
  muted: string;
}

export interface ClockTheme {
  light: ClockPalette;
  dark: ClockPalette;
}

/**
 * Used before a clock is active (and by chrome stories that want the chrome's
 * own base unmixed). Deliberately colourless so the chrome shows through.
 */
export const NEUTRAL_CLOCK_THEME: ClockTheme = {
  light: {
    background: "#f2f2f0",
    ink: "#1b1b19",
    accent: "#3f5f5c",
    onAccent: "#ffffff",
    muted: "#5c5c58",
  },
  dark: {
    background: "#16171a",
    ink: "#eceded",
    accent: "#8fb6b2",
    onAccent: "#0d1211",
    muted: "#a6a8ab",
  },
};

// ---------------------------------------------------------------------------
// Colour maths — small, dependency-free, and shared by the chrome mix function
// and the contrast tests.
// ---------------------------------------------------------------------------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Linear blend; `amount` is how much of `b` ends up in the result. */
export function mix(a: string, b: string, amount: number): string {
  const t = Math.min(1, Math.max(0, amount));
  const from = parseHex(a);
  const to = parseHex(b);
  return toHex({
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  });
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two opaque colours. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick whichever of the two candidates reads better on `background`. */
export function bestContrast(background: string, ...candidates: string[]): string {
  return candidates.reduce((best, candidate) =>
    contrastRatio(background, candidate) > contrastRatio(background, best) ? candidate : best,
  );
}

/**
 * Nudge `ink` away from `background` until it clears `target`, so a mixed
 * palette can never land below the contrast gate (ADR 15's a11y matrix).
 */
export function ensureContrast(background: string, ink: string, target = 4.5): string {
  if (contrastRatio(background, ink) >= target) return ink;
  const towards = relativeLuminance(background) > 0.5 ? "#000000" : "#ffffff";
  let candidate = ink;
  for (let step = 1; step <= 20; step += 1) {
    candidate = mix(ink, towards, step / 20);
    if (contrastRatio(background, candidate) >= target) return candidate;
  }
  return towards;
}
