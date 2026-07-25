export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

/** Preset durations offered above the clock (ADR 02 — deliberately no 25). */
export const PRESET_MINUTES = [5, 10, 15, 20, 30, 45, 60] as const;

/** ADR 02: default duration is the preset closest to a classic pomodoro. */
export const DEFAULT_DURATION_MS = 20 * MINUTE;

/** ADR 02: `total` never drops below one minute. */
export const MIN_TOTAL_MS = 1 * MINUTE;

/** ADR 07: the clock formatter caps at 99:59 so no design's layout breaks. */
export const MAX_DISPLAY_SECONDS = 99 * 60 + 59;

/** The ladder as milliseconds — membership is the whole definition of "custom". */
const PRESET_DURATIONS_MS: ReadonlySet<number> = new Set(
  PRESET_MINUTES.map((minutes) => minutes * MINUTE),
);

/** ADR 32: is this duration one of the seven the row already offers? */
export function isPresetDuration(ms: number): boolean {
  return PRESET_DURATIONS_MS.has(ms);
}

export interface DurationOption {
  ms: number;
  label: string;
  /** ADR 32: the transient rung, present only while the selection is off-ladder. */
  custom: boolean;
}

/**
 * The preset row's rungs for a given selection (ADR 32): the fixed ladder, plus
 * the selected duration itself when ± has walked it off the ladder — inserted
 * **in order**, because the row reads as a ladder of lengths and a `3m` after
 * `60m` would read as "3 minutes is the longest option".
 *
 * `mm:ss` for a non-whole minute is defensive rather than reachable: presets and
 * ± both move in whole minutes, so only a hand-edited blob gets there — but
 * `${round}m` would label it `20m` next to the real `20m`, which is one
 * ambiguous accessible name away from a test that passes on the wrong button.
 */
export function durationOptions(selectedMs: number): DurationOption[] {
  const ladder = PRESET_MINUTES.map((minutes) => ({
    ms: minutes * MINUTE,
    label: `${minutes}m`,
    custom: false,
  }));
  if (isPresetDuration(selectedMs)) return ladder;
  const label = selectedMs % MINUTE === 0 ? `${selectedMs / MINUTE}m` : formatRemaining(selectedMs);
  return [...ladder, { ms: selectedMs, label, custom: true }].sort((a, b) => a.ms - b.ms);
}

/**
 * Whole seconds remaining, rounded **up** — `floor` would show 19:59 the instant
 * a 20:00 timer starts, which reads as a bug (ADR 02).
 */
export function remainingSeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / SECOND));
}

/**
 * The single mm:ss formatter. Every clock design uses it; none grows its own
 * (ADR 07). Input is seconds, clamped to 99:59.
 */
export function formatMmSs(totalSeconds: number): string {
  const clamped = Math.min(MAX_DISPLAY_SECONDS, Math.max(0, Math.floor(totalSeconds)));
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** Convenience: milliseconds straight to mm:ss with the ceiling rule applied. */
export function formatRemaining(remainingMs: number): string {
  return formatMmSs(remainingSeconds(remainingMs));
}

/**
 * Human duration for the time badge (ADR 14): `42m`, `2h 5m`, clamped at `28d`.
 */
export function formatDurationBadge(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${totalHours}h` : `${totalHours}h ${minutes}m`;
  }
  const days = Math.floor(totalHours / 24);
  if (days >= 28) return "28d";
  const hours = totalHours % 24;
  return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}
