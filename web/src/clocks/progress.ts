import { formatMmSs, remainingSeconds, SECOND, MINUTE } from "@/lib/time";

export interface ClockProgress {
  /** 0 → nothing elapsed, 1 → the run is over. Continuous, not per-second. */
  elapsedFraction: number;
  /** 1 → the full duration is still ahead, 0 → none is. */
  remainingFraction: number;
  /** mm:ss, from ADR 02's shared formatter — no clock grows its own. */
  time: string;
  minutes: string;
  seconds: string;
  /** The whole seconds the digits show — ceiling-rounded, for discrete units. */
  remainingSeconds: number;
  /** Whole seconds of the run's total. */
  totalSeconds: number;
  /** Whole minutes of the run's total, clamped to a sane unit count. */
  totalMinutes: number;
}

/**
 * Fill direction is decided **once, here**. The design-canvas driver treats its
 * `progress` prop as *elapsed*; GLU's source of truth is *remaining*, and 18
 * hand-rolled inversions is how off-by-one-direction bugs ship (ADR 07).
 *
 * The split of resolutions is decided here too (amended 2026-07-25): the
 * fractions are continuous in milliseconds so geometry moves every frame, the
 * digits stay on ADR 02's ceiling-rounded whole second so they read as a clock.
 * A design that wants discrete units counts them off `remainingSeconds`.
 */
export function clockProgress(remainingMs: number, totalMs: number): ClockProgress {
  const total = Math.max(1, totalMs);
  const remaining = Math.min(total, Math.max(0, remainingMs));
  const remainingFraction = remaining / total;
  const time = formatMmSs(remainingSeconds(remaining));
  const [minutes, seconds] = time.split(":");
  return {
    elapsedFraction: 1 - remainingFraction,
    remainingFraction,
    time,
    minutes,
    seconds,
    remainingSeconds: remainingSeconds(remaining),
    totalSeconds: Math.round(total / SECOND),
    totalMinutes: Math.max(1, Math.round(total / MINUTE)),
  };
}

/**
 * Unit counts derive from the total, capped: a 5-minute run showing 25 dots is a
 * lie, and a 99-minute run must not overflow the layout (ADR 07).
 */
export function unitCount(totalSeconds: number, max = 25): number {
  return Math.min(max, Math.max(1, Math.round(Math.max(1, totalSeconds) / 60)));
}
