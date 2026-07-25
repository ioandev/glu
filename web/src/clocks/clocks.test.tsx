import { describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CLOCKS, CLOCK_BY_ID, DEFAULT_CLOCK_ID, resolveClock } from "./registry";
import { CLOCK_THEME_BY_ID, EXTREME_PALETTE_IDS } from "./themes";
import { clockProgress, unitCount } from "./progress";
import { formatMmSs } from "@/lib/time";
import type { ClockProps } from "./types";

const baseProps: ClockProps = {
  remainingSeconds: 750,
  totalSeconds: 1500,
  session: 3,
  showSession: true,
  state: "running",
};

describe("clock registry (ADR 07)", () => {
  it("has exactly 18 entries with unique ids", () => {
    expect(CLOCKS).toHaveLength(18);
    expect(new Set(CLOCKS.map((c) => c.id)).size).toBe(18);
  });

  it("gives every entry a component and both scheme palettes", () => {
    for (const clock of CLOCKS) {
      expect(typeof clock.component).toBe("function");
      expect(clock.name).toBeTruthy();
      for (const scheme of ["light", "dark"] as const) {
        const palette = clock.theme[scheme];
        for (const key of ["background", "ink", "accent", "onAccent", "muted"] as const) {
          expect(palette[key], `${clock.id}.${scheme}.${key}`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
      // Each scheme is a designed rendition, not the same colours twice.
      expect(clock.theme.light.background).not.toBe(clock.theme.dark.background);
    }
  });

  it("matches the inventory table's capability flags", () => {
    expect(CLOCKS.filter((c) => c.showsSession)).toHaveLength(12);
    expect(CLOCKS.filter((c) => c.showsTotal).map((c) => c.id)).toEqual(["terminal"]);
    // The inventory *table* lists 7 natively-dark designs (1b, 1d, 1e, 2a, 2c,
    // 2d, 2h); the prose beneath it says 6. The table wins — see the ADR's
    // deviation note.
    expect(CLOCKS.filter((c) => c.nativeScheme === "dark").map((c) => c.id)).toEqual([
      "meridian",
      "aurora",
      "mono",
      "eclipse",
      "terminal",
      "sunset",
      "radar",
    ]);
    expect(CLOCKS.filter((c) => c.nativeScheme === "light")).toHaveLength(11);
  });

  it("falls back to Halo for an unknown id", () => {
    expect(resolveClock("nope").id).toBe(DEFAULT_CLOCK_ID);
    expect(resolveClock(null).id).toBe(DEFAULT_CLOCK_ID);
    expect(resolveClock("tide").id).toBe("tide");
    expect(CLOCK_BY_ID[DEFAULT_CLOCK_ID]).toBeDefined();
  });

  it("exports one palette per clock for the chrome layer", () => {
    expect(Object.keys(CLOCK_THEME_BY_ID)).toHaveLength(18);
    for (const id of EXTREME_PALETTE_IDS) expect(CLOCK_THEME_BY_ID[id]).toBeDefined();
  });
});

describe("clockProgress (ADR 07)", () => {
  it("derives remaining and elapsed fractions once, clamped", () => {
    expect(clockProgress(750, 1500).remainingFraction).toBe(0.5);
    expect(clockProgress(750, 1500).elapsedFraction).toBe(0.5);
    expect(clockProgress(0, 1500).remainingFraction).toBe(0);
    expect(clockProgress(9999, 1500).remainingFraction).toBe(1);
    expect(clockProgress(-5, 1500).remainingFraction).toBe(0);
  });

  it("uses ADR 02's formatter, ceiling and all", () => {
    expect(clockProgress(1500, 1500).time).toBe(formatMmSs(1500));
    expect(clockProgress(1500, 1500).minutes).toBe("25");
    expect(clockProgress(1500, 1500).seconds).toBe("00");
  });

  it("derives unit counts from the total — a 5-minute run is not 25 dots", () => {
    expect(unitCount(5 * 60)).toBe(5);
    expect(unitCount(25 * 60)).toBe(25);
    expect(unitCount(99 * 60)).toBe(25); // capped
    expect(unitCount(30)).toBe(1);
  });
});

describe("every clock renders (ADR 07)", () => {
  const totals = [300, 1500, 3600, 5940];

  it("across the remaining × total matrix without throwing", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      for (const total of totals) {
        for (const remaining of [0, 1, Math.floor(total / 2), total]) {
          expect(() =>
            render(<Component {...baseProps} remainingSeconds={remaining} totalSeconds={total} />),
          ).not.toThrow();
          cleanup();
        }
      }
    }
  });

  it("shows the shared formatter's time text wherever a time is displayed", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      const { container } = render(
        <Component {...baseProps} remainingSeconds={754} totalSeconds={1500} />,
      );
      // Broadside and Field split mm and ss onto separate lines.
      const text = container.textContent ?? "";
      const expected = formatMmSs(754);
      const [mm, ss] = expected.split(":");
      expect(
        text.includes(expected) || (text.includes(mm) && text.includes(ss)),
        `${clock.id} should show ${expected}`,
      ).toBe(true);
      cleanup();
    }
  });

  it("hides the session element for all 12 flagged clocks when showSession is off", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      const on = render(<Component {...baseProps} session={7} showSession />);
      const shown = on.queryAllByTestId("clock-session").length > 0;
      expect(shown, `${clock.id} showsSession=${clock.showsSession}`).toBe(clock.showsSession);
      if (shown) {
        expect(on.getByTestId("clock-session").textContent).toContain("7");
        // Count only — never "7/4"; GLU has no session target.
        expect(on.getByTestId("clock-session").textContent).not.toMatch(/7\s*\/\s*\d/);
      }
      cleanup();

      const off = render(<Component {...baseProps} session={7} showSession={false} />);
      expect(off.queryAllByTestId("clock-session")).toHaveLength(0);
      cleanup();
    }
  });

  it("Terminal shows `--focus Nm` from totalSeconds", () => {
    const Terminal = CLOCK_BY_ID.terminal.component;
    const { getByTestId } = render(
      <Terminal {...baseProps} totalSeconds={45 * 60} remainingSeconds={100} />,
    );
    expect(getByTestId("clock-total").textContent).toContain("--focus 45m");
  });

  it("is pure: the same props render identical markup twice", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      const first = render(<Component {...baseProps} />).container.innerHTML;
      cleanup();
      const second = render(<Component {...baseProps} />).container.innerHTML;
      cleanup();
      expect(second, clock.id).toBe(first);
    }
  });

  it("holds up at 99:59 and at 00:00", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      for (const [remaining, total] of [
        [99 * 60 + 59, 99 * 60 + 59],
        [0, 99 * 60 + 59],
      ]) {
        const { container } = render(
          <Component {...baseProps} remainingSeconds={remaining} totalSeconds={total} />,
        );
        expect(container.firstElementChild).toBeTruthy();
        cleanup();
      }
    }
  });
});

describe("purity, enforced (ADR 07)", () => {
  it("no clock source references Date.now or new Date", () => {
    const dir = join(process.cwd(), "src/clocks/designs");
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => /Date\.now|new Date\(/.test(readFileSync(join(dir, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
