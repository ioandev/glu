import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import type { OutboxEntry } from "@/store/types";
import {
  RETRY_BASE_MS,
  RETRY_CEILING_MS,
  isDue,
  isPermanentFailure,
  retryDelayMs,
} from "./useTimeComments";

/**
 * The 2026-07-25 security audit's F-4: `attempts` was counted and never read,
 * so a failing entry re-POSTed every 2 s for as long as the tab stayed open
 * (ADR 14 amendment).
 */

const entry = (over: Partial<OutboxEntry> = {}): OutboxEntry => ({
  runId: "r1",
  taskId: "t1",
  minutes: 25,
  postAfter: 1_000,
  attempts: 0,
  ...over,
});

describe("retry backoff (ADR 14 amendment)", () => {
  it("does not delay the first send at all", () => {
    expect(retryDelayMs(0)).toBe(0);
    expect(isDue(entry({ attempts: 0 }), 1_000)).toBe(true);
  });

  it("doubles each failure and then stops at the ceiling", () => {
    expect(retryDelayMs(1)).toBe(RETRY_BASE_MS);
    expect(retryDelayMs(2)).toBe(RETRY_BASE_MS * 2);
    expect(retryDelayMs(3)).toBe(RETRY_BASE_MS * 4);
    expect(retryDelayMs(20)).toBe(RETRY_CEILING_MS);
    // Never unbounded, however long the tab stays open.
    expect(retryDelayMs(1_000)).toBe(RETRY_CEILING_MS);
  });

  it("holds a failed entry back until its backoff elapses", () => {
    const failed = entry({ attempts: 3, lastAttemptAt: 10_000 }); // 8 s
    expect(isDue(failed, 17_999)).toBe(false);
    expect(isDue(failed, 18_000)).toBe(true);
  });

  it("still never loses the entry — backoff delays, it does not drop", () => {
    const failed = entry({ attempts: 50, lastAttemptAt: 10_000 });
    expect(isDue(failed, 10_000 + RETRY_CEILING_MS)).toBe(true);
  });

  it("keeps backing off past the ceiling instead of going hot again", () => {
    // The regression: measured from the fixed `postAfter`, `postAfter + 300 s`
    // is permanently in the past once it passes, so the most-stuck entry —
    // the one at the ceiling — was the one that re-POSTed every drain tick.
    const stuck = entry({ attempts: 50, lastAttemptAt: 10_000 });
    const anHourLater = 10_000 + 60 * 60_000;
    expect(isDue(stuck, anHourLater)).toBe(true);

    const retried = { ...stuck, attempts: 51, lastAttemptAt: anHourLater };
    expect(isDue(retried, anHourLater + 2_000)).toBe(false);
    expect(isDue(retried, anHourLater + RETRY_CEILING_MS)).toBe(true);
  });

  it("backs off a committed entry too, whose postAfter is 0", () => {
    // Commit-on-displace (a second qualifying run end) zeroes `postAfter`.
    // Anchored there, `0 + delay` is in the past for every delay, so this
    // entry never backed off at all.
    const displaced = entry({ postAfter: 0, attempts: 4, lastAttemptAt: 10_000 });
    expect(isDue(displaced, 10_000 + retryDelayMs(4) - 1)).toBe(false);
    expect(isDue(displaced, 10_000 + retryDelayMs(4))).toBe(true);
  });

  it("sends an entry persisted before the field existed once, then backs off", () => {
    // `lastAttemptAt` is additive: a v2 blob written yesterday has attempts but
    // no stamp. Reading it as 0 costs one immediate retry, which then stamps
    // it — 0 plus any delay is decades behind a real epoch `now`.
    const now = Date.parse("2026-07-25T12:00:00Z");
    const legacy = entry({ postAfter: now - 60_000, attempts: 6 });
    expect(legacy.lastAttemptAt).toBeUndefined();
    expect(isDue(legacy, now)).toBe(true);

    const stamped = { ...legacy, attempts: 7, lastAttemptAt: now };
    expect(isDue(stamped, now + 2_000)).toBe(false);
  });
});

describe("permanent vs transient failure", () => {
  it("treats a 4xx as permanent — the write can never land", () => {
    expect(isPermanentFailure(new ApiError("gone", 404))).toBe(true);
    expect(isPermanentFailure(new ApiError("bad", 400))).toBe(true);
    expect(isPermanentFailure(new ApiError("refused", 403))).toBe(true);
  });

  it("keeps retrying the ones that can still succeed", () => {
    // 401 → the user logs back in; 429/408 → literally "try later".
    expect(isPermanentFailure(new ApiError("unauthenticated", 401))).toBe(false);
    expect(isPermanentFailure(new ApiError("slow down", 429))).toBe(false);
    expect(isPermanentFailure(new ApiError("timeout", 408))).toBe(false);
    // Upstream Todoist trouble relayed by the proxy.
    expect(isPermanentFailure(new ApiError("upstream", 502))).toBe(false);
    // A network blip is not an ApiError at all — ADR 14's protected case.
    expect(isPermanentFailure(new TypeError("Failed to fetch"))).toBe(false);
  });
});
