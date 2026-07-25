import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MINUTE } from "@/lib/time";
import { initialPersistedState, resetGluStore, useGluStore } from "@/store/gluStore";
import { blobKey } from "@/store/storage";
import { useTodoistAuth } from "@/store/todoistAuth";
import { COMMENT_GRACE_MS, DEFAULT_COMMENT_THRESHOLD_MINUTES } from "@/store/types";
import { useTimeComments } from "./useTimeComments";

/**
 * ADR 28. The unit-level rule lives in `timeComments.test.ts`; what is proved
 * here is that the *run-end listener* asks the setting — and asks it at run
 * end, the same instant ADR 27's snapshot is taken.
 */

const store = () => useGluStore.getState();

function freezeClock(at = new Date("2026-07-25T09:00:00.000Z").getTime()) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(at);
  return at;
}

let fetchMock: ReturnType<typeof vi.fn>;

const posted = () =>
  new Response(JSON.stringify({ posted: true, content: "…", id: "c1" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

function postedBodies(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit)?.method === "POST")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
  useTodoistAuth.setState({ status: "in", name: "Ioan", id: "42" });
  fetchMock = vi.fn(async () => posted());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useTodoistAuth.setState({ status: "unknown", name: null, id: null });
});

/** A focused task and a run of exactly `ranMinutes`, ended by Stop. */
function runFor(t0: number, ranMinutes: number) {
  act(() => {
    store().setFocusedTask({ id: "t1", title: "Write the ADR", priority: 1 });
    store().start();
  });
  act(() => {
    vi.setSystemTime(t0 + ranMinutes * MINUTE);
    store().stop();
  });
}

describe("the minimum run before a comment is logged (ADR 28)", () => {
  it("defaults to ADR 14's minute, so nothing changes until the row is touched", () => {
    expect(initialPersistedState().commentThresholdMinutes).toBe(
      DEFAULT_COMMENT_THRESHOLD_MINUTES,
    );
    expect(DEFAULT_COMMENT_THRESHOLD_MINUTES).toBe(1);
  });

  it("queues nothing for a run under the chosen minimum", () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments());

    act(() => store().setCommentThresholdMinutes(5));
    runFor(t0, 4);

    expect(store().outbox).toEqual([]);
  });

  it("queues the same comment it always did once the run clears it", async () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments());

    act(() => store().setCommentThresholdMinutes(5));
    runFor(t0, 6);
    act(() => vi.setSystemTime(t0 + 6 * MINUTE + COMMENT_GRACE_MS + 1));

    await waitFor(() => expect(postedBodies()).toHaveLength(1));
    expect(postedBodies()[0]).toEqual({ taskId: "t1", minutes: 6 });
  });

  it("treats the minimum as at-least at the chosen minute too", () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments());

    act(() => store().setCommentThresholdMinutes(2));
    runFor(t0, 1.999);
    expect(store().outbox).toEqual([]);

    act(() => {
      vi.setSystemTime(t0 + 2 * MINUTE);
      store().start();
    });
    act(() => {
      vi.setSystemTime(t0 + 4 * MINUTE);
      store().stop();
    });
    expect(store().outbox).toHaveLength(1);
  });

  /**
   * The owner's repro, and the smallest run the app can produce: 5 minutes,
   * −1 four times (`MIN_TOTAL_MS` is one minute), run to 0:00. `accumulatedRanMs`
   * caps the stretch at `endAt`, so this lands on **exactly** 60 000 ms — the
   * one value ADR 14's `>` rejected while the row said "minimum 1 min".
   */
  it("posts for a 1-minute timer run to 0:00 at the default threshold", () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments());

    act(() => {
      store().setFocusedTask({ id: "t1", title: "Write the ADR", priority: 1 });
      store().setPreset(5 * MINUTE);
      for (let i = 0; i < 4; i++) store().adjust(-1 * MINUTE);
    });
    expect(store().remaining).toBe(1 * MINUTE);

    act(() => store().start());
    act(() => {
      // The tick fires at or after `endAt`; either way the run is one minute.
      vi.setSystemTime(t0 + 1 * MINUTE);
      store().finish();
    });

    expect(store().ranMs).toBe(1 * MINUTE);
    expect(store().outbox).toHaveLength(1);
    expect(store().outbox[0].minutes).toBe(1);
  });

  it("is read at run end: raising it afterwards does not un-queue a comment", async () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments());

    runFor(t0, 3);
    expect(store().outbox).toHaveLength(1);

    // The entry describes a decision already taken; a later change of mind is
    // about future runs (ADR 27's snapshot reasoning, same instant).
    act(() => {
      store().setCommentThresholdMinutes(10);
      vi.setSystemTime(t0 + 3 * MINUTE + COMMENT_GRACE_MS + 1);
    });

    await waitFor(() => expect(postedBodies()).toHaveLength(1));
    expect(postedBodies()[0]).toEqual({ taskId: "t1", minutes: 3 });
  });

  it("gates the comment only — a completed pomodoro still counts (ADR 05)", () => {
    const t0 = freezeClock();
    renderHook(() => useTimeComments());

    act(() => {
      store().setCommentThresholdMinutes(10);
      store().setPreset(5 * MINUTE);
      store().setFocusedTask({ id: "t1", title: "Write the ADR", priority: 1 });
      store().start();
    });
    act(() => {
      vi.setSystemTime(t0 + 5 * MINUTE);
      store().finish();
    });

    // Two questions, two answers (ADR 14's own note): "how many pomodoros" is
    // untouched by "how long is worth telling Todoist about".
    expect(store().day.sessions).toHaveLength(1);
    expect(store().outbox).toEqual([]);
  });

  it("refuses an off-ladder value rather than storing it", () => {
    store().setCommentThresholdMinutes(7);
    expect(store().commentThresholdMinutes).toBe(DEFAULT_COMMENT_THRESHOLD_MINUTES);
    store().setCommentThresholdMinutes(10);
    expect(store().commentThresholdMinutes).toBe(10);
  });
});

