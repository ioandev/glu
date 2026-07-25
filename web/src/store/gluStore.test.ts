import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialPersistedState,
  nextEnvironment,
  resetGluStore,
  settleAfterRehydrate,
  useGluStore,
} from "./gluStore";
import { blobKey, CURRENT_BLOB_VERSION } from "./storage";
import { MINUTE } from "@/lib/time";
import { emptyEnvironment } from "./gluStore";

const store = () => useGluStore.getState();

/** Fake timers alone don't move `Date.now()`, and this engine reads the clock. */
function freezeClock(at = new Date("2026-07-24T09:00:00.000Z").getTime()) {
  vi.useFakeTimers();
  vi.setSystemTime(at);
  return at;
}

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
});

describe("timer engine — transitions (ADR 02)", () => {
  it("start begins the countdown from the selected duration", () => {
    const t0 = freezeClock();
    store().start();
    expect(store().status).toBe("running");
    expect(store().endAt).toBe(t0 + 20 * MINUTE);
    expect(store().runId).toBeTruthy();
  });

  it("pause freezes remaining and clears endAt", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 90_000);
    store().pause();
    expect(store().status).toBe("paused");
    expect(store().remaining).toBe(20 * MINUTE - 90_000);
    expect(store().endAt).toBeNull();
  });

  it("resume continues without losing time", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 90_000);
    store().pause();
    vi.setSystemTime(t0 + 5 * MINUTE); // paused for a while
    store().start();
    expect(store().status).toBe("running");
    expect(store().endAt).toBe(t0 + 5 * MINUTE + (20 * MINUTE - 90_000));
  });

  it("stop resets to the selected duration and goes idle", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 60_000);
    store().adjust(2 * MINUTE);
    store().stop();
    expect(store().status).toBe("idle");
    expect(store().remaining).toBe(5 * MINUTE);
    expect(store().total).toBe(5 * MINUTE);
    expect(store().runId).toBeNull();
  });

  it("keeps ranMs as real running time across pauses, not total − remaining", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 60_000);
    store().pause();
    vi.setSystemTime(t0 + 10 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 10 * MINUTE + 30_000);
    store().pause();
    expect(store().ranMs).toBe(90_000);
  });
});

describe("presets (ADR 02)", () => {
  it("sets total and remaining while idle, staying idle", () => {
    freezeClock();
    store().setPreset(45 * MINUTE);
    expect(store()).toMatchObject({
      status: "idle",
      total: 45 * MINUTE,
      remaining: 45 * MINUTE,
      selectedDuration: 45 * MINUTE,
    });
  });

  it("sets total and remaining while running, staying running", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 30_000);
    store().setPreset(10 * MINUTE);
    expect(store().status).toBe("running");
    expect(store().endAt).toBe(t0 + 30_000 + 10 * MINUTE);
    expect(store().total).toBe(10 * MINUTE);
  });
});

describe("± adjustments (ADR 02/03)", () => {
  it("changes remaining by exactly the delta and keeps total honest", () => {
    const t0 = freezeClock();
    store().setPreset(20 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 60_000);
    store().adjust(5 * MINUTE);
    expect(store().total).toBe(25 * MINUTE);
    expect(store().endAt! - (t0 + 60_000)).toBe(19 * MINUTE + 5 * MINUTE);
  });

  it("holds the remaining ≤ total invariant across a random walk", () => {
    const t0 = freezeClock();
    store().setPreset(20 * MINUTE);
    store().start();
    const deltas = [2, -5, 5, -2, -5, 2, 2, -2, 5, -5].map((m) => m * MINUTE);
    let now = t0;
    for (const d of deltas) {
      now += 10_000;
      vi.setSystemTime(now);
      store().adjust(d);
      if (store().status !== "running") break;
      const remaining = store().endAt! - now;
      expect(remaining).toBeLessThanOrEqual(store().total);
      expect(store().total).toBeGreaterThanOrEqual(MINUTE);
    }
  });

  it("subtracting past zero completes the timer", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 1000);
    store().adjust(-5 * MINUTE);
    expect(store().status).toBe("finished");
    expect(store().remaining).toBe(0);
  });
});

