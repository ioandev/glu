import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialPersistedState, resetGluStore, useGluStore } from "./gluStore";
import { blobKey } from "./storage";

import { ARCHIVE_CAP_DAYS } from "./types";
import { MINUTE } from "@/lib/time";

/**
 * Simulates a page reload: keep the written blob, wipe the in-memory store
 * (which itself persists, hence the snapshot), then rehydrate from the blob.
 */
async function reload() {
  const blob = window.localStorage.getItem(blobKey(2));
  resetGluStore();
  if (blob !== null) window.localStorage.setItem(blobKey(2), blob);
  await useGluStore.persist.rehydrate();
}

const store = () => useGluStore.getState();

function freezeClock(at = new Date("2026-07-24T09:00:00.000Z").getTime()) {
  vi.useFakeTimers();
  vi.setSystemTime(at);
  return at;
}

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
});

describe("session recording (ADR 05)", () => {
  it("records exactly one session when a run finishes via the tick", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 5 * MINUTE);
    store().finish();
    expect(store().day.sessions).toHaveLength(1);
  });

  it("records nothing when a run is stopped mid-countdown", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 60_000);
    store().stop();
    expect(store().day.sessions).toHaveLength(0);
  });

  it("records nothing when a run is abandoned by restart (ADR 06's `n`)", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 60_000);
    store().restart();
    expect(store().day.sessions).toHaveLength(0);
  });

  it("finished → Start → finished counts 2", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 5 * MINUTE);
    store().finish();
    store().start();
    vi.setSystemTime(t0 + 11 * MINUTE);
    store().finish();
    expect(store().day.sessions).toHaveLength(2);
  });

  it("is idempotent: calling finish twice for one run records once", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 20 * MINUTE);
    store().finish();
    store().finish();
    expect(store().day.sessions).toHaveLength(1);
  });

  it("records endedAt, the run's total, and the completion-time environment", () => {
    const t0 = freezeClock();
    store().setPreset(15 * MINUTE);
    store().toggleEnvironment("music");
    store().start();
    vi.setSystemTime(t0 + 60_000);
    // Change the environment mid-run: the completion snapshot must win.
    store().toggleEnvironment("silence");
    vi.setSystemTime(t0 + 15 * MINUTE);
    store().finish();

    const [record] = store().day.sessions;
    expect(record.endedAt).toBe(t0 + 15 * MINUTE);
    expect(record.durationMs).toBe(15 * MINUTE);
    expect(record.environment).toMatchObject({ silence: true, music: false });
  });

  it("counts a ±-adjusted run at its total at completion", () => {
    const t0 = freezeClock();
    store().setPreset(5 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 30_000);
    store().adjust(5 * MINUTE);
    vi.setSystemTime(t0 + 11 * MINUTE);
    store().finish();
    expect(store().day.sessions[0].durationMs).toBe(10 * MINUTE);
  });
});

describe("restore-expired idempotency (ADR 05's bug farm)", () => {
  const plantExpiredRunning = (t0: number, runId = "planted") =>
    window.localStorage.setItem(
      blobKey(2),
      JSON.stringify({
        version: 2,
        state: {
          ...initialPersistedState(),
          status: "running",
          endAt: t0 - 1000,
          remaining: 0,
          total: 10 * MINUTE,
          runId,
          runningSince: t0 - 10 * MINUTE,
        },
      }),
    );

  it("records exactly once, and further reloads leave it unchanged", async () => {
    const t0 = freezeClock();
    plantExpiredRunning(t0);

    await useGluStore.persist.rehydrate();
    expect(store().status).toBe("finished");
    expect(store().day.sessions).toHaveLength(1);

    // Two further reloads read back the *persisted* finished state, which now
    // carries the runId in the ledger.
    for (let i = 0; i < 2; i += 1) {
      await reload();
      expect(store().status).toBe("finished");
      expect(store().day.sessions).toHaveLength(1);
    }
  });
});

describe("the day and New day (ADR 05)", () => {
  const withSessions = (n: number) => {
    const t0 = Date.now();
    useGluStore.setState({
      day: {
        startedAt: t0,
        sessions: Array.from({ length: n }, (_, i) => ({
          endedAt: t0 + i,
          durationMs: 20 * MINUTE,
          environment: initialPersistedState().environment,
        })),
      },
    });
  };

  it("archives the outgoing day, zeroes the count, and leaves timer/toggles alone", () => {
    freezeClock();
    store().setPreset(45 * MINUTE);
    store().toggleEnvironment("headphones");
    withSessions(3);

    store().newDay();

    expect(store().day.sessions).toHaveLength(0);
    expect(store().archive).toHaveLength(1);
    expect(store().archive[0].sessions).toHaveLength(3);
    expect(store().selectedDuration).toBe(45 * MINUTE);
    expect(store().environment.headphones).toBe(true);
  });

  it("archives nothing when the day was already empty", () => {
    freezeClock();
    store().newDay();
    expect(store().archive).toHaveLength(0);
  });

  it("trims the archive to the 90-day cap", () => {
    freezeClock();
    useGluStore.setState({
      archive: Array.from({ length: ARCHIVE_CAP_DAYS }, (_, i) => ({
        startedAt: i,
        sessions: [],
      })),
    });
    withSessions(1);
    store().newDay();
    expect(store().archive).toHaveLength(ARCHIVE_CAP_DAYS);
    // The oldest day fell off the front, the new one is at the back.
    expect(store().archive[0].startedAt).toBe(1);
    expect(store().archive.at(-1)!.sessions).toHaveLength(1);
  });

  it("survives a reload", async () => {
    freezeClock();
    withSessions(2);
    store().newDay();
    expect(window.localStorage.getItem(blobKey(2))).toBeTruthy();

    await reload();
    expect(store().day.sessions).toHaveLength(0);
    expect(store().archive).toHaveLength(1);
  });
});

describe("v1 → v2 migration (ADR 05)", () => {
  it("preserves a running timer and the toggles, adds an empty day", async () => {
    const t0 = freezeClock();
    window.localStorage.setItem(
      blobKey(1),
      JSON.stringify({
        version: 1,
        state: {
          status: "running",
          endAt: t0 + 6 * MINUTE,
          remaining: 6 * MINUTE,
          total: 20 * MINUTE,
          selectedDuration: 20 * MINUTE,
          runId: "v1-run",
          ranMs: 14 * MINUTE,
          runningSince: t0 - 14 * MINUTE,
          environment: {
            music: false,
            podcast: true,
            tv: false,
            silence: false,
            noisy: false,
            headphones: true,
          },
        },
      }),
    );

    await useGluStore.persist.rehydrate();

    expect(store().status).toBe("running");
    expect(store().endAt).toBe(t0 + 6 * MINUTE);
    expect(store().environment).toMatchObject({ podcast: true, headphones: true });
    expect(store().day.sessions).toHaveLength(0);
    expect(store().archive).toEqual([]);
  });

  it("writes back under glu:v2 and drops the v1 key", async () => {
    freezeClock();
    window.localStorage.setItem(
      blobKey(1),
      JSON.stringify({ version: 1, state: { ...initialPersistedState() } }),
    );
    await useGluStore.persist.rehydrate();
    // Any transition triggers the single v2 write-back.
    store().toggleEnvironment("music");
    expect(window.localStorage.getItem(blobKey(2))).toBeTruthy();
    expect(window.localStorage.getItem(blobKey(1))).toBeNull();
  });
});
