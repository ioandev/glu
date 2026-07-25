"use client";

import { UnstyledButton } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { PRIORITY_COLOR } from "./types";
import classes from "./todoist.module.css";

/**
 * The priority circle — and, since ADR 20, the complete button everywhere it
 * appears: list cards, the detail header, the focused slot. One component owns
 * fill-on-tap, the priority ring colour and the 44 px tap halo, so the gesture
 * Todoist trained works in all three places.
 *
 * Without `onComplete` it is an image conveying priority, not a control: an
 * `aria-label` on a role-less element is an axe violation, and inventing a fake
 * button for a dot is worse.
 */
export function TaskCircle({
  priority,
  title,
  completed = false,
  onComplete,
}: {
  priority: 1 | 2 | 3 | 4;
  title: string;
  completed?: boolean;
  onComplete?: () => void;
}) {
  const ring = { borderColor: PRIORITY_COLOR[priority] };

  if (!onComplete) {
    return (
      <span
        className={classes.priorityCircle}
        style={ring}
        data-priority={priority}
        role="img"
        aria-label={`Priority ${priority}`}
      />
    );
  }

  return (
    <UnstyledButton
      className={classes.circleHalo}
      aria-label={`Complete “${title}”`}
      aria-pressed={completed}
      onClick={onComplete}
      data-completed={completed || undefined}
    >
      <span
        className={classes.priorityCircle}
        style={{
          ...ring,
          background: completed ? PRIORITY_COLOR[priority] : "transparent",
        }}
        data-priority={priority}
      >
        {completed ? <IconCheck size={12} color="#fff" /> : null}
      </span>
    </UnstyledButton>
  );
}
