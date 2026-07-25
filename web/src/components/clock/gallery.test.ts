import { beforeEach, describe, expect, it } from "vitest";
import { CLOCKS, DEFAULT_CLOCK_ID } from "@/clocks/registry";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import { blobKey } from "@/store/storage";
import { swipeIntent, SWIPE_THRESHOLD_PX } from "./ClockGallery";

const store = () => useGluStore.getState();

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
});

describe("gallery flipping (ADR 08)", () => {
  it("defaults to Halo", () => {
    expect(store().activeClockId).toBe(DEFAULT_CLOCK_ID);
    expect(CLOCKS[0].id).toBe(DEFAULT_CLOCK_ID);
  });

  it("cycles through all 18 and returns to the start", () => {
    const seen: string[] = [];
    for (let i = 0; i < CLOCKS.length; i += 1) {
      seen.push(store().activeClockId);
      store().flipClock(1);
    }
    expect(seen).toEqual(CLOCKS.map((c) => c.id));
    expect(store().activeClockId).toBe(DEFAULT_CLOCK_ID);
  });

  it("wraps at both ends", () => {
    store().flipClock(-1);
    expect(store().activeClockId).toBe(CLOCKS.at(-1)!.id);
    store().flipClock(1);
    expect(store().activeClockId).toBe(CLOCKS[0].id);
  });

  it("falls back to Halo from a hand-planted unknown id", () => {
    useGluStore.setState({ activeClockId: "does-not-exist" });
    store().flipClock(1);
    // Resolution happens before the step, so the flip lands next to Halo.
    expect(store().activeClockId).toBe(CLOCKS[1].id);

    useGluStore.setState({ activeClockId: "still-not-real" });
    store().setActiveClock("still-not-real");
    expect(store().activeClockId).toBe(DEFAULT_CLOCK_ID);
  });

  it("persists the chosen clock and the session-display preference", async () => {
    store().setActiveClock("terminal");
    store().setShowSessionOnClock(false);

    const blob = window.localStorage.getItem(blobKey(2));
    resetGluStore();
    window.localStorage.setItem(blobKey(2), blob!);
    await useGluStore.persist.rehydrate();

    expect(store().activeClockId).toBe("terminal");
    expect(store().showSessionOnClock).toBe(false);
  });

  it("leaves the timer untouched when flipping", () => {
    store().start();
    const { endAt, runId, status } = store();
    store().flipClock(1);
    store().flipClock(1);
    expect(store()).toMatchObject({ endAt, runId, status });
  });
});

describe("swipe intent (ADR 08)", () => {
  it("ignores drags under the threshold", () => {
    expect(swipeIntent(SWIPE_THRESHOLD_PX - 1, 0)).toBe(0);
    expect(swipeIntent(-(SWIPE_THRESHOLD_PX - 1), 0)).toBe(0);
  });

  it("claims horizontal drags past the threshold", () => {
    expect(swipeIntent(-60, 5)).toBe(1);
    expect(swipeIntent(60, -5)).toBe(-1);
  });

  it("never claims a vertical scroll gesture", () => {
    expect(swipeIntent(45, 200)).toBe(0);
    expect(swipeIntent(-45, -200)).toBe(0);
    // Exactly diagonal stays the browser's.
    expect(swipeIntent(60, 60)).toBe(0);
  });
});