/**
 * ADR 14 amendment (2026-07-25g). The order here is the app's own order, and it
 * is the whole test: `rehydrate()` finishes an expired run *before* the shell —
 * and ADR 14's listener with it — is mounted. Reversing these two lines makes
 * the bug invisible, which is exactly how it shipped.
 */
describe("a run that ended while the app was closed (ADR 14)", () => {
  const expiredBlob = (now: number) => ({
    version: 2,
    state: {
      ...initialPersistedState(),
      focusedTask: { id: "t1", title: "Write the ADR", priority: 1 as const },
      status: "running" as const,
      endAt: now - 2 * MINUTE,
      remaining: 0,
      total: 5 * MINUTE,
      runId: "run-away-1",
      ranMs: 0,
      runningSince: now - 2 * MINUTE - 5 * MINUTE,
    },
  });

  it("still queues its comment, and still records its session", async () => {
    const t0 = freezeClock();
    // `resetGluStore()` writes defaults through `persist`, so it has to run
    // *before* the seed lands, not after it.
    resetGluStore();
    window.localStorage.setItem(blobKey(2), JSON.stringify(expiredBlob(t0)));

    await useGluStore.persist.rehydrate();
    expect(store().status).toBe("finished");
    // ADR 05's half never broke — it is written inside the store action.
    expect(store().day.sessions).toHaveLength(1);

    renderHook(() => useTimeComments());

    expect(store().outbox).toHaveLength(1);
    expect(store().outbox[0]).toMatchObject({ runId: "run-away-1", taskId: "t1", minutes: 5 });
  });

  it("replays to the first listener only, so a second mount cannot duplicate it", async () => {
    const t0 = freezeClock();
    resetGluStore();
    window.localStorage.setItem(blobKey(2), JSON.stringify(expiredBlob(t0)));
    await useGluStore.persist.rehydrate();

    const first = renderHook(() => useTimeComments());
    expect(store().outbox).toHaveLength(1);
    first.unmount();
    renderHook(() => useTimeComments());

    // The outbox is `runId`-idempotent anyway; this asserts the buffer itself
    // is drained, not that the outbox papered over a second delivery.
    expect(store().outbox).toHaveLength(1);
  });

  it("does not fire for a run that was already finished when the app closed", async () => {
    const t0 = freezeClock();
    resetGluStore();
    window.localStorage.setItem(
      blobKey(2),
      JSON.stringify({
        version: 2,
        state: {
          ...initialPersistedState(),
          focusedTask: { id: "t1", title: "Write the ADR", priority: 1 as const },
          status: "finished" as const,
          remaining: 0,
          total: 5 * MINUTE,
          runId: "run-done-1",
          ranMs: 5 * MINUTE,
          endAt: null,
          runningSince: null,
        },
      }),
    );
    await useGluStore.persist.rehydrate();
    renderHook(() => useTimeComments());

    // Its comment was queued when it ended; re-emitting on every load would
    // post a second one for the same run every time the tab reopened.
    expect(store().outbox).toEqual([]);
    void t0;
  });
});

describe("the setting rides the additive-blob pattern (ADR 28)", () => {
  it("survives a reload", async () => {
    freezeClock();
    act(() => store().setCommentThresholdMinutes(15));

    const blob = window.localStorage.getItem(blobKey(2));
    expect(JSON.parse(blob!).state).toMatchObject({ commentThresholdMinutes: 15 });

    resetGluStore();
    window.localStorage.setItem(blobKey(2), blob!);
    await useGluStore.persist.rehydrate();

    expect(store().commentThresholdMinutes).toBe(15);
  });

  it("reads as one minute in a blob written before it existed — no version bump", async () => {
    freezeClock();
    const legacy = { ...initialPersistedState() } as Record<string, unknown>;
    delete legacy.commentThresholdMinutes;
    window.localStorage.setItem(blobKey(2), JSON.stringify({ state: legacy, version: 2 }));

    resetGluStore();
    await useGluStore.persist.rehydrate();

    expect(store().commentThresholdMinutes).toBe(DEFAULT_COMMENT_THRESHOLD_MINUTES);
    // Same blob key: this is a field, not a migration.
    expect(window.localStorage.getItem(blobKey(3))).toBeNull();
  });

  it("a hand-edited blob with an impossible value still gates at the default", async () => {
    freezeClock();
    const tampered = { ...initialPersistedState(), commentThresholdMinutes: 0 };
    window.localStorage.setItem(blobKey(2), JSON.stringify({ state: tampered, version: 2 }));

    resetGluStore();
    await useGluStore.persist.rehydrate();
    renderHook(() => useTimeComments());

    const t0 = Date.now();
    runFor(t0, 0.5);
    // 30 seconds is under a minute, so a zeroed threshold buys nothing.
    expect(store().outbox).toEqual([]);
  });
});
