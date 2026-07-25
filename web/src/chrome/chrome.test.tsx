import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChromeBootstrap } from "./ChromeBootstrap";
import { CLOCKS, DEFAULT_CLOCK_ID } from "@/clocks/registry";
import { CHROME_IDS, CHROME_LIST, DEFAULT_CHROME_ID, resolveChrome } from "./registry";
import { chromeCssVariables, resolveScheme } from "./cssVariables";
import { buildChromeStylesheet } from "./stylesheet";
import { CLOCK_THEME_BY_ID } from "@/clocks/themes";
import { contrastRatio, NEUTRAL_CLOCK_THEME, type ClockTheme } from "@/theme/palette";

const SCHEMES = ["light", "dark"] as const;

describe("chrome registry (ADR 15)", () => {
  it("exports exactly three modules with unique ids", () => {
    expect(CHROME_LIST).toHaveLength(3);
    expect(new Set(CHROME_LIST.map((c) => c.id)).size).toBe(3);
    expect(CHROME_IDS).toEqual(["studio-quiet", "instrument", "poster"]);
  });

  it("every module is complete against the contract", () => {
    for (const chrome of CHROME_LIST) {
      expect(chrome.name).toBeTruthy();
      for (const scheme of SCHEMES) {
        expect(chrome.background[scheme]).toMatch(/^#[0-9a-f]{6}$/i);
        expect(chrome.ink[scheme]).toMatch(/^#[0-9a-f]{6}$/i);
        expect(chrome.muted[scheme]).toMatch(/^#[0-9a-f]{6}$/i);
        expect(chrome.border.color[scheme]).toBeTruthy();
        expect(chrome.surface.tint[scheme]).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(typeof chrome.radius.control).toBe("number");
      expect(typeof chrome.radius.card).toBe("number");
      expect(typeof chrome.radius.pill).toBe("number");
      expect(chrome.border.width).toBeGreaterThan(0);
      expect(["hairline", "rule", "ink"]).toContain(chrome.border.style);
      expect(["soft", "none", "offset"]).toContain(chrome.elevation);
      expect(["sentence", "upper"]).toContain(chrome.labels.case);
      expect(["sans", "mono", "display"]).toContain(chrome.labels.family);
      expect(["rounded", "square", "pill"]).toContain(chrome.controlShape);
      expect(["circle", "square"]).toContain(chrome.dotShape);
    }
  });

  it("matches the inventory table's signatures", () => {
    const byId = Object.fromEntries(CHROME_LIST.map((c) => [c.id, c]));
    // Studio Quiet: translucent surfaces, hairlines, 12–16px radii, soft shadows.
    expect(byId["studio-quiet"].border.style).toBe("hairline");
    expect(byId["studio-quiet"].elevation).toBe("soft");
    expect(byId["studio-quiet"].radius.control).toBeGreaterThanOrEqual(12);
    expect(byId["studio-quiet"].labels.case).toBe("sentence");
    // Instrument: square, ruled, zero elevation, UPPERCASE mono, square dots.
    expect(byId.instrument.radius).toEqual({ control: 0, card: 0, pill: 0 });
    expect(byId.instrument.elevation).toBe("none");
    expect(byId.instrument.labels.case).toBe("upper");
    expect(byId.instrument.labels.family).toBe("mono");
    expect(byId.instrument.dotShape).toBe("square");
    // Poster: 2px ink borders, pill radii, offset shadows, display type.
    expect(byId.poster.border.width).toBe(2);
    expect(byId.poster.controlShape).toBe("pill");
    expect(byId.poster.elevation).toBe("offset");
    expect(byId.poster.labels.family).toBe("display");
  });

  it("falls back to studio-quiet for an unknown id", () => {
    expect(resolveChrome("nope").id).toBe(DEFAULT_CHROME_ID);
    expect(resolveChrome(null).id).toBe(DEFAULT_CHROME_ID);
    expect(resolveChrome(undefined).id).toBe(DEFAULT_CHROME_ID);
    expect(resolveChrome("poster").id).toBe("poster");
  });
});

describe("token emission (ADR 15)", () => {
  it("bakes both schemes into every colour variable via light-dark()", () => {
    const vars = chromeCssVariables(CHROME_LIST[0]);
    expect(vars["--glu-page-bg"]).toMatch(/^light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\)$/i);
    expect(vars["--glu-surface"]).toMatch(/^light-dark\(/);
  });

  it("gives each direction a distinct shape signature", () => {
    const shapes = CHROME_LIST.map((c) => {
      const v = chromeCssVariables(c);
      return [
        v["--glu-control-radius"],
        v["--glu-border-width"],
        v["--glu-shadow"],
        v["--glu-label-transform"],
        v["--glu-dot-radius"],
      ].join("|");
    });
    expect(new Set(shapes).size).toBe(3);
  });

  it("remaps Mantine's own variables so components inherit the direction", () => {
    const vars = chromeCssVariables(CHROME_LIST[0]);
    expect(vars["--mantine-color-body"]).toBe("var(--glu-page-bg)");
    expect(vars["--mantine-primary-color-filled"]).toBe("var(--glu-accent)");
    expect(vars["--mantine-radius-default"]).toBe("var(--glu-radius-control)");
  });
});

describe("the palette mix (ADR 15)", () => {
  const tide: ClockTheme = {
    light: {
      background: "#e8f4f4",
      ink: "#0c3a3a",
      accent: "#17a2a2",
      onAccent: "#ffffff",
      muted: "#3f7d7d",
    },
    dark: {
      background: "#04211f",
      ink: "#d8f2f0",
      accent: "#2fd0c9",
      onAccent: "#04211f",
      muted: "#8ec9c4",
    },
  };

  it("reads as both the clock family and the chrome base", () => {
    for (const chrome of CHROME_LIST) {
      for (const scheme of SCHEMES) {
        const resolved = resolveScheme(chrome, tide[scheme], scheme);
        // Neither pole survives untouched: the mix is genuinely a blend.
        expect(resolved.pageBg).not.toBe(chrome.background[scheme]);
        expect(resolved.pageBg).not.toBe(tide[scheme].background);
        // …and different chromes with the same clock stay distinguishable.
      }
    }
    const bgs = CHROME_LIST.map((c) => resolveScheme(c, tide.light, "light").pageBg);
    expect(new Set(bgs).size).toBe(3);
  });

  it("surfaces follow the mixed base, so they carry the family for free", () => {
    for (const chrome of CHROME_LIST) {
      const neutral = resolveScheme(chrome, NEUTRAL_CLOCK_THEME.light, "light");
      const tinted = resolveScheme(chrome, tide.light, "light");
      expect(neutral.surface).not.toBe(tinted.surface);
    }
  });
});

/**
 * ADR 15's a11y gate, as a test rather than a screenshot review: the full
 * palette sweep on the default chrome, plus all three chromes against the named
 * extreme palettes. Runs over whatever ADR 07 has registered plus the neutral
 * baseline, in both schemes.
 */
describe("contrast matrix (ADR 15)", () => {
  const paletteEntries = (): [string, ClockTheme][] => [
    ["neutral", NEUTRAL_CLOCK_THEME],
    ...Object.entries(CLOCK_THEME_BY_ID),
  ];

  it("every chrome × palette × scheme keeps text legible", () => {
    const failures: string[] = [];
    for (const chrome of CHROME_LIST) {
      for (const [paletteId, palette] of paletteEntries()) {
        for (const scheme of SCHEMES) {
          const r = resolveScheme(chrome, palette[scheme], scheme);
          const checks: [string, number][] = [
            ["fg-on-page", contrastRatio(r.pageBg, r.pageFg)],
            ["muted-on-page", contrastRatio(r.pageBg, r.muted)],
            ["fg-on-surface", contrastRatio(r.surface, r.pageFg)],
            ["fg-on-surface-strong", contrastRatio(r.surfaceStrong, r.pageFg)],
            ["on-accent", contrastRatio(r.accentFill, r.onAccent)],
            ["accent-text-on-page", contrastRatio(r.pageBg, r.accentText)],
          ];
          for (const [what, ratio] of checks) {
            if (ratio < 4.5) {
              failures.push(
                `${chrome.id}/${paletteId}/${scheme} ${what} = ${ratio.toFixed(2)}`,
              );
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("the static stylesheet (ADR 15)", () => {
  it("emits shape rules per chrome and colour rules per chrome × clock", () => {
    const css = buildChromeStylesheet({ neutral: NEUTRAL_CLOCK_THEME });
    for (const chrome of CHROME_LIST) {
      expect(css).toContain(`[data-chrome="${chrome.id}"]{`);
      expect(css).toContain(`[data-chrome="${chrome.id}"][data-clock="neutral"]{`);
    }
    // Shape variables must not repeat inside the per-clock rules.
    const perClock = css
      .split("\n")
      .filter((line) => line.includes("[data-clock="))
      .join("\n");
    expect(perClock).not.toContain("--glu-radius-control");
  });
});

/**
 * The pre-paint bootstrap reads a hand-editable blob (2026-07-25 security
 * audit, F-10): both ids it lifts out must be allowlisted, not merely typed.
 */
describe("chrome bootstrap trusts nothing from the blob (ADR 15)", () => {
  const bootstrap = renderToStaticMarkup(<ChromeBootstrap />);

  it("allowlists the clock id as well as the chrome id", () => {
    expect(bootstrap).toContain("CHROMES.indexOf(s.chromeThemeId)!==-1");
    expect(bootstrap).toContain("CLOCKS.indexOf(s.activeClockId)!==-1");
  });

  it("ships the real id lists and defaults, not a hardcoded guess", () => {
    for (const id of CHROME_IDS) expect(bootstrap).toContain(`"${id}"`);
    for (const clock of CLOCKS) expect(bootstrap).toContain(`"${clock.id}"`);
    expect(bootstrap).toContain(`clock='${DEFAULT_CLOCK_ID}'`);
  });

  it("carries the CSP nonce onto both inline tags when given one", () => {
    const nonced = renderToStaticMarkup(<ChromeBootstrap nonce="abc123" />);
    expect(nonced.match(/nonce="abc123"/g)).toHaveLength(2);
  });

  /**
   * A header-delivered CSP blanks the `nonce` *attribute* in the DOM, so
   * hydration compares `""` against the nonce in the props and warns. Both tags
   * opt out — checked on the element tree, since the prop is a React directive
   * and never reaches the markup the test above reads.
   */
  it("opts both inline tags out of the nonce hydration warning", () => {
    const tags = ChromeBootstrap({ nonce: "abc123" }).props.children as React.ReactElement<{
      suppressHydrationWarning?: boolean;
    }>[];
    expect(tags.map((tag) => tag.type)).toEqual(["style", "script"]);
    for (const tag of tags) expect(tag.props.suppressHydrationWarning).toBe(true);
  });
});
