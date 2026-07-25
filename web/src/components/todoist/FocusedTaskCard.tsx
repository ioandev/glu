"use client";

import { UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { formatDurationBadge, MINUTE } from "@/lib/time";
import { TaskCircle } from "./TaskCircle";
import type { FocusedTask } from "@/store/types";
import classes from "./todoist.module.css";

/**
 * The pinned task (ADR 14): a card above the list, excluded from the list while
 * focused, carrying the accumulated-time badge and a quiet pending-upload mark.
 */
export function FocusedTaskCard({
  task,
  totalMinutes,
  pendingCount,
  gone,
  completed,
  onOpen,
  onUnfocus,
  onComplete,
}: {
  task: FocusedTask;
  totalMinutes: number | null;
  pendingCount: number;
  gone?: boolean;
  /** ADR 20: stays in the slot, shown completed, for the undo window. */
  completed?: boolean;
  onOpen?: () => void;
  onUnfocus: () => void;
  onComplete?: () => void;
}) {
  return (
    <div className={classes.focusedCard} data-testid="focused-task">
      <div className={classes.focusedTopRow}>
        <span className={classes.focusedLabel}>Focused</span>
        {totalMinutes !== null ? (
          <span className={classes.timeBadge} data-testid="focused-total">
            [{formatDurationBadge(totalMinutes * MINUTE)}]
          </span>
        ) : null}
      </div>

      <div className={classes.focusedMain}>
        <TaskCircle
          priority={task.priority}
          title={task.title}
          completed={completed}
          onComplete={onComplete}
        />
        {onOpen ? (
          <UnstyledButton
            className={classes.focusedTitle}
            onClick={onOpen}
            aria-label={`Open “${task.title}”`}
          >
            {task.title}
          </UnstyledButton>
        ) : (
          <span className={classes.focusedTitle}>{task.title}</span>
        )}
      </div>

      <div className={classes.focusedBottomRow}>
        {gone ? (
          <span className={classes.pendingBadge} data-testid="focused-gone">
            No longer in Todoist
          </span>
        ) : pendingCount > 0 ? (
          <span className={classes.pendingBadge} data-testid="focused-pending">
            {pendingCount} comment{pendingCount === 1 ? "" : "s"} pending
          </span>
        ) : (
          <span />
        )}
        <UnstyledButton
          className={classes.unfocusButton}
          onClick={onUnfocus}
          aria-label={`Unfocus “${task.title}”`}
        >
          <IconX size={16} />
          Unfocus
        </UnstyledButton>
      </div>
    </div>
  );
}
