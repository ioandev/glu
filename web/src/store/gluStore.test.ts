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
    const deltas = [1, -5, 5, -1, -5, 1, 1, -1, 5, -5].map((m) => m * MINUTE);
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

  it("leaves the selection alone while a run is in flight", () => {
    const t0 = freezeClock();
    store().setPreset(20 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 60_000);
    store().adjust(5 * MINUTE);
    // A `+5` to finish a thought is a nudge to this run, not a new preset.
    expect(store().selectedDuration).toBe(20 * MINUTE);
    store().stop();
    expect(store().remaining).toBe(20 * MINUTE);
  });
});

describe("± with no run in flight — custom durations (ADR 32)", () => {
  it("the reported repro: finish 5m, −1 twice, start → a 3-minute run", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 5 * MINUTE);
    store().finish();

    store().adjust(-MINUTE);
    store().adjust(-MINUTE);
    expect(store().selectedDuration).toBe(3 * MINUTE);
    expect(store().remaining).toBe(3 * MINUTE);

    store().start();
    expect(store().total).toBe(3 * MINUTE);
    expect(store().endAt).toBe(t0 + 5 * MINUTE + 3 * MINUTE);
  });

  it("counts from the selected duration at finished, not from the 0 on the clock", () => {
    const t0 = freezeClock();
    store().setPreset(20 * MINUTE);
    store().start();
    // A mid-run nudge moves `total` to 25 but leaves the selection at 20; the
    // base once finished is what Start would have re-armed, not what just ran.
    vi.setSystemTime(t0 + 60_000);
    store().adjust(5 * MINUTE);
    vi.setSystemTime(t0 + 30 * MINUTE);
    store().finish();

    store().adjust(-5 * MINUTE);
    expect(store().selectedDuration).toBe(15 * MINUTE);
  });

  it("leaves finished behind, in the shape stop produces", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 5 * MINUTE);
    store().finish();

    store().adjust(MINUTE);
    expect(store().status).toBe("idle");
    expect(store().runId).toBeNull();
    expect(store().ranMs).toBe(0);
    expect(store().runningSince).toBeNull();
    expect(store().endAt).toBeNull();
  });

  it("moves clock and selection together at idle", () => {
    freezeClock();
    store().setPreset(20 * MINUTE);
    store().adjust(-MINUTE);
    expect(store().status).toBe("idle");
    expect(store().remaining).toBe(19 * MINUTE);
    expect(store().total).toBe(19 * MINUTE);
    // The row would otherwise keep 20m highlighted against a 19:00 clock.
    expect(store().selectedDuration).toBe(19 * MINUTE);
  });

  it("survives start, stop and n", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().adjust(-2 * MINUTE);

    store().start();
    expect(store().total).toBe(3 * MINUTE);
    store().stop();
    expect(store().remaining).toBe(3 * MINUTE);
    expect(store().selectedDuration).toBe(3 * MINUTE);

    vi.setSystemTime(t0 + 1000);
    store().restart();
    expect(store().total).toBe(3 * MINUTE);
  });

  it("floors at one minute instead of finishing a run that never started", () => {
    freezeClock();
    store().setPreset(5 * MINUTE);
    store().adjust(-5 * MINUTE);
    expect(store().status).toBe("idle");
    expect(store().remaining).toBe(MINUTE);
    expect(store().selectedDuration).toBe(MINUTE);
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

describe("swipe hint (ADR 08 amendment)", () => {
  it("shows by default and closing it is one-way", () => {
    freezeClock();
    expect(store().swipeHintDismissed).toBe(false);

    store().dismissSwipeHint();
    expect(store().swipeHintDismissed).toBe(true);

    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({ swipeHintDismissed: true });
  });

  it("a blob written before the hint existed reads back undismissed", async () => {
    freezeClock();
    const { swipeHintDismissed, ...before } = initialPersistedState();
    void swipeHintDismissed;
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({
        version: CURRENT_BLOB_VERSION,
        state: { ...before, activeClockId: "terminal" },
      }),
    );

    await useGluStore.persist.rehydrate();
    // Additive field, no version bump (ADR 19's pattern).
    expect(store().swipeHintDismissed).toBe(false);
    expect(store().activeClockId).toBe("terminal");
  });
});

describe("welcome gate (ADR 31)", () => {
  it("starts closed and entering is one-way", () => {
    freezeClock();
    expect(store().hasEnteredApp).toBe(false);

    store().enterApp();
    expect(store().hasEnteredApp).toBe(true);

    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({ hasEnteredApp: true });
  });

  /**
   * The one that matters. `migrate` only fires when the stored version differs,
   * so an existing v2 blob never reaches it — if the flag were left to the
   * additive-blob default, every current user's next load would greet them with
   * a landing page. `merge` is what catches this, and this test is why.
   */
  it("a v2 blob written before the gate existed loads straight into the app", async () => {
    freezeClock();
    const { hasEnteredApp, ...before } = initialPersistedState();
    void hasEnteredApp;
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({
        version: CURRENT_BLOB_VERSION,
        state: { ...before, activeClockId: "terminal", swipeHintDismissed: true },
      }),
    );

    await useGluStore.persist.rehydrate();
    // Possessing a blob is proof of a prior visit — the gate must not reappear.
    expect(store().hasEnteredApp).toBe(true);
    // ...and the rest of the blob survives the override.
    expect(store().activeClockId).toBe("terminal");
    expect(store().swipeHintDismissed).toBe(true);
  });

  it("a v1 blob migrates in as entered, with its sessions intact", async () => {
    freezeClock();
    window.localStorage.setItem(
      blobKey(1),
      JSON.stringify({
        version: 1,
        state: { activeClockId: "orbit", selectedDuration: 45 * MINUTE },
      }),
    );

    await useGluStore.persist.rehydrate();
    expect(store().hasEnteredApp).toBe(true);
    expect(store().activeClockId).toBe("orbit");
    expect(store().selectedDuration).toBe(45 * MINUTE);
  });

  it("no blob at all is the genuine first visit, and stays closed", async () => {
    freezeClock();
    expect(window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION))).toBeNull();

    // `merge` is called with `undefined` on this path; it must not read it as
    // "a blob with the field absent".
    await useGluStore.persist.rehydrate();
    expect(store().hasEnteredApp).toBe(false);
  });

  /**
   * A corrupt blob is indistinguishable from no blob at the *parse* layer, but
   * not at the key layer: something is there, so somebody has been here. Losing
   * the archive to a mangled write is bad enough without also being handed a
   * landing page for an app you use daily.
   */
  it("a corrupt blob loads clean defaults but stays entered", async () => {
    freezeClock();
    window.localStorage.setItem(blobKey(CURRENT_BLOB_VERSION), "{not json");

    await useGluStore.persist.rehydrate();
    expect(store().hasEnteredApp).toBe(true);
    expect(store().remaining).toBe(initialPersistedState().remaining);
    expect(store().activeClockId).toBe(initialPersistedState().activeClockId);
  });

  it("a blob that explicitly says not-yet still shows the gate", async () => {
    freezeClock();
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({
        version: CURRENT_BLOB_VERSION,
        state: { ...initialPersistedState(), hasEnteredApp: false },
      }),
    );

    await useGluStore.persist.rehydrate();
    expect(store().hasEnteredApp).toBe(false);
  });

  it("entering leaves every other persisted field alone", async () => {
    freezeClock();
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({
        version: CURRENT_BLOB_VERSION,
        state: {
          ...initialPersistedState(),
          hasEnteredApp: false,
          activeClockId: "radar",
          archive: [{ startedAt: 1, sessions: [] }],
        },
      }),
    );
    await useGluStore.persist.rehydrate();

    store().enterApp();

    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({
      hasEnteredApp: true,
      activeClockId: "radar",
      archive: [{ startedAt: 1, sessions: [] }],
    });
  });
});

