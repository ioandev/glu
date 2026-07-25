"use client";

import { Fragment } from "react";
import { Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { TaskCard } from "./TaskCard";
import { groupBySection, type TodoistSource, type UiTask } from "./types";
import type { TodoistListState } from "./useTodoistList";
import classes from "./todoist.module.css";

export interface TaskListProps {
  source: TodoistSource | null;
  list: TodoistListState;
  onOpen?: (task: UiTask) => void;
  onFocus?: (task: UiTask) => void;
  onComplete?: (task: UiTask) => void;
  /** ADR 14: the focused task is pinned above and excluded from the list. */
  excludeId?: string | null;
  /** ADR 20: optimistically completed ids are filtered from render. */
  completingIds?: Set<string>;
  failedIds?: Set<string>;
}

/**
 * The list states are the part that gets skipped and then bites (ADR 12), so
 * each one is explicit: no source, loading, error, empty, and the truncation
 * line that keeps the 200-task cap honest and visible.
 */
export function TaskList({
  source,
  list,
  onOpen,
  onFocus,
  onComplete,
  excludeId,
  completingIds,
  failedIds,
}: TaskListProps) {
  if (!source || list.gone) {
    return (
      <Text className={classes.hint} data-testid="task-hint">
        Pick a filter, label or project with the tools icon above.
      </Text>
    );
  }

  if (list.phase === "loading") {
    return (
      <Stack gap="xs" className={classes.list} data-testid="task-skeletons">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={52} radius="var(--glu-radius-card)" />
        ))}
      </Stack>
    );
  }

  if (list.phase === "error") {
    return (
      <Stack gap="xs" className={classes.list}>
        {/* Filters are user-authored code: show Todoist's own words. */}
        <Text className={classes.errorText} data-testid="task-error">
          {list.errorMessage ?? "Could not reach Todoist."}
        </Text>
        <UnstyledButton className={classes.toolsButton} onClick={list.reload} aria-label="Retry">
          Retry
        </UnstyledButton>
      </Stack>
    );
  }

  const tasks = list.tasks.filter(
    (task) => task.id !== excludeId && !completingIds?.has(task.id),
  );
  if (tasks.length === 0) {
    return (
      <Text className={classes.hint} data-testid="task-empty">
        Nothing here — {source.name} is clear.
      </Text>
    );
  }

  const groups =
    source.type === "project"
      ? groupBySection(tasks, list.sections)
      : [{ sectionId: null, name: null, tasks }];

  return (
    <div className={classes.list} data-testid="task-list">
      {groups.map((group) => (
        <Fragment key={group.sectionId ?? "__none"}>
          {group.name ? (
            <Text className={classes.sectionHeader} component="div">
              {group.name}
            </Text>
          ) : null}
          {group.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onOpen}
              onFocus={onFocus}
              onComplete={onComplete}
              failed={failedIds?.has(task.id)}
            />
          ))}
        </Fragment>
      ))}
      {list.truncated ? (
        <Text className={classes.truncation} data-testid="task-truncation">
          Showing first {list.cap}
        </Text>
      ) : null}
    </div>
  );
}
