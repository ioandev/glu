"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { UiTask } from "./types";

export interface UiAttachment {
  kind: "image" | "file";
  fileName: string;
  fileType: string;
  src?: string;
  width?: number;
  height?: number;
}

export interface UiComment {
  id: string;
  text: string;
  postedAt: string;
  postedByUid: string | null;
  attachment: UiAttachment | null;
}

export interface TaskDetailState {
  phase: "loading" | "ready" | "gone" | "error";
  task: (UiTask & { completed?: boolean }) | null;
  comments: UiComment[];
  truncated: boolean;
  cap: number;
  refreshing: boolean;
  errorMessage: string | null;
  refresh: () => void;
}

/**
 * Task + comments, fetched together (ADR 13). Plain hooks still: ADR 12 named
 * *mutations* as the trigger for the query-library conversation, and this view
 * is read-only.
 */
export function useTaskDetail(taskId: string | null, externalNonce = 0): TaskDetailState {
  const [state, setState] = useState<Omit<TaskDetailState, "refresh">>({
    phase: "loading",
    task: null,
    comments: [],
    truncated: false,
    cap: 100,
    refreshing: false,
    errorMessage: null,
  });
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!taskId) return;
    const controller = new AbortController();

    void (async () => {
      setState((prev) => ({
        ...prev,
        phase: prev.task ? prev.phase : "loading",
        refreshing: Boolean(prev.task),
        errorMessage: null,
      }));
      try {
        const [task, comments] = await Promise.all([
          apiFetch<{ task: UiTask & { completed?: boolean } }>(
            `/todoist/task/${encodeURIComponent(taskId)}`,
            { signal: controller.signal },
          ),
          apiFetch<{ items: UiComment[]; truncated: boolean; cap: number }>(
            `/todoist/comments?taskId=${encodeURIComponent(taskId)}`,
            { signal: controller.signal },
          ),
        ]);
        if (controller.signal.aborted) return;
        setState({
          phase: "ready",
          task: task.task,
          comments: comments.items,
          truncated: comments.truncated,
          cap: comments.cap,
          refreshing: false,
          errorMessage: null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = error instanceof ApiError ? error.status : 0;
        setState((prev) => ({
          ...prev,
          // Staleness between list and detail is expected: a task completed or
          // deleted upstream between render and tap is a calm state, not an
          // error screen (ADR 13).
          phase: status === 404 ? "gone" : "error",
          refreshing: false,
          errorMessage:
            status === 404 ? null : ((error as Error).message ?? "Could not reach Todoist."),
        }));
      }
    })();

    return () => controller.abort();
  }, [taskId, nonce, externalNonce]);

  return { ...state, refresh };
}
