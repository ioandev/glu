import { describe, expect, it } from "vitest";
import { intlWrapper } from "@/test/intl";
import { render, cleanup } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CLOCKS, CLOCK_BY_ID, CLOCK_COUNT, DEFAULT_CLOCK_ID, resolveClock } from "./registry";
import { CLOCK_THEME_BY_ID, EXTREME_PALETTE_IDS } from "./themes";
import { clockProgress, unitCount } from "./progress";
import { formatMmSs, MINUTE, SECOND } from "@/lib/time";
import type { ClockProps } from "./types";

const baseProps: ClockProps = {
  remainingMs: 750 * SECOND,
  totalMs: 1500 * SECOND,
  session: 3,
  showSession: true,
  state: "running",
};

describe("clock registry (ADR 07)", () => {
  /**
   * The roster's size is derived, never asserted against a literal (ADR 42):
   * the count used to be written into the tests, the stories, the docs page and
   * four comments, and every one of them went stale the day a design landed.
   * What is worth enforcing is **completeness** — every design module in the
   * folder is registered, and no id is claimed twice.
   */
  it("registers every design module exactly once, with unique ids", () => {
    const modules = readdirSync(join(process.cwd(), "src/clocks/designs")).filter((f) =>
      f.endsWith(".tsx"),
    );
    expect(CLOCKS).toHaveLength(modules.length);
    expect(CLOCK_COUNT).toBe(CLOCKS.length);
    expect(new Set(CLOCKS.map((c) => c.id)).size).toBe(CLOCK_COUNT);
    expect(new Set(CLOCKS.map((c) => c.component.name))).toEqual(
      new Set(modules.map((f) => f.replace(/\.tsx$/, ""))),
    );
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

  it("keeps the capability flags honest", () => {
    // Terminal is still the only design that displays the run's total.
    expect(CLOCKS.filter((c) => c.showsTotal).map((c) => c.id)).toEqual(["terminal"]);
    // Both native schemes are represented — the roster is not a light-only or
    // dark-only set of mockups.
    for (const scheme of ["light", "dark"] as const) {
      expect(CLOCKS.some((c) => c.nativeScheme === scheme), scheme).toBe(true);
    }
    // Session display is a per-design decision — the flag has to be exercised
    // both ways, or it was not really a decision.
    expect(CLOCKS.some((c) => c.showsSession)).toBe(true);
    expect(CLOCKS.some((c) => !c.showsSession)).toBe(true);
  });

  it("falls back to Halo for an unknown id", () => {
    expect(resolveClock("nope").id).toBe(DEFAULT_CLOCK_ID);
    expect(resolveClock(null).id).toBe(DEFAULT_CLOCK_ID);
    expect(resolveClock("tide").id).toBe("tide");
    expect(CLOCK_BY_ID[DEFAULT_CLOCK_ID]).toBeDefined();
  });

  it("exports one palette per clock for the chrome layer", () => {
    expect(Object.keys(CLOCK_THEME_BY_ID)).toHaveLength(CLOCK_COUNT);
    for (const id of EXTREME_PALETTE_IDS) expect(CLOCK_THEME_BY_ID[id]).toBeDefined();
  });
});

describe("clockProgress (ADR 07)", () => {
  it("derives remaining and elapsed fractions once, clamped", () => {
    expect(clockProgress(750 * SECOND, 1500 * SECOND).remainingFraction).toBe(0.5);
    expect(clockProgress(750 * SECOND, 1500 * SECOND).elapsedFraction).toBe(0.5);
    expect(clockProgress(0, 1500 * SECOND).remainingFraction).toBe(0);
    expect(clockProgress(9999 * SECOND, 1500 * SECOND).remainingFraction).toBe(1);
    expect(clockProgress(-5 * SECOND, 1500 * SECOND).remainingFraction).toBe(0);
  });

  it("uses ADR 02's formatter, ceiling and all", () => {
    expect(clockProgress(1500 * SECOND, 1500 * SECOND).time).toBe(formatMmSs(1500));
    expect(clockProgress(1500 * SECOND, 1500 * SECOND).minutes).toBe("25");
    expect(clockProgress(1500 * SECOND, 1500 * SECOND).seconds).toBe("00");
    // Ceiling, so a part-second still reads as the second it is inside.
    expect(clockProgress(1499.4 * SECOND, 1500 * SECOND).time).toBe("25:00");
  });

  /** The reason the props carry milliseconds at all (amended 2026-07-25). */
  it("moves the fractions within a single second, and the digits not at all", () => {
    const total = 20 * MINUTE;
    const a = clockProgress(10 * MINUTE, total);
    const b = clockProgress(10 * MINUTE - 16, total);
    expect(b.elapsedFraction).toBeGreaterThan(a.elapsedFraction);
    expect(b.time).toBe(a.time);
    expect(b.remainingSeconds).toBe(a.remainingSeconds);
  });

  it("derives unit counts from the total — a 5-minute run is not 25 dots", () => {
    expect(unitCount(5 * 60)).toBe(5);
    expect(unitCount(25 * 60)).toBe(25);
    expect(unitCount(99 * 60)).toBe(25); // capped
    expect(unitCount(30)).toBe(1);
  });
});

describe("every clock renders (ADR 07)", () => {
  const totals = [300 * SECOND, 1500 * SECOND, 3600 * SECOND, 5940 * SECOND];

  it("across the remaining × total matrix without throwing", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      for (const total of totals) {
        // The half-second offsets are the new resolution: a clock must not
        // throw — or divide by a rounded-away zero — mid-second.
        for (const remaining of [0, 1, 500, Math.floor(total / 2) + 499, total]) {
          expect(() =>
            render(<Component {...baseProps} remainingMs={remaining} totalMs={total} />, { wrapper: intlWrapper }),
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
        <Component {...baseProps} remainingMs={754 * SECOND} totalMs={1500 * SECOND} />, { wrapper: intlWrapper });
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

  it("hides the session element on every flagged clock when showSession is off", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      const on = render(<Component {...baseProps} session={7} showSession />, { wrapper: intlWrapper });
      const shown = on.queryAllByTestId("clock-session").length > 0;
      expect(shown, `${clock.id} showsSession=${clock.showsSession}`).toBe(clock.showsSession);
      if (shown) {
        expect(on.getByTestId("clock-session").textContent).toContain("7");
        // Count only — never "7/4"; GLU has no session target.
        expect(on.getByTestId("clock-session").textContent).not.toMatch(/7\s*\/\s*\d/);
      }
      cleanup();

      const off = render(<Component {...baseProps} session={7} showSession={false} />, { wrapper: intlWrapper });
      expect(off.queryAllByTestId("clock-session")).toHaveLength(0);
      cleanup();
    }
  });

  it("Terminal shows `--focus Nm` from the run's total", () => {
    const Terminal = CLOCK_BY_ID.terminal.component;
    const { getByTestId } = render(
      <Terminal {...baseProps} totalMs={45 * MINUTE} remainingMs={100 * SECOND} />,
      { wrapper: intlWrapper },
    );
    expect(getByTestId("clock-total").textContent).toContain("--focus 45m");
  });

  it("is pure: the same props render identical markup twice", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      const first = render(<Component {...baseProps} />, { wrapper: intlWrapper }).container.innerHTML;
      cleanup();
      const second = render(<Component {...baseProps} />, { wrapper: intlWrapper }).container.innerHTML;
      cleanup();
      expect(second, clock.id).toBe(first);
    }
  });

  it("holds up at 99:59 and at 00:00", () => {
    for (const clock of CLOCKS) {
      const Component = clock.component;
      for (const [remaining, total] of [
        [(99 * 60 + 59) * SECOND, (99 * 60 + 59) * SECOND],
        [0, (99 * 60 + 59) * SECOND],
      ]) {
        const { container } = render(
          <Component {...baseProps} remainingMs={remaining} totalMs={total} />, { wrapper: intlWrapper });
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