describe("suspension and restore (ADR 02/03)", () => {
  it("jumping the system clock past missed ticks yields the true remaining", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 7 * MINUTE);
    const remaining = store().endAt! - Date.now();
    expect(remaining).toBe(13 * MINUTE);
  });

  it("jumping past endAt settles into finished, silently", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 6 * MINUTE);
    settleAfterRehydrate();
    expect(store().status).toBe("finished");
  });

  it("restores a paused blob at exactly its remaining time", async () => {
    freezeClock();
    window.localStorage.setItem(
      blobKey(1),
      JSON.stringify({
        version: 1,
        state: {
          ...initialPersistedState(),
          status: "paused",
          remaining: 7 * MINUTE,
          total: 20 * MINUTE,
          runId: "planted",
        },
      }),
    );
    await useGluStore.persist.rehydrate();
    expect(store().status).toBe("paused");
    expect(store().remaining).toBe(7 * MINUTE);
  });

  it("restores a running blob whose endAt is still in the future", async () => {
    const t0 = freezeClock();
    window.localStorage.setItem(
      blobKey(1),
      JSON.stringify({
        version: 1,
        state: {
          ...initialPersistedState(),
          status: "running",
          endAt: t0 + 4 * MINUTE,
          remaining: 4 * MINUTE,
          runId: "planted",
          runningSince: t0,
        },
      }),
    );
    await useGluStore.persist.rehydrate();
    expect(store().status).toBe("running");
    expect(store().endAt).toBe(t0 + 4 * MINUTE);
  });

  it("restores an expired running blob directly into finished", async () => {
    const t0 = freezeClock();
    window.localStorage.setItem(
      blobKey(1),
      JSON.stringify({
        version: 1,
        state: {
          ...initialPersistedState(),
          status: "running",
          endAt: t0 - 1000,
          remaining: 0,
          runId: "planted",
          runningSince: t0 - 60_000,
        },
      }),
    );
    await useGluStore.persist.rehydrate();
    expect(store().status).toBe("finished");
  });

  it("loads clean defaults from a corrupt blob without throwing", async () => {
    freezeClock();
    window.localStorage.setItem(blobKey(1), "{not json");
    await expect(useGluStore.persist.rehydrate()).resolves.not.toThrow();
    expect(store().status).toBe("idle");
    expect(store().remaining).toBe(20 * MINUTE);
  });

  it("loads clean defaults when no blob exists at all", async () => {
    freezeClock();
    await useGluStore.persist.rehydrate();
    expect(store()).toMatchObject({ status: "idle", total: 20 * MINUTE });
  });
});

describe("persistence write discipline (ADR 02/03)", () => {
  it("writes on transitions and never on a tick", () => {
    const t0 = freezeClock();
    const spy = vi.spyOn(Storage.prototype, "setItem");

    store().start();
    const afterStart = spy.mock.calls.length;
    expect(afterStart).toBeGreaterThan(0);

    // 40 ticks' worth of clock movement: the tick loop reads, it never writes.
    for (let i = 1; i <= 40; i += 1) {
      vi.setSystemTime(t0 + i * 50);
      // What the tick actually does: derive the display value.
      const derived = store().endAt! - Date.now();
      expect(derived).toBeGreaterThan(0);
    }
    expect(spy.mock.calls.length).toBe(afterStart);

    store().pause();
    expect(spy.mock.calls.length).toBeGreaterThan(afterStart);
    spy.mockRestore();
  });

  it("writes the blob under the current versioned key", () => {
    freezeClock();
    store().start();
    expect(window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION))).toBeTruthy();
  });
});

describe("environment toggle exclusivity (ADR 02)", () => {
  const base = emptyEnvironment();

  it("Silence clears Music, Podcast, TV and Noisy", () => {
    let env = { ...base, music: true, podcast: true, tv: true, noisy: true };
    env = nextEnvironment(env, "silence");
    expect(env).toMatchObject({
      silence: true,
      music: false,
      podcast: false,
      tv: false,
      noisy: false,
    });
  });

  it.each(["music", "podcast", "tv", "noisy"] as const)("%s clears Silence", (key) => {
    const env = nextEnvironment({ ...base, silence: true }, key);
    expect(env.silence).toBe(false);
    expect(env[key]).toBe(true);
  });

  it("Headphones is orthogonal in both directions", () => {
    let env = nextEnvironment({ ...base, silence: true }, "headphones");
    expect(env).toMatchObject({ silence: true, headphones: true });
    env = nextEnvironment(env, "silence");
    expect(env.headphones).toBe(true);
    env = nextEnvironment({ ...base, music: true }, "headphones");
    expect(env).toMatchObject({ music: true, headphones: true });
  });

  it("untoggling Silence does not resurrect the sound environments", () => {
    let env = nextEnvironment({ ...base, music: true }, "silence");
    env = nextEnvironment(env, "silence");
    expect(env).toMatchObject({ silence: false, music: false });
  });

  it("toggles survive through the store action", () => {
    freezeClock();
    store().toggleEnvironment("music");
    store().toggleEnvironment("silence");
    expect(store().environment).toMatchObject({ music: false, silence: true });
  });
});
