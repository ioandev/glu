"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useGluStore } from "@/store/gluStore";
import { useTodoistAuth } from "@/store/todoistAuth";
import type { TaskListResponse, TodoistSection, TodoistSource, UiTask } from "./types";

export type ListPhase = "idle" | "loading" | "ready" | "error";

export interface TodoistListState {
  phase: ListPhase;
  tasks: UiTask[];
  sections: TodoistSection[];
  truncated: boolean;
  cap: number;
  /** Todoist's own error text: filters are user-authored code, so a generic
   *  "something went wrong" is useless (ADR 12). */
  errorMessage: string | null;
  /** A source that vanished upstream degrades to the empty hint, not an error. */
  gone: boolean;
  /** A request is in flight *over an already-rendered list* — the refresh
   *  control spins and the tasks stay put, instead of the list collapsing back
   *  to skeletons on every focus and every refresh tap. */
  refreshing: boolean;
  reload: () => void;
}

/**
 * Fetches the selected source's tasks (ADR 12): on source change, on manual
 * refresh, and on window focus. **No polling** — tablet battery and Todoist
 * rate limits, for a list glanced at between pomodoros.
 */
export function useTodoistList(source: TodoistSource | null): TodoistListState {
  const authStatus = useTodoistAuth((s) => s.status);
  const [state, setState] = useState<Omit<TodoistListState, "reload">>({
    phase: "idle",
    tasks: [],
    sections: [],
    truncated: false,
    cap: 200,
    errorMessage: null,
    gone: false,
    refreshing: false,
  });
  const [nonce, setNonce] = useState(0);
  const inFlight = useRef<AbortController | null>(null);
  /** Which source the rendered list belongs to, so a revalidation of the same
   *  source can keep it on screen while a *switch* still shows skeletons. */
  const shownSource = useRef<string | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (authStatus !== "in" || !source) {
      shownSource.current = null;
      setState((prev) => ({
        ...prev,
        phase: "idle",
        tasks: [],
        sections: [],
        gone: false,
        refreshing: false,
      }));
      return;
    }

    // Abort the previous request: switch from a big project to a small label
    // and the big response would otherwise land last and overwrite (ADR 12).
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    const sameSource = shownSource.current === `${source.type}:${source.id}`;
    shownSource.current = `${source.type}:${source.id}`;
    setState((prev) => ({
      ...prev,
      // Skeletons only when there is nothing to keep: a new source, or a list
      // that isn't on screen anyway (idle, error). A refresh of what's already
      // rendered revalidates in place.
      phase: sameSource && prev.phase === "ready" ? "ready" : "loading",
      refreshing: true,
      errorMessage: null,
      gone: false,
    }));

    void (async () => {
      try {
        const query = new URLSearchParams({
          type: source.type,
          id: source.id,
          ...(source.query ? { query: source.query } : {}),
        });
        const [list, sections] = await Promise.all([
          apiFetch<TaskListResponse>(`/todoist/tasks?${query}`, { signal: controller.signal }),
          source.type === "project"
            ? apiFetch<{ items: TodoistSection[] }>(
                `/todoist/sections?projectId=${encodeURIComponent(source.id)}`,
                { signal: controller.signal },
              )
            : Promise.resolve({ items: [] as TodoistSection[] }),
        ]);

        if (controller.signal.aborted) return;
        setState({
          phase: "ready",
          tasks: list.items,
          sections: sections.items,
          truncated: list.truncated,
          cap: list.cap,
          errorMessage: null,
          gone: false,
          refreshing: false,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = error instanceof ApiError ? error.status : 0;
        // A deleted project/filter is not an error screen — it is "pick a
        // source" again (ADR 12).
        const gone = status === 404;
        setState((prev) => ({
          ...prev,
          phase: gone ? "idle" : "error",
          tasks: [],
          gone,
          errorMessage: gone ? null : describe(error),
          refreshing: false,
        }));
      }
    })();

    return () => controller.abort();
  }, [authStatus, source, nonce]);

  // Revalidate when the user comes back to the tab — the real freshness
  // pattern, without polling.
  useEffect(() => {
    if (authStatus !== "in" || !source) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [authStatus, source, reload]);

  return { ...state, reload };
}

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return (error as Error)?.message ?? "Could not reach Todoist.";
}

/** The persisted source lives in the blob (ADR 12's additive field). */
export function useTodoistSource() {
  const source = useGluStore((s) => s.todoistSource);
  const setSource = useGluStore((s) => s.setTodoistSource);
  return { source, setSource };
}
