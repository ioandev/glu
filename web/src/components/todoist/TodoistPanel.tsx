"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Stack, UnstyledButton } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useGluStore } from "@/store/gluStore";
import { focusedDescription, type FocusedTask } from "@/store/types";
import { useTodoistAuth } from "@/store/todoistAuth";
import { FocusedTaskCard } from "./FocusedTaskCard";
import { PullToRefresh } from "./PullToRefresh";
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
  const t = useTranslations("todoist");
  const { source, setSource } = useTodoistSource();
  const list = useTodoistList(status === "in" ? source : null);
  // Ephemeral, like every overlay (ADR 10's precedent): a reload opens nothing.
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  // ADR 43: the list's scroll container, so the pull gesture can tell "at the
  // top" from "scrolling".
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const setFocusedTask = useGluStore((s) => s.setFocusedTask);
  const { focusedTask, pendingCount, undoable, undo, totalNonce, commitPending } =
    useTimeComments();

  // ADR 35: completing the focused task vacates the slot on tap; this snapshot
  // is what undo — or a failed close — puts back. It restores only if nothing
  // else has been focused meanwhile: a deliberate refocus outranks a revert.
  const completionSnapshot = useRef<FocusedTask | null>(null);
  const restoreFocus = (taskId: string) => {
    const snapshot = completionSnapshot.current;
    if (snapshot?.id !== taskId) return;
    completionSnapshot.current = null;
    if (!useGluStore.getState().focusedTask) setFocusedTask(snapshot);
  };

  const completion = useTaskCompletion({
    onCompleted: () => list.reload(),
    onUndone: (taskId) => {
      restoreFocus(taskId);
      list.reload();
    },
    onFailed: restoreFocus,
    // Cross-type displacement (ADR 20): a completion bar displacing a pending
    // *comment* commits the comment immediately — ADR 14's rule, unchanged.
    onDisplaceOther: commitPending,
  });

  // The snapshot dies with the undo affordance: once the bar lapses or is
  // displaced without an undo, the completion is final and the slot stays
  // empty. (In-flight — pending not yet set — the snapshot must survive for
  // the failure revert, so only a matched-then-gone transition clears it.)
  const completionPending = completion.pending;
  const prevPendingId = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPendingId.current;
    prevPendingId.current = completionPending?.taskId ?? null;
    const snapshot = completionSnapshot.current;
    if (snapshot && prev === snapshot.id && completionPending?.taskId !== snapshot.id) {
      completionSnapshot.current = null;
    }
  }, [completionPending]);

  /**
   * One bar, one message, newest wins (ADR 20). A completion message displaces
   * a pending comment (whose entry was already committed); a comment message
   * arriving later merely dismisses the completion's undo affordance — the
   * completion already happened.
   */
  const undoMessage: UndoMessage | null = completionPending
    ? {
        key: `complete:${completionPending.taskId}`,
        text: t("completed", { title: completionPending.title }),
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
          text: undoable.phase === "queued" ? t("commentWillBeAdded") : t("commentAdded"),
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
            aria-label={t("refreshTasks")}
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
          failed={completion.failedIds.has(focusedTask.id)}
          onOpen={() => setOpenTaskId(focusedTask.id)}
          onUnfocus={() => setFocusedTask(null)}
          onComplete={() => {
            // Vacate first (ADR 35): the tap is the moment the slot empties.
            // `completingIds` keeps the card out of the list even though the
            // unfocus lifts `excludeId` mid-flight.
            completionSnapshot.current = focusedTask;
            setFocusedTask(null);
            void completion.complete({ id: focusedTask.id, title: focusedTask.title });
          }}
        />
      ) : null}

      {status === "in" ? (
        // ADR 43: the pull gesture is a second way to press the header's
        // refresh button — same `reload()`, same `refreshing` flag, so both
        // paths spin and neither collapses the list to skeletons.
        <PullToRefresh
          refreshing={list.refreshing}
          onRefresh={list.reload}
          enabled={source !== null && !list.gone}
          scrollRef={listScrollRef}
        >
          <TaskList
            source={source}
            list={list}
            scrollRef={listScrollRef}
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
        </PullToRefresh>
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