describe("scroll hint (ADR 08 amendment)", () => {
  it("starts false and every path into a run flips it one-way", () => {
    freezeClock();
    expect(store().hasStartedRun).toBe(false);

    store().start();
    expect(store().hasStartedRun).toBe(true);

    // Stopping does not bring the arrow back: the user has seen what is below.
    store().stop();
    expect(store().hasStartedRun).toBe(true);

    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({ hasStartedRun: true });
  });

  it("`n` (restart) and resuming a pause both count as having started", () => {
    freezeClock();
    store().restart();
    expect(store().hasStartedRun).toBe(true);

    // Resume, from a blob that predates the field mid-run.
    useGluStore.setState({ hasStartedRun: false });
    store().pause();
    store().start();
    expect(store().hasStartedRun).toBe(true);
  });

  it("survives New day — it is a lifetime fact, not a session count", () => {
    freezeClock();
    store().start();
    store().finish();
    store().newDay();

    expect(store().day.sessions).toHaveLength(0);
    expect(store().hasStartedRun).toBe(true);
  });

  it("a blob written before the field existed reads back as not-yet-started", async () => {
    freezeClock();
    const { hasStartedRun, ...before } = initialPersistedState();
    void hasStartedRun;
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({
        version: CURRENT_BLOB_VERSION,
        state: { ...before, activeClockId: "terminal" },
      }),
    );

    await useGluStore.persist.rehydrate();
    // Additive field, no version bump (ADR 19's pattern).
    expect(store().hasStartedRun).toBe(false);
    expect(store().activeClockId).toBe("terminal");
  });
});

