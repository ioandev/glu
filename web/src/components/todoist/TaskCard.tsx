"use client";

import { Text, UnstyledButton } from "@mantine/core";
import { IconTarget } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { TaskCircle } from "./TaskCircle";
import type { UiTask } from "./types";
import classes from "./todoist.module.css";

export interface TaskCardProps {
  task: UiTask;
  /** ADR 13 wires the tap; ADR 14 adds the focus button. */
  onOpen?: (task: UiTask) => void;
  onFocus?: (task: UiTask) => void;
  /** ADR 20 completes from the priority circle. */
  onComplete?: (task: UiTask) => void;
  completing?: boolean;
  failed?: boolean;
}

/**
 * Todoist's card *anatomy*, not its pixel-perfection (ADR 12): priority circle
 * left, plain-text title, and one ellipsized description line only when there
 * is a description. The circle's colours are Todoist's; the card surface is a
 * chrome token, so brand red never fights a clock palette.
 */
export function TaskCard({
  task,
  onOpen,
  onFocus,
  onComplete,
  completing,
  failed,
}: TaskCardProps) {
  const t = useTranslations("todoist");

  return (
    <div
      className={classes.card}
      data-testid="task-card"
      data-task-id={task.id}
      data-completing={completing || undefined}
    >
      <TaskCircle
        priority={task.uiPriority}
        title={task.title}
        completed={completing}
        onComplete={onComplete ? () => onComplete(task) : undefined}
      />

      {onOpen ? (
        <UnstyledButton
          className={classes.cardBody}
          onClick={() => onOpen(task)}
          aria-label={t("openTask", { title: task.title })}
        >
          <span className={classes.cardTitle}>{task.title}</span>
          {task.description ? (
            <span className={classes.cardDescription}>{task.description}</span>
          ) : null}
        </UnstyledButton>
      ) : (
        <div className={classes.cardBody}>
          <span className={classes.cardTitle}>{task.title}</span>
          {task.description ? (
            <span className={classes.cardDescription}>{task.description}</span>
          ) : null}
        </div>
      )}

      {failed ? (
        <Text component="span" className={classes.cardError} data-testid="task-card-error">
          {t("couldNotComplete")}
        </Text>
      ) : null}

      {onFocus ? (
        <UnstyledButton
          className={classes.focusButton}
          aria-label={t("focusTask", { title: task.title })}
          onClick={() => onFocus(task)}
        >
          <IconTarget size={18} />
        </UnstyledButton>
      ) : null}
    </div>
  );
}
