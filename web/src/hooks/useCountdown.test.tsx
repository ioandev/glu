import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { MINUTE, SECOND } from "@/lib/time";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import { useCountdown, type Countdown } from "./useCountdown";

/**
 * Every *committed* frame, not just the settled one — the bug lived in a frame.
 * Recording in an effect is the point: a render React throws away never reaches
 * an effect, and it is effects that engage ADR 21's takeover.
 */
const frames: Countdown[] = [];

function Harness() {
  const countdown = useCountdown();
  useEffect(() => {
    frames.push(countdown);
  });
  return null;
}

beforeEach(() => {
  resetGluStore();
  frames.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-24T09:00:00.000Z").getTime());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the display value (ADR 02)", () => {
  it("never commits a transition's new status against the old value", async () => {
    // The regression: starting a run from `finished` committed one frame reading
    // `running` at 0 s, which engaged ADR 21's takeover on a 20-minute run.
    render(<Harness />);
    await act(async () => {
      useGluStore.getState().start();
      vi.advanceTimersByTime(20 * MINUTE);
    });
    expect(useGluStore.getState().status).toBe("finished");
    frames.length = 0;

    await act(async () => useGluStore.getState().start());

    expect(frames.length).toBeGreaterThan(0);
    for (const [index, frame] of frames.entries()) {
      if (frame.status !== "running") continue;
      expect(frame.remainingMs, `frame ${index + 1} of ${frames.length}`).toBe(20 * MINUTE);
    }
  });

  /**
   * The clocks draw their geometry from `remainingMs` (ADR 07, amended): if the
   * value only moved once a second, every ring in the gallery would step rather
   * than sweep, however smooth the CSS is.
   */
  it("repaints per animation frame, well inside one second", async () => {
    // Spying rather than stubbing: the fake clock still drives the real loop,
    // so the count is the number of frames the hook actually asked for.
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<Harness />);
    await act(async () => useGluStore.getState().start());
    raf.mockClear();
    frames.length = 0;

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // ~16 ms a frame under the fake clock: many frames, not one 1 Hz tick.
    expect(raf.mock.calls.length).toBeGreaterThan(10);
    // The value moved inside the first second — the whole point. (React batches
    // this synchronous burst into one commit, hence one frame recorded here;
    // in a browser each callback lands in its own paint.)
    const value = frames.at(-1)!.remainingMs;
    expect(value).toBeLessThan(20 * MINUTE);
    expect(value).toBeGreaterThan(20 * MINUTE - SECOND);
    raf.mockRestore();
  });

  /**
   * A hidden tab gets no animation frames. The interval underneath the frame
   * loop is what still lands `finish()` — and with it ADR 18's alerts.
   */
  it("still finishes the run when no animation frame ever fires", async () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
    render(<Harness />);
    await act(async () => useGluStore.getState().start());

    await act(async () => {
      vi.advanceTimersByTime(20 * MINUTE);
    });

    expect(raf).toHaveBeenCalled();
    expect(useGluStore.getState().status).toBe("finished");
    raf.mockRestore();
  });

  it("carries a mid-run adjustment in the frame that carries the new endAt", async () => {
    render(<Harness />);
    await act(async () => useGluStore.getState().start());
    frames.length = 0;

    await act(async () => useGluStore.getState().adjust(5 * MINUTE));

    for (const [index, frame] of frames.entries()) {
      expect(frame.remainingMs, `frame ${index + 1} of ${frames.length}`).toBe(25 * MINUTE);
    }
  });
});
