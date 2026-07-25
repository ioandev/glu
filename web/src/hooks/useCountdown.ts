"use client";

import { useEffect, useState } from "react";
import { useGluStore } from "@/store/gluStore";
import { remainingSeconds } from "@/lib/time";

/** ADR 02: a foreground display rate, not a timekeeping mechanism. */
export const TICK_MS = 50;

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
 * Selects the timer slice and runs the 50 ms interval that recomputes the
 * display value from `Date.now()`. The value never goes back into the store —
 * that is what keeps localStorage writes on transitions only.
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

    const id = window.setInterval(read, TICK_MS);
    const onVisible = () => read();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
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
