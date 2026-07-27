"use client";

import { UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
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
  failed,
  onOpen,
  onUnfocus,
  onComplete,
}: {
  task: FocusedTask;
  totalMinutes: number | null;
  pendingCount: number;
  gone?: boolean;
  /** ADR 35: a failed close restores the slot, and this is its error mark. */
  failed?: boolean;
  onOpen?: () => void;
  onUnfocus: () => void;
  onComplete?: () => void;
}) {
  const t = useTranslations("todoist");

  // Title + description line, written once: the tap target is a button only when
  // there is a detail to open, exactly like a list card (ADR 12).
  const body = (
    <>
      <span className={classes.focusedTitle}>{task.title}</span>
      {task.description ? (
        <span className={classes.focusedDescription} data-testid="focused-description">
          {task.description}
        </span>
      ) : null}
    </>
  );

  return (
    <div className={classes.focusedCard} data-testid="focused-task">
      <div className={classes.focusedTopRow}>
        <span className={classes.focusedLabel}>{t("focused")}</span>
        {totalMinutes !== null ? (
          <span className={classes.timeBadge} data-testid="focused-total">
            [{formatDurationBadge(totalMinutes * MINUTE)}]
          </span>
        ) : null}
      </div>

      <div className={classes.focusedMain}>
        <TaskCircle priority={task.priority} title={task.title} onComplete={onComplete} />
        {onOpen ? (
          <UnstyledButton
            className={classes.focusedBody}
            onClick={onOpen}
            aria-label={t("openTask", { title: task.title })}
          >
            {body}
          </UnstyledButton>
        ) : (
          <div className={classes.focusedBody}>{body}</div>
        )}
      </div>

      <div className={classes.focusedBottomRow}>
        {gone ? (
          <span className={classes.pendingBadge} data-testid="focused-gone">
            {t("noLongerInTodoist")}
          </span>
        ) : failed ? (
          <span className={classes.cardError} data-testid="focused-error">
            {t("couldNotComplete")}
          </span>
        ) : pendingCount > 0 ? (
          <span className={classes.pendingBadge} data-testid="focused-pending">
            {t("pendingComments", { count: pendingCount })}
          </span>
        ) : (
          <span />
        )}
        <UnstyledButton
          className={classes.unfocusButton}
          onClick={onUnfocus}
          aria-label={t("unfocusTask", { title: task.title })}
        >
          <IconX size={16} />
          {t("unfocus")}
        </UnstyledButton>
      </div>
    </div>
  );
}
