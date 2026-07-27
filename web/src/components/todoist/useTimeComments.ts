"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, apiFetch } from "@/lib/api";
import { activeEnvironmentKeys } from "@/lib/timeComment";
import { onRunEnd, useGluStore } from "@/store/gluStore";
import {
  COMMENT_GRACE_MS,
  commentThresholdMs,
  COMMENT_UNDO_MS,
  MAX_COMMENT_MINUTES,
  type OutboxEntry,
} from "@/store/types";
import { useTodoistAuth } from "@/store/todoistAuth";

/** `round(ranMs / 60s)`, minimum 1, capped at 28 days (ADR 14). */
export function commentMinutes(ranMs: number): number {
  return Math.min(MAX_COMMENT_MINUTES, Math.max(1, Math.round(ranMs / 60_000)));
}

/**
 * ADR 28 amendment: **at least**, not more than. ADR 14 compared strictly
 * greater, which was defensible while the 60 s was a constant nobody could see
 * — but the Settings row says *minimum*, and a run of exactly the minimum has
 * met it. The case that made this obvious is the smallest one the app can
 * produce: a 1-minute timer run to 0:00 accumulates exactly 60 000 ms, and
 * `>` threw it away.
 */
export function qualifies(ranMs: number, thresholdMinutes: number): boolean {
  return ranMs >= commentThresholdMs(thresholdMinutes);
}

/** First retry waits one drain tick; the ceiling keeps a stuck entry cheap. */
export const RETRY_BASE_MS = 2_000;
export const RETRY_CEILING_MS = 5 * 60_000;

/**
 * ADR 14 says a network blip must never lose tracked time, so a failed entry
 * stays queued — but "stays queued" used to mean "retries every 2 s forever",
 * because `attempts` was counted and never read (2026-07-25 security audit,
 * F-4). Exponential backoff keeps the promise without the hot loop.
 */
export function retryDelayMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(RETRY_BASE_MS * 2 ** (attempts - 1), RETRY_CEILING_MS);
}

/**
 * Two gates, and they answer different questions (ADR 14 amendment,
 * 2026-07-25b): `postAfter` is the undo grace — a deadline that passes once and
 * stays passed — while the backoff is a delay measured from the **last
 * attempt**. Anchoring the delay on `postAfter` instead, as the first cut did,
 * un-does the backoff in exactly the two places it matters: past the ceiling
 * `postAfter + 300 s` is permanently in the past, so a stuck entry returns to
 * re-POSTing every drain tick; and `commitOutboxEntry` sets `postAfter` to 0,
 * where every delay is already in the past, so a displaced entry never backs
 * off at all.
 */
export function isDue(entry: OutboxEntry, now: number): boolean {
  if (entry.postAfter > now) return false;
  return (entry.lastAttemptAt ?? 0) + retryDelayMs(entry.attempts) <= now;
}

/**
 * A 4xx that is not "log in again" or "slow down" will never succeed on retry
 * — the task is gone, or the body was rejected. Keeping it queued would retry
 * an impossible write until the tab closes.
 */
export function isPermanentFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401 || error.status === 408 || error.status === 429) return false;
  return error.status >= 400 && error.status < 500;
}

/** A comment that has landed and is still deletable (ADR 14 amendment, c). */
export interface PostedComment {
  runId: string;
  taskId: string;
  minutes: number;
  /** Todoist's id for the created comment — the only thing DELETE accepts. */
  commentId: string;
  postedAt: number;
  error?: string;
}

export interface CommentUndo {
  key: string;
  runId: string;
  minutes: number;
  /** Epoch ms the affordance lapses. */
  until: number;
  phase: "queued" | "posted";
  error?: string;
}

/**
 * One bar across both phases, deliberately: the key never changes, so the
 * handover from "will be added" to "added" is a text swap rather than a
 * dismiss-and-reappear. The queued phase already advertises the full
 * `grace + undo` window, so a slow POST cannot leave a gap in the middle of it.
 */
export function commentUndoMessage(
  queued: OutboxEntry | null,
  posted: PostedComment | null,
): CommentUndo | null {
  if (queued) {
    return {
      key: `comment:${queued.runId}`,
      runId: queued.runId,
      minutes: queued.minutes,
      until: queued.postAfter + COMMENT_UNDO_MS,
      phase: "queued",
    };
  }
  if (posted) {
    return {
      key: `comment:${posted.runId}`,
      runId: posted.runId,
      minutes: posted.minutes,
      until: posted.postedAt + COMMENT_UNDO_MS,
      phase: "posted",
      error: posted.error,
    };
  }
  return null;
}

