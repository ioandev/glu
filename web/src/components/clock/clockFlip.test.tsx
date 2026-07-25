import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { CLOCKS } from "@/clocks/registry";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import { FLIP_ANIMATION_MS, useClockFlip, type ClockFlip } from "./useClockFlip";

let reducedMotion = false;
vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return { ...actual, useReducedMotion: () => reducedMotion };
});

const captured: { current: ClockFlip | null } = { current: null };
const latest = () => captured.current!;

function Harness() {
  captured.current = useClockFlip();
  return null;
}

/** Flip and settle the animation, so assertions see the landed state. */
async function land() {
  await act(async () => {
    vi.advanceTimersByTime(FLIP_ANIMATION_MS);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion = false;
  resetGluStore();
  window.localStorage.clear();
  render(<Harness />);
});

afterEach(() => {
  vi.useRealTimers();
  captured.current = null;
});

describe("clock flip animation (ADR 25)", () => {
  it("does not slide on first paint", () => {
    expect(latest().outgoingClockId).toBeNull();
    expect(latest().flipSeq).toBe(0);
  });

  it("stages the clock that was on screen as the outgoing layer", async () => {
    await act(async () => latest().flip(1));

    expect(latest().outgoingClockId).toBe(CLOCKS[0].id);
    expect(useGluStore.getState().activeClockId).toBe(CLOCKS[1].id);
    expect(latest().direction).toBe("forward");
    expect(latest().flipSeq).toBe(1);
  });

  it("mirrors the direction when flipping back", async () => {
    await act(async () => latest().flip(-1));
    expect(latest().direction).toBe("back");
    expect(latest().outgoingClockId).toBe(CLOCKS[0].id);
    expect(useGluStore.getState().activeClockId).toBe(CLOCKS.at(-1)!.id);
  });

  it("tears the outgoing layer down when the slide lands", async () => {
    await act(async () => latest().flip(1));
    expect(latest().outgoingClockId).not.toBeNull();

    await land();
    expect(latest().outgoingClockId).toBeNull();
  });

  it("honours an interrupting flip and restages from what is on screen", async () => {
    await act(async () => latest().flip(1));
    await act(async () => {
      vi.advanceTimersByTime(FLIP_ANIMATION_MS / 2);
    });

    await act(async () => latest().flip(1));
    // The second flip departs from the first flip's arrival — nothing dropped.
    expect(latest().outgoingClockId).toBe(CLOCKS[1].id);
    expect(useGluStore.getState().activeClockId).toBe(CLOCKS[2].id);
    expect(latest().flipSeq).toBe(2);

    // The first flip's landing timer must not pop this layer early: it was
    // re-armed, so half an animation later the slide is still in flight.
    await act(async () => {
      vi.advanceTimersByTime(FLIP_ANIMATION_MS / 2 + 1);
    });
    expect(latest().outgoingClockId).toBe(CLOCKS[1].id);

    await land();
    expect(latest().outgoingClockId).toBeNull();
  });

  it("swaps instantly under reduced motion, mounting no second layer", async () => {
    reducedMotion = true;
    render(<Harness />);

    await act(async () => latest().flip(1));
    expect(useGluStore.getState().activeClockId).toBe(CLOCKS[1].id);
    expect(latest().outgoingClockId).toBeNull();
    expect(latest().flipSeq).toBe(0);
  });

  it("ignores a zero step", async () => {
    await act(async () => latest().flip(0));
    expect(useGluStore.getState().activeClockId).toBe(CLOCKS[0].id);
    expect(latest().outgoingClockId).toBeNull();
  });
});
