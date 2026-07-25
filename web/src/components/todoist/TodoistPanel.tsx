"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Stack, UnstyledButton } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useGluStore } from "@/store/gluStore";
import { focusedDescription } from "@/store/types";
import { useTodoistAuth } from "@/store/todoistAuth";
import { FocusedTaskCard } from "./FocusedTaskCard";
import { SourcePicker } from "./SourcePicker";
import { TaskDetail } from "./TaskDetail";
import { TaskList } from "./TaskList";
import { TodoistButton } from "./TodoistButton";
import { UndoBar, type UndoMessage } from "./UndoBar";
import { useTaskCompletion } from "./useTaskCompletion";
import { useTodoistList, useTodoistSource } from "./useTodoistList";
import { useTimeComments, useTimeTotal } from "./useTimeComments";
import classes from "./todoist.module.css";

/**
 * The Todoist region: identity (ADR 11), the task view (ADR 12), the detail
 * (ADR 13) and the focused slot with its time comments (ADR 14).
 *
 * Logged out — or while the status fetch is still `unknown` — it holds exactly
 * the account control and nothing else (ADR 19's no-flash rule).
 */
export function TodoistPanel() {
  const status = useTodoistAuth((s) => s.status);
  const { source, setSource } = useTodoistSource();
  const list = useTodoistList(status === "in" ? source : null);
  // Ephemeral, like every overlay (ADR 10's precedent): a reload opens nothing.
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const setFocusedTask = useGluStore((s) => s.setFocusedTask);
  const { focusedTask, pendingCount, undoable, undo, totalNonce, commitPending } =
    useTimeComments();
  const completion = useTaskCompletion({
    onCompleted: (taskId) => {
      // A completed task is not in the source list any more; the focused slot
      // keeps it for the undo window and then lets it go.
      if (taskId !== focusedTask?.id) list.reload();
    },
    onUndone: () => list.reload(),
    // Cross-type displacement (ADR 20): a completion bar displacing a pending
    // *comment* commits the comment immediately — ADR 14's rule, unchanged.
    onDisplaceOther: commitPending,
  });

  // When the completion undo window lapses on the focused task it auto-
  // unfocuses: nothing returns to the list, because a completed task does not
  // belong to the source list anyway (ADR 20).
  const completionPending = completion.pending;
  const wasCompletingFocused = useRef(false);
  useEffect(() => {
    const focusedId = focusedTask?.id;
    if (!focusedId) return;
    if (completionPending?.taskId === focusedId) {
      wasCompletingFocused.current = true;
      return;
    }
    if (wasCompletingFocused.current && completion.completingIds.has(focusedId)) {
      // The bar lapsed rather than being undone: let the slot go.
      wasCompletingFocused.current = false;
      setFocusedTask(null);
    } else if (!completion.completingIds.has(focusedId)) {
      // Undone: focus is restored exactly as it was.
      wasCompletingFocused.current = false;
    }
  }, [completionPending, focusedTask, completion.completingIds, setFocusedTask]);

  /**
   * One bar, one message, newest wins (ADR 20). A completion message displaces
   * a pending comment (whose entry was already committed); a comment message
   * arriving later merely dismisses the completion's undo affordance — the
   * completion already happened.
   */
  const undoMessage: UndoMessage | null = completionPending
    ? {
        key: `complete:${completionPending.taskId}`,
        text: `Completed · ${completionPending.title}`,
        until: completionPending.until,
        error: completionPending.error,
        onUndo: () => void completion.undo(),
      }
    : undoable
      ? {
          key: undoable.key,
          badge: `[${undoable.minutes}m]`,
          // The same bar before and after the post lands (ADR 14 amendment,
          // c) — only the tense and the mechanic behind Undo change.
          text: undoable.phase === "queued" ? "comment will be added" : "comment added",
          until: undoable.until,
          error: undoable.error,
          onUndo: () => void undo(undoable.runId),
        }
      : null;
  const total = useTimeTotal(focusedTask?.id ?? null, totalNonce);

  // A focused task that vanished upstream renders a gone-state with the unfocus
  // affordance — never an error screen (ADR 12/13's posture).
  const focusedGone =
    Boolean(focusedTask) &&
    list.phase === "ready" &&
    source !== null &&
    !list.tasks.some((task) => task.id === focusedTask!.id);

  return (
    <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
      <Group className={classes.header} wrap="nowrap">
        <TodoistButton />
        <span className={classes.headerSpacer} />
        {status === "in" ? (
          // ADR 12 always specified a manual refresh; until now the only way to
          // ask for one was the error state's Retry or leaving and re-focusing
          // the tab.
          <UnstyledButton
            className={`${classes.toolsButton} ${classes.refreshButton}`}
            aria-label="Refresh tasks"
            aria-busy={list.refreshing}
            data-refreshing={list.refreshing || undefined}
            data-testid="task-refresh"
            disabled={!source || list.refreshing}
            onClick={list.reload}
          >
            <IconRefresh size={20} />
          </UnstyledButton>
        ) : null}
        {status === "in" ? <SourcePicker source={source} onPick={setSource} /> : null}
      </Group>

      {status === "in" && focusedTask ? (
        <FocusedTaskCard
          task={focusedTask}
          totalMinutes={total?.minutes ?? null}
          pendingCount={pendingCount}
          gone={focusedGone}
          completed={completion.completingIds.has(focusedTask.id)}
          onOpen={() => setOpenTaskId(focusedTask.id)}
          onUnfocus={() => setFocusedTask(null)}
          onComplete={() =>
            void completion.complete({ id: focusedTask.id, title: focusedTask.title })
          }
        />
      ) : null}

      {status === "in" ? (
        <TaskList
          source={source}
          list={list}
          excludeId={focusedTask?.id ?? null}
          completingIds={completion.completingIds}
          failedIds={completion.failedIds}
          onComplete={(task) => void completion.complete(task)}
          onOpen={(task) => setOpenTaskId(task.id)}
          onFocus={(task) =>
            setFocusedTask({
              id: task.id,
              title: task.title,
              priority: task.uiPriority,
              description: focusedDescription(task.description),
            })
          }
        />
      ) : null}

      <TaskDetail
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
        // A successful post invalidates two things: the total badge, and — when
        // the detail happens to be open on that task — its comments (ADR 14).
        refreshNonce={openTaskId && openTaskId === focusedTask?.id ? totalNonce : 0}
        completed={openTaskId ? completion.completingIds.has(openTaskId) : false}
        onComplete={(task) => void completion.complete(task)}
      />
      <UndoBar message={undoMessage} />
    </Stack>
  );
}
