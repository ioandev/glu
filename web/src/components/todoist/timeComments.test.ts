import { beforeEach, describe, expect, it, vi } from "vitest";
import { MINUTE } from "@/lib/time";
import { initialPersistedState, resetGluStore, useGluStore } from "@/store/gluStore";
import { blobKey } from "@/store/storage";
import {
  COMMENT_GRACE_MS,
  COMMENT_THRESHOLD_CHOICES,
  commentThresholdMs,
  COMMENT_UNDO_MS,
  DEFAULT_COMMENT_THRESHOLD_MINUTES,
  MAX_COMMENT_MINUTES,
  OUTBOX_CAP,
} from "@/store/types";
import {
  commentMinutes,
  commentUndoMessage,
  newestInGrace,
  qualifies,
  soonestDeadline,
} from "./useTimeComments";

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
  it("qualifies at exactly 60 s, not below it (ADR 28 amendment)", () => {
    // A 1-minute run ends with exactly 60 000 ms of attention, and "minimum
    // 1 minute" has to include it — ADR 14's `>` did not.
    expect(qualifies(59_999, DEFAULT_COMMENT_THRESHOLD_MINUTES)).toBe(false);
    expect(qualifies(60_000, DEFAULT_COMMENT_THRESHOLD_MINUTES)).toBe(true);
    expect(qualifies(60_001, DEFAULT_COMMENT_THRESHOLD_MINUTES)).toBe(true);
  });

  it("applies the same at-least rule at whatever minute is chosen (ADR 28)", () => {
    expect(qualifies(5 * MINUTE - 1, 5)).toBe(false);
    expect(qualifies(5 * MINUTE, 5)).toBe(true);
    // A run that used to post now does not, and that is the whole feature.
    expect(qualifies(4 * MINUTE, 5)).toBe(false);
    expect(qualifies(4 * MINUTE, 1)).toBe(true);
  });

  it("reads an off-ladder value as the default rather than as a wide-open gate", () => {
    for (const junk of [0, -5, 1.5, 999, Number.NaN, null, "5"]) {
      expect(commentThresholdMs(junk)).toBe(60_000);
      expect(qualifies(59_999, junk as number)).toBe(false);
      expect(qualifies(60_000, junk as number)).toBe(true);
    }
    // Every rung the UI offers is honoured, though.
    for (const choice of COMMENT_THRESHOLD_CHOICES) {
      expect(commentThresholdMs(choice)).toBe(choice * MINUTE);
    }
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
    store().enqueueComment(entry("r1", t0 + COMMENT_GRACE_MS));
    store().dropOutboxEntry("r1");
    expect(store().outbox).toEqual([]);
  });

  it("commit-on-displace makes the older entry due immediately", () => {
    const t0 = freezeClock();
    store().enqueueComment(entry("r1", t0 + COMMENT_GRACE_MS));
    store().commitOutboxEntry("r1");
    expect(store().outbox[0].postAfter).toBe(0);
  });

  it("survives a reload — closing the site is not an undo", async () => {
    const t0 = freezeClock();
    store().enqueueComment(entry("r1", t0 + COMMENT_GRACE_MS));

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

describe("the two-phase undo window (ADR 14 amendment, c)", () => {
  const now = 1_000_000;
  const queued = (postAfter: number) => ({
    runId: "r1",
    taskId: "t1",
    minutes: 5,
    postAfter,
    attempts: 0,
  });
  const posted = (postedAt: number) => ({
    runId: "r1",
    taskId: "t1",
    minutes: 5,
    commentId: "c1",
    postedAt,
  });

  it("offers cancellation while the entry is queued", () => {
    const message = commentUndoMessage(queued(now + COMMENT_GRACE_MS), null);
    expect(message).toMatchObject({ phase: "queued", minutes: 5, key: "comment:r1" });
  });

  it("advertises grace + undo up front, so a slow POST cannot leave a gap", () => {
    const message = commentUndoMessage(queued(now + COMMENT_GRACE_MS), null);
    expect(message!.until).toBe(now + COMMENT_GRACE_MS + COMMENT_UNDO_MS);
  });

  it("keeps the same key across the handover — one bar, not two", () => {
    const beforePost = commentUndoMessage(queued(now + COMMENT_GRACE_MS), null);
    const afterPost = commentUndoMessage(null, posted(now + COMMENT_GRACE_MS));
    expect(afterPost).toMatchObject({ phase: "posted", key: beforePost!.key });
    expect(afterPost!.until).toBe(now + COMMENT_GRACE_MS + COMMENT_UNDO_MS);
  });

  it("prefers the queued entry, because a newer run displaces an older post", () => {
    const message = commentUndoMessage(queued(now + COMMENT_GRACE_MS), posted(now - 1000));
    expect(message!.phase).toBe("queued");
  });

  it("carries a failed delete onto the bar rather than hiding it", () => {
    const message = commentUndoMessage(null, { ...posted(now), error: "Could not undo" });
    expect(message!.error).toBe("Could not undo");
  });

  it("is nothing when neither phase is live", () => {
    expect(commentUndoMessage(null, null)).toBeNull();
  });
});

describe("draining lands on the deadline, not on the next tick (ADR 14)", () => {
  const entry = (runId: string, postAfter: number) => ({
    runId,
    taskId: "t1",
    minutes: 5,
    postAfter,
    attempts: 0,
  });
  const now = 1_000_000;

  it("aims at the soonest deadline still ahead", () => {
    expect(
      soonestDeadline([entry("a", now + 5000), entry("b", now + 2000)], now),
    ).toBe(now + 2000);
  });

  it("ignores deadlines already passed — the interval owns those", () => {
    expect(soonestDeadline([entry("a", now - 1), entry("b", 0)], now)).toBeNull();
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
