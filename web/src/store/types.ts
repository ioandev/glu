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
  /**
   * ADR 27: the environment toggles that were on **when the run ended**, as
   * enumerated keys. Snapshotted here rather than read at send time because the
   * outbox retries on a backoff and may drain hours later, from another room —
   * ADR 05's completion snapshot applied to the same six booleans. Absent means
   * undecorated, whether that is an entry from before this ADR or a user who
   * turned the setting off; the sender never falls back to live state.
   */
  environment?: EnvironmentKey[];
}

/** ADR 14: the pinned task. */
export interface FocusedTask {
  id: string;
  title: string;
  priority: 1 | 2 | 3 | 4;
  /**
   * ADR 14 amendment (2026-07-25f): the description line survives focusing.
   * Additive and optional — a blob written before this field existed has no
   * snippet, and neither does a task without a description; both read as "no
   * description line", which is exactly the list card's rule (ADR 12).
   */
  description?: string;
}

/**
 * The focused snapshot stores a *snippet*, not the description: the card clamps
 * to two lines and the blob is localStorage, so a 16 kB Todoist description has
 * no business being persisted whole.
 */
export const FOCUSED_DESCRIPTION_CAP = 200;

export function focusedDescription(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? trimmed.slice(0, FOCUSED_DESCRIPTION_CAP) : undefined;
}

/** Silent time loss is worse than a bounded queue. */
export const OUTBOX_CAP = 20;

/**
 * ADR 14 amendment (2026-07-25c): the comment's undo window is two phases, not
 * one. `COMMENT_GRACE_MS` is the cancel window — the entry sits in the outbox
 * and nothing has hit the network yet; `COMMENT_UNDO_MS` is the delete window
 * that follows the post. Ten seconds of "will be added" was long enough that
 * the comment felt withheld rather than recorded.
 */
export const COMMENT_GRACE_MS = 2_000;
export const COMMENT_UNDO_MS = 5_000;

/** ADR 20: how long a completed task stays undoable (a real `reopen`). */
export const COMPLETION_UNDO_MS = 10_000;

/**
 * ADR 14: below this, a run is not worth a comment — **now the user's call**
 * (ADR 28). The ladder is a fixed set of minute values rather than free-form
 * entry: the gate is a coarse "was this worth recording" judgment, and a
 * number field on a tablet buys a keyboard, a validation surface and values
 * like 0 for nothing. ADR 14's hard-coded 60 s survives as the default, so
 * nothing changes for anyone who never opens the row.
 */
export const COMMENT_THRESHOLD_CHOICES = [1, 2, 5, 10, 15] as const;

export const DEFAULT_COMMENT_THRESHOLD_MINUTES = 1;

/**
 * The blob is hand-editable and the ladder may gain or lose a rung between
 * releases, so an unrecognised value reads as the **default** — never as
 * "post nothing" or "post everything". Same posture as `resolveClock` (ADR 08)
 * for a clock id that no longer exists: a preference that stopped making sense
 * falls back to the shipped one.
 */
export function resolveCommentThresholdMinutes(value: unknown): number {
  return (COMMENT_THRESHOLD_CHOICES as readonly unknown[]).includes(value)
    ? (value as number)
    : DEFAULT_COMMENT_THRESHOLD_MINUTES;
}

/** The same gate in milliseconds, resolved on the way out. */
export function commentThresholdMs(minutes: unknown): number {
  return resolveCommentThresholdMinutes(minutes) * 60_000;
}

/** ADR 14: 28 days, in minutes — the cap on any single comment and the total. */
export const MAX_COMMENT_MINUTES = 40_320;
