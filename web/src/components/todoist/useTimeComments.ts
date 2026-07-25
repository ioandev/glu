"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { onRunEnd, useGluStore } from "@/store/gluStore";
import {
  COMMENT_THRESHOLD_MS,
  MAX_COMMENT_MINUTES,
  UNDO_GRACE_MS,
  type OutboxEntry,
} from "@/store/types";
import { useTodoistAuth } from "@/store/todoistAuth";

/** `round(ranMs / 60s)`, minimum 1, capped at 28 days (ADR 14). */
export function commentMinutes(ranMs: number): number {
  return Math.min(MAX_COMMENT_MINUTES, Math.max(1, Math.round(ranMs / 60_000)));
}

export function qualifies(ranMs: number): boolean {
  // Strictly greater: 60 s exactly does not post.
  return ranMs > COMMENT_THRESHOLD_MS;
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

/**
 * Turns run ends into queued time comments, and drains the queue (ADR 14).
 *
 * "When a timer stops" means **any** run end — finished, stopped, or `n`
 * restart. The metric is `ranMs`, the actual running time accumulated across
 * pauses: `total − remaining` lies the moment ±2/±5 exist.
 */
export function useTimeComments() {
  const focusedTask = useGluStore((s) => s.focusedTask);
  const outbox = useGluStore((s) => s.outbox);
  const enqueue = useGluStore((s) => s.enqueueComment);
  const commit = useGluStore((s) => s.commitOutboxEntry);
  const drop = useGluStore((s) => s.dropOutboxEntry);
  const markAttempt = useGluStore((s) => s.markOutboxAttempt);
  const authStatus = useTodoistAuth((s) => s.status);
  const [totalNonce, setTotalNonce] = useState(0);
  const sending = useRef(new Set<string>());

  // Enqueue on every qualifying run end.
  useEffect(
    () =>
      onRunEnd((event) => {
        const task = useGluStore.getState().focusedTask;
        if (!task || !qualifies(event.ranMs)) return;

        // Queue-of-one: a second qualifying end commits the pending entry
        // immediately, because undo always refers to the thing you just did.
        const pending = useGluStore
          .getState()
          .outbox.filter((entry) => entry.postAfter > Date.now());
        for (const entry of pending) commit(entry.runId);

        enqueue({
          runId: event.runId,
          taskId: task.id,
          minutes: commentMinutes(event.ranMs),
          postAfter: event.endedAt + UNDO_GRACE_MS,
          attempts: 0,
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
        await apiFetch("/todoist/comment", {
          method: "POST",
          body: JSON.stringify({ taskId: entry.taskId, minutes: entry.minutes }),
        });
        drop(entry.runId);
        // "Automatically refreshed" is this invalidation, not polling.
        setTotalNonce((n) => n + 1);
      } catch (error) {
        if (isPermanentFailure(error)) {
          // Nothing to preserve: this write can never land (deleted task,
          // rejected body). Retrying it forever is the bug, not the safety.
          drop(entry.runId);
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
  }, [authStatus, drop, markAttempt]);

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

  const pending = outbox.filter((entry) => entry.taskId === focusedTask?.id);
  const inGrace = newestInGrace(outbox);

  /** ADR 20's cross-type displacement calls this: commit, never cancel. */
  const commitPending = useCallback(() => {
    const live = useGluStore
      .getState()
      .outbox.filter((entry) => entry.postAfter > Date.now());
    for (const entry of live) commit(entry.runId);
  }, [commit]);

  return {
    focusedTask,
    commitPending,
    pendingCount: pending.length,
    /** The entry the undo bar is offering to cancel, if any. */
    undoable: inGrace,
    undo: (runId: string) => drop(runId),
    totalNonce,
  };
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
