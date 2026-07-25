import { describe, expect, it } from "vitest";
import {
  formatDurationBadge,
  formatMmSs,
  formatRemaining,
  MINUTE,
  remainingSeconds,
} from "./time";

describe("mm:ss formatting (ADR 02)", () => {
  it("uses the ceiling so a fresh 20:00 timer reads 20:00, not 19:59", () => {
    expect(formatRemaining(20 * MINUTE)).toBe("20:00");
    expect(formatRemaining(20 * MINUTE - 1)).toBe("20:00");
    expect(formatRemaining(19 * MINUTE + 59_001)).toBe("20:00");
  });

  it("pads both fields", () => {
    expect(formatMmSs(5)).toBe("00:05");
    expect(formatMmSs(65)).toBe("01:05");
  });

  it("clamps at 99:59 so no clock layout breaks (ADR 07)", () => {
    expect(formatMmSs(100 * 60)).toBe("99:59");
  });

  it("never goes negative", () => {
    expect(formatRemaining(-5000)).toBe("00:00");
    expect(remainingSeconds(-1)).toBe(0);
  });
});

describe("duration badge (ADR 14)", () => {
  it.each([
    [42 * MINUTE, "42m"],
    [125 * MINUTE, "2h 5m"],
    [120 * MINUTE, "2h"],
    [0, "0m"],
    [50 * 24 * 60 * MINUTE, "28d"],
    [(24 * 60 + 90) * MINUTE, "1d 1h"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatDurationBadge(ms)).toBe(expected);
  });
});
