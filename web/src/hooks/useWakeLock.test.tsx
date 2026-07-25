import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useGluStore } from "@/store/gluStore";
import type { TimerStatus } from "@/store/types";
import { useWakeLock, WAKE_LOCK_GRACE_MS } from "./useWakeLock";

type Listener = () => void;

class FakeSentinel {
  released = false;
  listeners: Listener[] = [];
  release = vi.fn(async () => {
    this.released = true;
  });
  addEventListener(_type: "release", listener: Listener) {
    this.listeners.push(listener);
  }
  removeEventListener(_type: "release", listener: Listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
  /** What the browser does when the page is hidden. */
  browserRelease() {
    this.released = true;
    for (const listener of this.listeners) listener();
  }
}

let sentinels: FakeSentinel[];
let request: ReturnType<typeof vi.fn>;

function installWakeLock(impl?: () => Promise<FakeSentinel>) {
  sentinels = [];
  request = vi.fn(
    impl ??
      (async () => {
        const sentinel = new FakeSentinel();
        sentinels.push(sentinel);
        return sentinel;
      }),
  );
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    writable: true,
    value: { request },
  });
}

function removeWakeLock() {
  Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "wakeLock");
}

function Harness({ status }: { status: TimerStatus }) {
  useWakeLock(status);
  return null;
}

/** Lets the pending `wakeLock.request()` promise settle. */
async function flush() {
  await act(async () => {});
}

/** Renders the hook and lets the status change like the store would. */
function renderHook(initial: TimerStatus) {
  const view = render(<Harness status={initial} />);
  return {
    ...view,
    async setStatus(status: TimerStatus) {
      await act(async () => {
        view.rerender(<Harness status={status} />);
      });
    },
  };
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-24T09:00:00.000Z"));
  installWakeLock();
  setVisibility("visible");
});

afterEach(() => {
  removeWakeLock();
  vi.useRealTimers();
});

describe("wake lock hold policy (ADR 17)", () => {
  it("requests a screen lock when a run starts", async () => {
    const view = renderHook("idle");
    expect(request).not.toHaveBeenCalled();

    await view.setStatus("running");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("screen");
  });

  it("releases immediately on idle (Stop)", async () => {
    const view = renderHook("running");
    await view.setStatus("idle");
    expect(sentinels[0].released).toBe(true);
  });

  it("keeps the sentinel through a pause and releases at the grace deadline", async () => {
    const view = renderHook("running");
    await view.setStatus("paused");
    expect(sentinels).toHaveLength(1);
    expect(sentinels[0].released).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(WAKE_LOCK_GRACE_MS + 1000);
    });
    expect(sentinels[0].released).toBe(true);
  });

  it("resuming within the grace keeps the same sentinel and clears the deadline", async () => {
    const view = renderHook("running");
    await view.setStatus("paused");
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await view.setStatus("running");

    expect(sentinels).toHaveLength(1);
    expect(sentinels[0].released).toBe(false);

    // Past what would have been the deadline: still held, because running.
    await act(async () => {
      vi.advanceTimersByTime(WAKE_LOCK_GRACE_MS + 1000);
    });
    expect(sentinels[0].released).toBe(false);
  });

  it("holds the finished state for the grace, then lets go", async () => {
    const view = renderHook("running");
    await view.setStatus("finished");
    expect(sentinels[0].released).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(WAKE_LOCK_GRACE_MS + 1000);
    });
    expect(sentinels[0].released).toBe(true);
  });

  it("starting again within the grace keeps the screen awake", async () => {
    const view = renderHook("running");
    await view.setStatus("finished");
    await act(async () => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    await view.setStatus("running");
    await act(async () => {
      vi.advanceTimersByTime(WAKE_LOCK_GRACE_MS + 1000);
    });
    expect(sentinels[0].released).toBe(false);
  });
});

describe("visibility re-acquire (ADR 17)", () => {
  it("re-requests after the browser drops the lock while running", async () => {
    renderHook("running");
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    // Hidden: the browser auto-releases. Our policy state is untouched.
    await act(async () => {
      sentinels[0].browserRelease();
      setVisibility("hidden");
    });
    expect(request).toHaveBeenCalledTimes(1);

    await act(async () => {
      setVisibility("visible");
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not re-request once the grace has expired", async () => {
    const view = renderHook("running");
    await flush();
    await view.setStatus("paused");
    await act(async () => {
      vi.advanceTimersByTime(WAKE_LOCK_GRACE_MS + 1000);
    });
    const callsBefore = request.mock.calls.length;

    await act(async () => {
      setVisibility("hidden");
    });
    await act(async () => {
      setVisibility("visible");
    });
    expect(request).toHaveBeenCalledTimes(callsBefore);
  });

  it("does not re-request our own explicit release", async () => {
    const view = renderHook("running");
    await flush();
    await view.setStatus("idle");
    const callsBefore = request.mock.calls.length;
    await act(async () => {
      setVisibility("hidden");
      setVisibility("visible");
    });
    expect(request).toHaveBeenCalledTimes(callsBefore);
  });
});

describe("degradation (ADR 17)", () => {
  it("does nothing and throws nothing when the API is absent", async () => {
    removeWakeLock();
    const view = renderHook("idle");
    await expect(view.setStatus("running")).resolves.not.toThrow();
    await expect(view.setStatus("finished")).resolves.not.toThrow();
    await expect(view.setStatus("idle")).resolves.not.toThrow();
  });

  it("survives a rejecting request()", async () => {
    installWakeLock(async () => {
      throw new Error("battery saver");
    });
    const view = renderHook("idle");
    await expect(view.setStatus("running")).resolves.not.toThrow();
    expect(request).toHaveBeenCalled();
  });
});

describe("the ADR 14 lifecycle question, verified (ADR 17)", () => {
  it("never calls a timer transition", async () => {
    const spies = (["start", "pause", "stop", "restart", "finish", "adjust", "setPreset"] as const).map(
      (action) => vi.spyOn(useGluStore.getState(), action),
    );

    const view = renderHook("idle");
    for (const status of ["running", "paused", "finished", "running", "idle"] as TimerStatus[]) {
      await view.setStatus(status);
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });
    }

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
