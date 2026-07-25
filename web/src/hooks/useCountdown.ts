"use client";

import { useEffect, useState } from "react";
import { useGluStore } from "@/store/gluStore";
import { remainingSeconds } from "@/lib/time";

/**
 * ADR 02 (amended 2026-07-25): a hidden tab gets no animation frames, so this
 * interval is the floor — it is what still lands the `finish()` transition (and
 * with it ADR 18's alerts) while the user is elsewhere. It is a safety net, not
 * the display rate.
 */
export const BACKGROUND_TICK_MS = 1_000;

export interface Countdown {
  status: ReturnType<typeof useGluStore.getState>["status"];
  /** Milliseconds left, recomputed from `endAt` — never counted down. */
  remainingMs: number;
  /** Whole seconds left, ceiling-rounded (ADR 02). */
  seconds: number;
  totalMs: number;
  fraction: number;
}

/**
 * Selects the timer slice and repaints the display value from `Date.now()` once
 * per animation frame. The value never goes back into the store — that is what
 * keeps localStorage writes on transitions only.
 *
 * ADR 02 (amended 2026-07-25): the old fixed 50 ms interval is what made the
 * clocks look steppy, and raising its rate would have been the wrong fix.
 * `requestAnimationFrame` is both *finer* (~8–17 ms on a 60–120 Hz panel) and
 * *cheaper*: it is phase-locked to the compositor, so a value is never computed
 * for a frame that will not be drawn, and a device that cannot keep up drops
 * frames instead of queueing work behind them. Every callback still recomputes
 * from the clock, so a dropped frame costs smoothness and never accuracy.
 */
export function useCountdown(): Countdown {
  const status = useGluStore((s) => s.status);
  const endAt = useGluStore((s) => s.endAt);
  const remaining = useGluStore((s) => s.remaining);
  const total = useGluStore((s) => s.total);
  const finish = useGluStore((s) => s.finish);

  // Recompute on mount and on every store transition, so a re-render storm or a
  // visibility change can never leave a stale value on screen.
  const [remainingMs, setRemainingMs] = useState(() =>
    status === "running" && endAt !== null
      ? Math.max(0, endAt - Date.now())
      : Math.max(0, remaining),
  );

  // A transition has to land in the *same* commit that carries it. Reading it
  // only in the effect below left one frame where `status` was already
  // `running` and the value was still the finished run's 0 — a frame long
  // enough for ADR 21's takeover to engage on a run that never crossed the
  // threshold. This is React's "adjust state during render" pattern: the
  // re-render happens before the commit, so no effect ever sees the stale pair.
  //
  // `remaining` is exact at a transition — every store action writes it and
  // `endAt` in one `set` (ADR 02) — so this frame needs no clock read, and
  // render stays pure. The interval below resumes deriving from `endAt`.
  const [carried, setCarried] = useState({ status, endAt, remaining });
  if (carried.status !== status || carried.endAt !== endAt || carried.remaining !== remaining) {
    setCarried({ status, endAt, remaining });
    setRemainingMs(Math.max(0, remaining));
  }

  useEffect(() => {
    const read = () => {
      const now = Date.now();
      const next =
        status === "running" && endAt !== null
          ? Math.max(0, endAt - now)
          : Math.max(0, remaining);
      setRemainingMs(next);
      if (status === "running" && endAt !== null && endAt <= now) finish();
    };

    read();
    if (status !== "running") return;

    let frame = window.requestAnimationFrame(function paint() {
      read();
      frame = window.requestAnimationFrame(paint);
    });
    // The frame loop stops dead on a hidden tab; the interval is what still
    // finishes the run there, and it re-syncs the display on the way back.
    const id = window.setInterval(read, BACKGROUND_TICK_MS);
    const onVisible = () => read();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, endAt, remaining, finish]);

  const totalMs = Math.max(1, total);
  return {
    status,
    remainingMs,
    seconds: remainingSeconds(remainingMs),
    totalMs,
    fraction: Math.min(1, Math.max(0, remainingMs / totalMs)),
  };
}
