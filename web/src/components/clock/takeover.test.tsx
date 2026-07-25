import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MINUTE } from "@/lib/time";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import type { TimerStatus } from "@/store/types";
import {
  PEEK_MS,
  TAKEOVER_ANIMATION_MS,
  TAKEOVER_THRESHOLD_SECONDS,
  useTakeover,
  type Takeover,
} from "./useTakeover";

let reducedMotion = false;
vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return { ...actual, useReducedMotion: () => reducedMotion };
});

const captured: { current: Takeover | null } = { current: null };
const latest = () => captured.current!;

function Harness({
  status,
  seconds,
  runId = "run-1",
}: {
  status: TimerStatus;
  seconds: number;
  runId?: string | null;
}) {
  captured.current = useTakeover(status, seconds, runId);
  return null;
}

function renderTakeover(status: TimerStatus, seconds: number, runId: string | null = "run-1") {
  const view = render(<Harness status={status} seconds={seconds} runId={runId} />);
  return {
    async set(next: { status?: TimerStatus; seconds?: number; runId?: string | null }) {
      await act(async () => {
        view.rerender(
          <Harness
            status={next.status ?? status}
            seconds={next.seconds ?? seconds}
            runId={next.runId === undefined ? runId : next.runId}
          />,
        );
      });
      if (next.status !== undefined) status = next.status;
      if (next.seconds !== undefined) seconds = next.seconds;
      if (next.runId !== undefined) runId = next.runId;
    },
    async settle() {
      await act(async () => {
        vi.advanceTimersByTime(TAKEOVER_ANIMATION_MS + 100);
      });
    },
  };
}

beforeEach(() => {
  resetGluStore();
  reducedMotion = false;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-24T09:00:00.000Z").getTime());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the trigger (ADR 21)", () => {
  it("engages on the crossing, and never re-fires while under the threshold", async () => {
    const view = renderTakeover("running", 90);
    expect(latest().phase).toBe("off");

    await view.set({ seconds: TAKEOVER_THRESHOLD_SECONDS - 1 });
    expect(latest().phase).toBe("entering");
    await view.settle();
    expect(latest().phase).toBe("on");

    // Twenty ticks' worth of seconds ticking down: no re-entrance.
    for (let s = 58; s > 38; s -= 1) {
      await view.set({ seconds: s });
      expect(latest().phase, `at ${s}s`).toBe("on");
    }
  });

  it("never appears above the threshold, or when idle or paused", async () => {
    const view = renderTakeover("running", 61);
    expect(latest().covered).toBe(false);

    await view.set({ status: "idle", seconds: 0 });
    expect(latest().covered).toBe(false);

    await view.set({ status: "paused", seconds: 30 });
    expect(latest().covered).toBe(false);
  });

  it("retracts when a +5 lifts the remaining time back over the threshold", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 40 });
    await view.settle();
    expect(latest().phase).toBe("on");

    await view.set({ seconds: 40 + 5 * 60 });
    expect(latest().phase).toBe("retracting");
    await view.settle();
    expect(latest().phase).toBe("off");
  });

  it("retracts on pause and re-engages on resume under the threshold", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();

    await view.set({ status: "paused" });
    expect(latest().phase).toBe("retracting");
    await view.settle();
    expect(latest().covered).toBe(false);

    await view.set({ status: "running" });
    expect(latest().phase).toBe("entering");
  });

  it("renders instantly when the page restores straight into the final minute", async () => {
    // Mounted already under the threshold: there is no crossing to narrate.
    renderTakeover("running", 40);
    await act(async () => {});
    expect(latest().phase).toBe("on");
  });
});

describe("the finished state (ADR 21)", () => {
  it("persists at 0:00 and dissolves on a tap, without re-engaging", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 20 });
    await view.settle();

    await view.set({ status: "finished", seconds: 0 });
    expect(latest().covered).toBe(true);

    await act(async () => latest().onOverlayPress());
    expect(latest().phase).toBe("off");

    // Still finished, still dissolved.
    await view.set({ seconds: 0 });
    expect(latest().covered).toBe(false);
  });

  it("covers again for the next run", async () => {
    const view = renderTakeover("finished", 0, "run-1");
    await act(async () => latest().onOverlayPress());
    expect(latest().covered).toBe(false);

    await view.set({ status: "running", seconds: 30, runId: "run-2" });
    expect(latest().phase).toBe("entering");
  });
});

describe("the peek (ADR 21)", () => {
  it("reveals the UI for five seconds and then returns", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();

    await act(async () => latest().onOverlayPress());
    expect(latest().phase).toBe("peeking");
    expect(latest().covered).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(PEEK_MS + 50);
    });
    expect(latest().phase).toBe("on");
  });

  it("does not return if the peek was used to push past the threshold", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();

    await act(async () => latest().onOverlayPress());
    await view.set({ seconds: 30 + 5 * 60 });

    await act(async () => {
      vi.advanceTimersByTime(PEEK_MS + 50);
    });
    expect(latest().phase).toBe("off");
  });
});

describe("reduced motion (ADR 21)", () => {
  it("crossfades instead of sweeping", async () => {
    reducedMotion = true;
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    // No `entering` sweep phase at all.
    expect(latest().phase).toBe("on");
    expect(latest().reducedMotion).toBe(true);
  });
});

describe("the ADR 14 lifecycle question, verified (ADR 21)", () => {
  it("never calls a timer transition", async () => {
    const spies = (["start", "pause", "stop", "restart", "finish", "adjust"] as const).map(
      (action) => vi.spyOn(useGluStore.getState(), action),
    );

    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();
    await act(async () => latest().onOverlayPress());
    await view.set({ status: "finished", seconds: 0 });
    await act(async () => latest().onOverlayPress());
    await view.set({ status: "idle", seconds: 20 * (MINUTE / 1000) });

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