describe("wake-lock preferences (ADR 17 amendment)", () => {
  it("defaults to the shipped ADR 17 policy: run only", () => {
    expect(store().stayAwakeAlways).toBe(false);
    expect(store().stayAwakeWhileRunning).toBe(true);
  });

  it("both toggles persist into the blob", () => {
    freezeClock();
    store().setStayAwakeAlways(true);
    store().setStayAwakeWhileRunning(false);

    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({
      stayAwakeAlways: true,
      stayAwakeWhileRunning: false,
    });
  });

  it("a blob written before the toggles existed reads back at the defaults", async () => {
    freezeClock();
    const { stayAwakeAlways, stayAwakeWhileRunning, ...before } = initialPersistedState();
    void stayAwakeAlways;
    void stayAwakeWhileRunning;
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({ version: CURRENT_BLOB_VERSION, state: { ...before, remaining: 7 * MINUTE } }),
    );

    await useGluStore.persist.rehydrate();
    // Additive field, no version bump: the default fills in and the rest of the
    // blob is untouched.
    expect(store().stayAwakeAlways).toBe(false);
    expect(store().stayAwakeWhileRunning).toBe(true);
    expect(store().remaining).toBe(7 * MINUTE);
  });

  it("neither toggle touches the timer", () => {
    const t0 = freezeClock();
    store().start();
    store().setStayAwakeAlways(true);
    store().setStayAwakeWhileRunning(false);
    expect(store()).toMatchObject({ status: "running", endAt: t0 + 20 * MINUTE });
  });
});

describe("alert sound preferences (ADR 40)", () => {
  it("defaults to ADR 18's chime, played once", () => {
    expect(store().alertSoundId).toBe("chime");
    expect(store().alertDurationSeconds).toBe(0);
  });

  it("both fields persist into the blob", () => {
    freezeClock();
    store().setAlertSoundId("bell");
    store().setAlertDurationSeconds(10);

    const raw = window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION));
    expect(JSON.parse(raw!).state).toMatchObject({
      alertSoundId: "bell",
      alertDurationSeconds: 10,
    });
  });

  it("stores only resolved values", () => {
    store().setAlertSoundId("gong");
    store().setAlertDurationSeconds(999);
    expect(store().alertSoundId).toBe("chime");
    expect(store().alertDurationSeconds).toBe(0);
  });

  it("a blob written before the fields existed reads back at the defaults", async () => {
    freezeClock();
    const { alertSoundId, alertDurationSeconds, ...before } = initialPersistedState();
    void alertSoundId;
    void alertDurationSeconds;
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({ version: CURRENT_BLOB_VERSION, state: { ...before, remaining: 7 * MINUTE } }),
    );

    await useGluStore.persist.rehydrate();

    // Additive fields, no version bump: the defaults fill in, nothing migrates.
    expect(store().alertSoundId).toBe("chime");
    expect(store().alertDurationSeconds).toBe(0);
    expect(store().remaining).toBe(7 * MINUTE);
    expect(window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION + 1))).toBeNull();
  });

  it("neither setting touches the timer", () => {
    const t0 = freezeClock();
    store().start();
    store().setAlertSoundId("deep");
    store().setAlertDurationSeconds(20);
    expect(store()).toMatchObject({ status: "running", endAt: t0 + 20 * MINUTE });
  });

  /** ADR 41 — the blob's first quota field. */
  it("persists the ask budget and reads a pre-field blob as nothing spent", async () => {
    freezeClock();
    store().noteAlertPrompt();
    store().noteAlertPrompt();
    expect(
      JSON.parse(window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION))!).state
        .alertPromptsUsed,
    ).toBe(2);

    const { alertPromptsUsed, ...before } = initialPersistedState();
    void alertPromptsUsed;
    window.localStorage.setItem(
      blobKey(CURRENT_BLOB_VERSION),
      JSON.stringify({ version: CURRENT_BLOB_VERSION, state: before }),
    );
    // A page load, not a mid-session re-read: `merge` keeps the *current* value
    // for a field the blob omits, and on a real load current is the default.
    resetGluStore();
    await useGluStore.persist.rehydrate();

    // Absent means zero, which is the honest reading — and no version bump.
    expect(store().alertPromptsUsed).toBe(0);
    expect(window.localStorage.getItem(blobKey(CURRENT_BLOB_VERSION + 1))).toBeNull();
  });

  it("counts up from a corrupt budget rather than freezing at NaN", () => {
    freezeClock();
    useGluStore.setState({ alertPromptsUsed: -4 });
    store().noteAlertPrompt();
    expect(store().alertPromptsUsed).toBe(1);
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
