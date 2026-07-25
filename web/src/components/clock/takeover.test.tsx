import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useCountdown } from "@/hooks/useCountdown";
import { MINUTE } from "@/lib/time";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import type { TimerStatus } from "@/store/types";
import {
  TAKEOVER_ANIMATION_MS,
  TAKEOVER_THRESHOLD_SECONDS,
  useTakeover,
  type Takeover,
} from "./useTakeover";

let reducedMotion = false;
/** jsdom has no layout, so the width the hook gates on is a test knob (ADR 21). */
let wideEnough = true;
vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return { ...actual, useReducedMotion: () => reducedMotion, useMediaQuery: () => wideEnough };
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
  wideEnough = true;
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

  it("retracts when ± at 00:00 arms the next run (ADR 32)", async () => {
    const view = renderTakeover("running", 20);
    await view.set({ status: "finished", seconds: 0 });
    await view.settle();
    expect(latest().covered).toBe(true);

    // Adjusting with nothing in flight leaves `finished` for `idle` — which is
    // half of why it leaves it: an undismissed flood would otherwise sit over
    // the row that just grew the custom rung.
    await view.set({ status: "idle", seconds: 180 });
    await view.settle();
    expect(latest().covered).toBe(false);
  });

  it("covers again for the next run", async () => {
    const view = renderTakeover("running", 20, "run-1");
    await view.set({ status: "finished", seconds: 0 });
    await act(async () => latest().onOverlayPress());
    expect(latest().covered).toBe(false);

    await view.set({ status: "running", seconds: 30, runId: "run-2" });
    expect(latest().phase).toBe("entering");
  });

  /**
   * ADR 21 amendment (2026-07-25): the 00:00 cover persists *through* a
   * crossing this hook watched. A page load has no crossing behind it, so it
   * loads the app, not the endgame screen.
   */
  it("does not raise itself on a page that loads at 00:00", async () => {
    const view = renderTakeover("finished", 0, "seeded-run");
    await act(async () => {});
    expect(latest().covered).toBe(false);
    expect(latest().phase).toBe("off");

    // Still nothing a tick later — this is a resting state, not a race.
    await view.settle();
    expect(latest().covered).toBe(false);
  });

  it("still holds 00:00 for a run restored into its final minute", async () => {
    // The other restore path (ADR 21): reload with 40 s left covers instantly,
    // and that cover is the one the finished state carries through.
    const view = renderTakeover("running", 40, "seeded-run");
    await act(async () => {});
    expect(latest().phase).toBe("on");

    await view.set({ status: "finished", seconds: 0 });
    expect(latest().covered).toBe(true);
  });
});

/**
 * ADR 21 amendment (2026-07-25): the tap is a dismissal, not a five-second
 * peek. The chrome the user asked for stays for the rest of the run.
 */
describe("the dismissal (ADR 21)", () => {
  it("reveals the UI and keeps it revealed while the run winds down", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();

    await act(async () => latest().onOverlayPress());
    expect(latest().phase).toBe("off");
    expect(latest().covered).toBe(false);

    // Half a minute of ticks under the threshold: nothing crawls back.
    for (let s = 29; s > 0; s -= 1) {
      await view.set({ seconds: s });
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      expect(latest().covered, `at ${s}s`).toBe(false);
    }
  });

  it("stays dismissed through 0:00", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();

    await act(async () => latest().onOverlayPress());
    await view.set({ status: "finished", seconds: 0 });
    await view.settle();
    expect(latest().covered).toBe(false);
  });

  it("stays dismissed across pause, resume and a +5 that re-crosses", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();
    await act(async () => latest().onOverlayPress());

    await view.set({ status: "paused" });
    await view.set({ status: "running" });
    expect(latest().covered).toBe(false);

    // Out over the threshold and back in — still the same run, still dismissed.
    await view.set({ seconds: 30 + 5 * 60 });
    await view.set({ seconds: 45 });
    await view.settle();
    expect(latest().covered).toBe(false);
  });

  it("covers again for the next run", async () => {
    const view = renderTakeover("running", 90, "run-1");
    await view.set({ seconds: 30 });
    await view.settle();
    await act(async () => latest().onOverlayPress());
    expect(latest().covered).toBe(false);

    await view.set({ seconds: 30, runId: "run-2" });
    expect(latest().phase).toBe("entering");
  });
});

/**
 * ADR 21 amendment (2026-07-25): below `sm` the clock already *is* the first
 * viewport (ADR 08), so there is nothing beside it for the takeover to cover.
 */
describe("below `sm` (ADR 21)", () => {
  beforeEach(() => {
    wideEnough = false;
  });

  it("never engages, not on the crossing and not at 00:00", async () => {
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();
    expect(latest().phase).toBe("off");
    expect(latest().covered).toBe(false);

    await view.set({ status: "finished", seconds: 0 });
    await view.settle();
    expect(latest().covered).toBe(false);
  });

  it("does not cover a page that restores into the final minute", async () => {
    renderTakeover("running", 40);
    await act(async () => {});
    expect(latest().covered).toBe(false);
  });

  it("retracts what is already up when the layout narrows past `sm`", async () => {
    // A rotation mid-takeover is the only way to arrive here covered.
    wideEnough = true;
    const view = renderTakeover("running", 90);
    await view.set({ seconds: 30 });
    await view.settle();
    expect(latest().phase).toBe("on");

    wideEnough = false;
    await view.set({ seconds: 29 });
    expect(latest().phase).toBe("retracting");
    await view.settle();
    expect(latest().covered).toBe(false);
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

/**
 * The hook above is driven by props; the app drives it from `useCountdown`
 * against the real store. This block wires the two together, because the
 * regression it guards lived exactly in the seam between them.
 */
describe("wired to the real timer (ADR 21)", () => {
  function WiredHarness() {
    const { status, seconds } = useCountdown();
    const runId = useGluStore((s) => s.runId);
    captured.current = useTakeover(status, seconds, runId);
    return null;
  }

  const runToFinish = async () => {
    await act(async () => {
      useGluStore.getState().start();
      vi.advanceTimersByTime(20 * MINUTE);
    });
  };

  it("does not engage when a fresh run starts from finished", async () => {
    render(<WiredHarness />);
    await runToFinish();
    expect(latest().covered).toBe(true);
    await act(async () => latest().onOverlayPress());
    expect(latest().phase).toBe("off");

    // A 20-minute run never crosses the threshold, so nothing may engage — not
    // even for the frame between `status: running` and the new remaining time.
    await act(async () => useGluStore.getState().start());
    expect(latest().phase).toBe("off");

    await act(async () => {
      vi.advanceTimersByTime(TAKEOVER_ANIMATION_MS + 100);
    });
    expect(latest().phase).toBe("off");
    expect(useGluStore.getState().status).toBe("running");
  });

  it("still engages on the real crossing, and retracts on Stop", async () => {
    render(<WiredHarness />);
    await act(async () => useGluStore.getState().start());
    await act(async () => {
      vi.advanceTimersByTime(20 * MINUTE - 30 * 1000);
    });
    expect(latest().covered).toBe(true);

    await act(async () => useGluStore.getState().stop());
    await act(async () => {
      vi.advanceTimersByTime(TAKEOVER_ANIMATION_MS + 100);
    });
    expect(latest().phase).toBe("off");
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
