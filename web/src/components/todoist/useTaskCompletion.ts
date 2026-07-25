"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { UNDO_GRACE_MS } from "@/store/types";

export interface CompletionUndo {
  taskId: string;
  title: string;
  /** Epoch ms the undo affordance lapses. */
  until: number;
  error?: string;
}

export interface TaskCompletion {
  /** Ids currently completing or completed-and-undoable — filtered from render. */
  completingIds: Set<string>;
  failedIds: Set<string>;
  pending: CompletionUndo | null;
  complete: (task: { id: string; title: string }) => Promise<void>;
  undo: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Optimistic completion (ADR 20): the circle fills and the card leaves the list
 * instantly; the API call rides behind. Failure reverts in place.
 *
 * Undo is a real `reopen` call, not a cancellation — completion has a native
 * inverse, so unlike ADR 14's comments it lands immediately and is undone
 * rather than withheld.
 */
export function useTaskCompletion(options: {
  onCompleted?: (taskId: string) => void;
  onUndone?: (taskId: string) => void;
  /** Displacing a pending time-comment commits it immediately (ADR 14's rule). */
  onDisplaceOther?: () => void;
} = {}): TaskCompletion {
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<CompletionUndo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { onCompleted, onUndone, onDisplaceOther } = options;

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const complete = useCallback(
    async (task: { id: string; title: string }) => {
      onDisplaceOther?.();
      setFailedIds((prev) => without(prev, task.id));
      // `completingIds` filters *render*, not just the mutation path — a
      // refetch landing between tap and success must not resurrect the card.
      setCompletingIds((prev) => new Set(prev).add(task.id));

      try {
        await apiFetch(`/todoist/task/${encodeURIComponent(task.id)}/close`, { method: "POST" });
      } catch {
        setCompletingIds((prev) => without(prev, task.id));
        setFailedIds((prev) => new Set(prev).add(task.id));
        return;
      }

      onCompleted?.(task.id);
      clearTimer();
      const until = Date.now() + UNDO_GRACE_MS;
      setPending({ taskId: task.id, title: task.title, until });
      timer.current = setTimeout(() => {
        setPending(null);
        // The id stays filtered: the task is genuinely gone from this source.
      }, UNDO_GRACE_MS);
    },
    [onCompleted, onDisplaceOther],
  );

  const undo = useCallback(async () => {
    const entry = pending;
    if (!entry) return;
    clearTimer();
    try {
      await apiFetch(`/todoist/task/${encodeURIComponent(entry.taskId)}/reopen`, {
        method: "POST",
      });
    } catch {
      // Rare: deleted upstream meanwhile. Say so on the bar; the gone-state
      // paths reconcile from there. Never an error screen.
      setPending({ ...entry, error: "Could not undo" });
      return;
    }
    setCompletingIds((prev) => without(prev, entry.taskId));
    setPending(null);
    onUndone?.(entry.taskId);
  }, [pending, onUndone]);

  const dismiss = useCallback(() => {
    clearTimer();
    setPending(null);
  }, []);

  return { completingIds, failedIds, pending, complete, undo, dismiss };
}

function without(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  next.delete(id);
  return next;
}
