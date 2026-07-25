export type TimerStatus = "idle" | "running" | "paused" | "finished";

/** How a run stopped being the current run (ADR 02 amendment / ADR 14). */
export type RunEndKind = "finished" | "stopped" | "restarted";

export interface RunEndEvent {
  runId: string;
  /** Actual running time, accumulated across pauses. NOT `total - remaining`. */
  ranMs: number;
  endKind: RunEndKind;
  /** The run's total at the moment it ended. */
  totalMs: number;
  endedAt: number;
}

export const ENVIRONMENT_KEYS = [
  "music",
  "podcast",
  "tv",
  "silence",
  "noisy",
  "headphones",
] as const;

export type EnvironmentKey = (typeof ENVIRONMENT_KEYS)[number];

export type EnvironmentState = Record<EnvironmentKey, boolean>;

/**
 * ADR 02: Silence is exclusive with the four sound environments; Headphones is
 * orthogonal (equipment on your head, not a sound environment).
 */
export const SOUND_ENVIRONMENT_KEYS = ["music", "podcast", "tv", "noisy"] as const;

/** ADR 05: what a completed focus block records. */
export interface SessionRecord {
  endedAt: number;
  /** The run's `total` at completion. */
  durationMs: number;
  /** The environment toggles as they stood at completion time. */
  environment: EnvironmentState;
}

/** A "seating" — reset manually by the New day button, never at midnight. */
export interface DayRecord {
  startedAt: number;
  sessions: SessionRecord[];
}

/** ADR 05: the archive is local-only and capped, permanently (2026-07-24). */
export const ARCHIVE_CAP_DAYS = 90;

/** Session dots cap before the "+N" overflow, so a heroic day cannot break the
 * half-tablet layout. */
export const SESSION_DOT_CAP = 12;

/**
 * ADR 14: a time comment waiting to be posted. Keyed by `runId` (ADR 05's
 * idempotency contract, second consumer) so a run posts at most one comment
 * across retries, reloads and the restored-expired path.
 */
export interface OutboxEntry {
  runId: string;
  taskId: string;
  minutes: number;
  /** Epoch ms; nothing dispatches before this — that is the undo grace. */
  postAfter: number;
  attempts: number;
  /**
   * Epoch ms of the most recent failed send, and the anchor the retry backoff
   * counts from. It cannot be `postAfter`: that timestamp is fixed, so a
   * backoff measured from it expires permanently once the ceiling passes, and
   * `commitOutboxEntry` sets it to 0, where every delay is already in the past
   * (ADR 14 amendment, 2026-07-25b). Absent on entries persisted before the
   * field existed — read it as 0, which costs one immediate retry.
   */
  lastAttemptAt?: number;
}

/** ADR 14: the pinned task. */
export interface FocusedTask {
  id: string;
  title: string;
  priority: 1 | 2 | 3 | 4;
}

/** Silent time loss is worse than a bounded queue. */
export const OUTBOX_CAP = 20;

/** ADR 14: the undo grace before a queued comment may be dispatched. */
export const UNDO_GRACE_MS = 10_000;

/** ADR 14: below this, a run is not worth a comment. */
export const COMMENT_THRESHOLD_MS = 60_000;

/** ADR 14: 28 days, in minutes — the cap on any single comment and the total. */
export const MAX_COMMENT_MINUTES = 40_320;
