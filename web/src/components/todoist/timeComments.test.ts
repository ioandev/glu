import { beforeEach, describe, expect, it, vi } from "vitest";
import { MINUTE } from "@/lib/time";
import { initialPersistedState, resetGluStore, useGluStore } from "@/store/gluStore";
import { blobKey } from "@/store/storage";
import { MAX_COMMENT_MINUTES, OUTBOX_CAP, UNDO_GRACE_MS } from "@/store/types";
import { commentMinutes, newestInGrace, qualifies } from "./useTimeComments";

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

describe("ranMs is real attention, not total − remaining (ADR 14)", () => {
  it("accumulates only running stretches across pauses", () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 3 * MINUTE);
    store().pause();
    vi.setSystemTime(t0 + 30 * MINUTE); // a long break
    store().start();
    vi.setSystemTime(t0 + 32 * MINUTE);
    store().pause();

    expect(store().ranMs).toBe(5 * MINUTE);
  });

  it("is unaffected by ± adjustments — which is exactly why it exists", () => {
    const t0 = freezeClock();
    store().setPreset(20 * MINUTE);
    store().start();
    vi.setSystemTime(t0 + 2 * MINUTE);
    store().adjust(5 * MINUTE); // total − remaining would now be a lie
    vi.setSystemTime(t0 + 4 * MINUTE);
    store().pause();

    expect(store().ranMs).toBe(4 * MINUTE);
    expect(store().total).toBe(25 * MINUTE);
  });

  it("stops at endAt on the restored-expired path, not at 'now'", async () => {
    const t0 = freezeClock();
    // The run ended ten minutes in; the app opens six hours later.
    window.localStorage.setItem(
      blobKey(2),
      JSON.stringify({
        version: 2,
        state: {
          ...initialPersistedState(),
          status: "running",
          endAt: t0 - 6 * 60 * MINUTE,
          remaining: 0,
          total: 10 * MINUTE,
          runId: "expired",
          ranMs: 0,
          runningSince: t0 - 6 * 60 * MINUTE - 10 * MINUTE,
        },
      }),
    );

    await useGluStore.persist.rehydrate();

    expect(store().status).toBe("finished");
    // Ten minutes of attention, not six hours of closed-tab time.
    expect(store().ranMs).toBe(10 * MINUTE);
  });

  it("survives a reload mid-run so a resumed run does not zero it", async () => {
    const t0 = freezeClock();
    store().start();
    vi.setSystemTime(t0 + 4 * MINUTE);
    store().pause();

    const blob = window.localStorage.getItem(blobKey(2));
    resetGluStore();
    window.localStorage.setItem(blobKey(2), blob!);
    await useGluStore.persist.rehydrate();

    expect(store().ranMs).toBe(4 * MINUTE);
  });
});

describe("the posting threshold and format (ADR 14)", () => {
  it("does not qualify at exactly 60 s, does at 61", () => {
    expect(qualifies(60_000)).toBe(false);
    expect(qualifies(60_001)).toBe(true);
  });

  it("rounds to minutes, minimum 1, capped at 28 days", () => {
    expect(commentMinutes(61_000)).toBe(1);
    expect(commentMinutes(89_000)).toBe(1);
    expect(commentMinutes(91_000)).toBe(2);
    expect(commentMinutes(5 * MINUTE)).toBe(5);
    expect(commentMinutes(999 * 24 * 60 * MINUTE)).toBe(MAX_COMMENT_MINUTES);
  });
});

describe("the outbox (ADR 14)", () => {
  const entry = (runId: string, postAfter: number) => ({
    runId,
    taskId: "t1",
    minutes: 5,
    postAfter,
    attempts: 0,
  });

  it("is idempotent per run", () => {
    freezeClock();
    store().enqueueComment(entry("r1", 0));
    store().enqueueComment(entry("r1", 0));
    expect(store().outbox).toHaveLength(1);
  });

  it("caps its length rather than growing forever", () => {
    freezeClock();
    for (let i = 0; i < OUTBOX_CAP + 5; i += 1) store().enqueueComment(entry(`r${i}`, 0));
    expect(store().outbox).toHaveLength(OUTBOX_CAP);
    expect(store().outbox.at(-1)!.runId).toBe(`r${OUTBOX_CAP + 4}`);
  });

  it("undo removes the entry before it is ever sent", () => {
    const t0 = freezeClock();
    store().enqueueComment(entry("r1", t0 + UNDO_GRACE_MS));
    store().dropOutboxEntry("r1");
    expect(store().outbox).toEqual([]);
  });

  it("commit-on-displace makes the older entry due immediately", () => {
    const t0 = freezeClock();
    store().enqueueComment(entry("r1", t0 + UNDO_GRACE_MS));
    store().commitOutboxEntry("r1");
    expect(store().outbox[0].postAfter).toBe(0);
  });

  it("survives a reload — closing the site is not an undo", async () => {
    const t0 = freezeClock();
    store().enqueueComment(entry("r1", t0 + UNDO_GRACE_MS));

    const blob = window.localStorage.getItem(blobKey(2));
    resetGluStore();
    window.localStorage.setItem(blobKey(2), blob!);
    await useGluStore.persist.rehydrate();

    expect(store().outbox).toHaveLength(1);
    expect(store().outbox[0].runId).toBe("r1");
  });

  it("counts a failed attempt without dropping the entry", () => {
    freezeClock();
    store().enqueueComment(entry("r1", 0));
    store().markOutboxAttempt("r1");
    store().markOutboxAttempt("r1");
    expect(store().outbox[0].attempts).toBe(2);
  });
});

describe("which entry the undo bar offers (ADR 14)", () => {
  const now = 1_000_000;

  it("is the newest entry still inside its grace", () => {
    const chosen = newestInGrace(
      [
        { runId: "old", taskId: "t", minutes: 1, postAfter: now + 1000, attempts: 0 },
        { runId: "new", taskId: "t", minutes: 2, postAfter: now + 9000, attempts: 0 },
        { runId: "due", taskId: "t", minutes: 3, postAfter: now - 1, attempts: 0 },
      ],
      now,
    );
    expect(chosen?.runId).toBe("new");
  });

  it("is nothing once every entry is past its deadline", () => {
    expect(
      newestInGrace(
        [{ runId: "due", taskId: "t", minutes: 3, postAfter: now - 1, attempts: 0 }],
        now,
      ),
    ).toBeNull();
  });
});

describe("focus (ADR 14)", () => {
  it("persists and survives a reload", async () => {
    freezeClock();
    store().setFocusedTask({ id: "t1", title: "Ship it", priority: 1 });

    const blob = window.localStorage.getItem(blobKey(2));
    resetGluStore();
    window.localStorage.setItem(blobKey(2), blob!);
    await useGluStore.persist.rehydrate();

    expect(store().focusedTask).toEqual({ id: "t1", title: "Ship it", priority: 1 });
  });

  it("is optional — unfocusing leaves the timer untouched", () => {
    const t0 = freezeClock();
    store().setFocusedTask({ id: "t1", title: "Ship it", priority: 1 });
    store().start();
    store().setFocusedTask(null);
    expect(store().status).toBe("running");
    expect(store().endAt).toBe(t0 + 20 * MINUTE);
  });
});
