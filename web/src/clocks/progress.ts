import { formatMmSs } from "@/lib/time";

export interface ClockProgress {
  /** 0 → nothing elapsed, 1 → the run is over. */
  elapsedFraction: number;
  /** 1 → the full duration is still ahead, 0 → none is. */
  remainingFraction: number;
  /** mm:ss, from ADR 02's shared formatter — no clock grows its own. */
  time: string;
  minutes: string;
  seconds: string;
  /** Whole minutes of the run's total, clamped to a sane unit count. */
  totalMinutes: number;
}

/**
 * Fill direction is decided **once, here**. The design-canvas driver treats its
 * `progress` prop as *elapsed*; GLU's source of truth is *remaining*, and 18
 * hand-rolled inversions is how off-by-one-direction bugs ship (ADR 07).
 */
export function clockProgress(remainingSeconds: number, totalSeconds: number): ClockProgress {
  const total = Math.max(1, Math.round(totalSeconds));
  const remaining = Math.min(total, Math.max(0, Math.round(remainingSeconds)));
  const remainingFraction = remaining / total;
  const time = formatMmSs(remaining);
  const [minutes, seconds] = time.split(":");
  return {
    elapsedFraction: 1 - remainingFraction,
    remainingFraction,
    time,
    minutes,
    seconds,
    totalMinutes: Math.max(1, Math.round(total / 60)),
  };
}

/**
 * Unit counts derive from the total, capped: a 5-minute run showing 25 dots is a
 * lie, and a 99-minute run must not overflow the layout (ADR 07).
 */
export function unitCount(totalSeconds: number, max = 25): number {
  return Math.min(max, Math.max(1, Math.round(Math.max(1, totalSeconds) / 60)));
}