/**
 * Turns run ends into queued time comments, and drains the queue (ADR 14).
 *
 * "When a timer stops" means **any** run end — finished, stopped, or `n`
 * restart. The metric is `ranMs`, the actual running time accumulated across
 * pauses: `total − remaining` lies the moment ±1/±5 exist.
 */
export function useTimeComments() {
  const t = useTranslations("todoist");
  // Read at *send* time, not at run-end time: a comment can sit in the outbox
  // across a language change, and the sentence should be the one the user reads
  // the app in now (ADR 44).
  const locale = useLocale();
  const focusedTask = useGluStore((s) => s.focusedTask);
  const outbox = useGluStore((s) => s.outbox);
  const enqueue = useGluStore((s) => s.enqueueComment);
  const commit = useGluStore((s) => s.commitOutboxEntry);
  const drop = useGluStore((s) => s.dropOutboxEntry);
  const markAttempt = useGluStore((s) => s.markOutboxAttempt);
  const authStatus = useTodoistAuth((s) => s.status);
  const [totalNonce, setTotalNonce] = useState(0);
  const [posted, setPosted] = useState<PostedComment | null>(null);
  const sending = useRef(new Set<string>());
  const deleting = useRef(false);
  /**
   * Undo follows the gesture, not the queue: only runs that ended in *this*
   * session earn the posted-phase bar. An entry drained on load — a blip
   * retried hours later — posts silently rather than popping an unprompted
   * "Undo" the user never asked for.
   */
  const ownRuns = useRef(new Set<string>());

  // Enqueue on every qualifying run end.
  useEffect(
    () =>
      onRunEnd((event) => {
        const state = useGluStore.getState();
        const task = state.focusedTask;
        // ADR 28: read at run end, like ADR 27's setting and toggles — the
        // question "was this run worth a comment" is answered about the run
        // that just ended, never re-asked when the outbox happens to drain.
        if (!task || !qualifies(event.ranMs, state.commentThresholdMinutes)) return;

        // Queue-of-one: a second qualifying end commits the pending entry
        // immediately, because undo always refers to the thing you just did.
        const pending = useGluStore
          .getState()
          .outbox.filter((entry) => entry.postAfter > Date.now());
        for (const entry of pending) commit(entry.runId);
        // Same rule one phase later: a newer run ends the older comment's
        // delete window rather than stacking a second bar behind it.
        setPosted(null);

        ownRuns.current.add(event.runId);
        // ADR 27: both the setting and the toggles are read *here*, at run end.
        // The outbox retries on a backoff and may drain hours later from
        // another room, so the entry has to carry the room the run happened in
        // (ADR 05's completion snapshot, same six booleans).
        const environment = state.commentEnvironment
          ? activeEnvironmentKeys(state.environment)
          : [];
        enqueue({
          runId: event.runId,
          taskId: task.id,
          minutes: commentMinutes(event.ranMs),
          postAfter: event.endedAt + COMMENT_GRACE_MS,
          attempts: 0,
          ...(environment.length > 0 ? { environment } : {}),
        });
      }),
    [commit, enqueue],
  );

  const drain = useCallback(async () => {
    if (authStatus !== "in") return;
    const now = Date.now();
    const due = useGluStore
      .getState()
      .outbox.filter((entry) => isDue(entry, now) && !sending.current.has(entry.runId));

    for (const entry of due) {
      sending.current.add(entry.runId);
      try {
        const body = await apiFetch<{ posted: boolean; content: string; id: string | null }>(
          "/todoist/comment",
          {
            method: "POST",
            // Absent `environment` means undecorated — an entry from before
            // ADR 27, or a user who said no. Never a fallback to live state:
            // that would file the room you are in now against a run that
            // happened somewhere else.
            body: JSON.stringify({
              taskId: entry.taskId,
              minutes: entry.minutes,
              ...(entry.environment?.length ? { environment: entry.environment } : {}),
              // ADR 44: still enumerated values only — the browser sends a
              // *locale code*, never the sentence. The server owns the words,
              // exactly as ADR 14 left it.
              locale,
            }),
          },
        );
        drop(entry.runId);
        // "Automatically refreshed" is this invalidation, not polling.
        setTotalNonce((n) => n + 1);

        const own = ownRuns.current.delete(entry.runId);
        // No id means no delete verb to aim: the post stands, and the bar
        // simply lapses instead of offering an undo that cannot work.
        if (own && body?.id) {
          setPosted({
            runId: entry.runId,
            taskId: entry.taskId,
            minutes: entry.minutes,
            commentId: body.id,
            postedAt: Date.now(),
          });
        }
      } catch (error) {
        if (isPermanentFailure(error)) {
          // Nothing to preserve: this write can never land (deleted task,
          // rejected body). Retrying it forever is the bug, not the safety.
          drop(entry.runId);
          ownRuns.current.delete(entry.runId);
        } else {
          // A network blip must not lose tracked time: the entry stays queued
          // and retries — now on a backoff — on the next tick, load or focus
          // (ADR 14).
          markAttempt(entry.runId);
        }
      } finally {
        sending.current.delete(entry.runId);
      }
    }
  }, [authStatus, drop, markAttempt, locale]);

  // Drain on load, on focus, and whenever the queue or a grace deadline moves.
  useEffect(() => {
    // `drain` only ever sets state from an async continuation.
    const timer = setInterval(() => void drain(), 2000);
    const onFocus = () => void drain();
    window.addEventListener("focus", onFocus);
    void Promise.resolve().then(drain);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [drain, outbox.length]);

  /**
   * The grace is 2 s and the drain tick is 2 s, so leaving the handover to the
   * interval alone would spend up to half the window still saying "will be
   * added". One timer aimed at the nearest deadline costs nothing and makes
   * the phase flip land where the ADR says it does.
   */
  const nextDeadline = soonestDeadline(outbox);
  useEffect(() => {
    if (nextDeadline === null) return;
    const timer = setTimeout(() => void drain(), Math.max(0, nextDeadline - Date.now()));
    return () => clearTimeout(timer);
  }, [nextDeadline, drain]);

  const pending = outbox.filter((entry) => entry.taskId === focusedTask?.id);

  /**
   * Two mechanics behind one button (ADR 14 amendment, c). Queued: drop the
   * entry, and nothing ever touches the network. Posted: a real DELETE against
   * the comment we just created. Which one runs is decided at click time from
   * live state, so a click landing exactly on the handover still does the right
   * thing.
   */
  const undo = useCallback(
    async (runId: string) => {
      if (useGluStore.getState().outbox.some((entry) => entry.runId === runId)) {
        ownRuns.current.delete(runId);
        drop(runId);
        return;
      }
      if (!posted || posted.runId !== runId || deleting.current) return;

      deleting.current = true;
      try {
        await apiFetch(`/todoist/comment/${encodeURIComponent(posted.commentId)}`, {
          method: "DELETE",
        });
      } catch {
        // Rare: deleted upstream meanwhile, or the shape check refused it. Say
        // so on the bar; never an error screen (ADR 20's posture).
        setPosted({ ...posted, error: t("couldNotUndo") });
        return;
      } finally {
        deleting.current = false;
      }
      setPosted(null);
      setTotalNonce((n) => n + 1);
    },
    [drop, posted, t],
  );

  /** ADR 20's cross-type displacement calls this: commit, never cancel. */
  const commitPending = useCallback(() => {
    const live = useGluStore
      .getState()
      .outbox.filter((entry) => entry.postAfter > Date.now());
    for (const entry of live) commit(entry.runId);
    // A displaced *posted* comment keeps its comment; it only loses the bar.
    setPosted(null);
  }, [commit]);

  return {
    focusedTask,
    commitPending,
    pendingCount: pending.length,
    /** What the undo bar is offering — cancel while queued, delete once posted. */
    undoable: commentUndoMessage(newestInGrace(outbox), posted),
    undo,
    totalNonce,
  };
}

/** The nearest grace deadline still in the future, or null. */
export function soonestDeadline(outbox: OutboxEntry[], now = Date.now()): number | null {
  const future = outbox.map((entry) => entry.postAfter).filter((deadline) => deadline > now);
  return future.length === 0 ? null : Math.min(...future);
}

export function newestInGrace(outbox: OutboxEntry[], now = Date.now()): OutboxEntry | null {
  const live = outbox.filter((entry) => entry.postAfter > now);
  if (live.length === 0) return null;
  return live.reduce((newest, entry) => (entry.postAfter > newest.postAfter ? entry : newest));
}

export interface TimeTotal {
  minutes: number;
  counted: number;
  ignored: number;
  clamped: boolean;
}

/** The server computes the total; the browser only displays it (ADR 14). */
export function useTimeTotal(taskId: string | null, nonce: number): TimeTotal | null {
  const authStatus = useTodoistAuth((s) => s.status);
  const [total, setTotal] = useState<TimeTotal | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      if (!taskId || authStatus !== "in") {
        setTotal(null);
        return;
      }
      try {
        const body = await apiFetch<TimeTotal>(
          `/todoist/task/${encodeURIComponent(taskId)}/time-total`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setTotal(body);
      } catch {
        if (!controller.signal.aborted) setTotal(null);
      }
    })();
    return () => controller.abort();
  }, [taskId, authStatus, nonce]);

  return total;
}
