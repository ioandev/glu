"use client";

import { Fragment, useState, type RefObject } from "react";
import { Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslations } from "next-intl";
import { TaskCard } from "./TaskCard";
import { sectionRuns, type TodoistSource, type UiTask } from "./types";
import type { TodoistListState } from "./useTodoistList";
import { useGluStore } from "@/store/gluStore";
import { resolveSectionItemLimit, SECTION_ITEM_LIMIT_ALL } from "@/store/types";
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
  /** ADR 43: the pull gesture reads `scrollTop` from here. It is `null` in the
   *  four non-list states, which is correct — they do not scroll, so they are
   *  always at the top and always pullable. */
  scrollRef?: RefObject<HTMLDivElement | null>;
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
  scrollRef,
}: TaskListProps) {
  // ADR 39. Both hooks sit above the five list states because hooks must:
  // `phase === "loading"` returns before any run exists, and React counts the
  // calls, not the renders that use them.
  const sectionItemLimit = useGluStore((s) => s.sectionItemLimit);
  const t = useTranslations("todoist");
  const tError = useTranslations("errors");
  // Per-visit and per-run: a ceiling lifted for one section on Tuesday is not a
  // preference, so this is `useState` and never the blob.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  if (!source || list.gone) {
    return (
      <Text className={classes.hint} data-testid="task-hint">
        {t("pickSourceHint")}
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
        {/* Never the upstream text (ADR 44): `errorMessage` is `apiFetch`'s
            internal `GET /path failed`, which is English and is not copy. */}
        <Text className={classes.errorText} data-testid="task-error">
          {tError("unreachable")}
        </Text>
        <UnstyledButton
          className={classes.toolsButton}
          onClick={list.reload}
          aria-label={t("retry")}
        >
          {t("retry")}
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
        {t("sourceEmpty", { name: source.name })}
      </Text>
    );
  }

  // Projects re-bucket into Todoist's own section_order (a single project has
  // one natural order); filters/labels can span several projects' sections
  // with no single ordering to re-bucket into, so they keep task order and
  // get running headers instead (ADR 12 amendment 2026-07-26). `sectionRuns`
  // holds that split, so what renders is one loop over runs — and ADR 39's
  // ceiling is written once rather than once per view.
  const runs = sectionRuns(source, tasks, list.sections, list.projects);
  const limit = resolveSectionItemLimit(sectionItemLimit);

  const body = runs.map((run) => {
    // The cap lands *after* the focused/completing exclusions above, so
    // completing a visible task promotes a hidden one (ADR 39). Note the
    // explicit compare: `SECTION_ITEM_LIMIT_ALL` is 0, and a falsy test would
    // turn "no ceiling" into "no tasks".
    const capped =
      limit === SECTION_ITEM_LIMIT_ALL || expanded.has(run.key)
        ? run.tasks
        : run.tasks.slice(0, limit);
    const hidden = run.tasks.length - capped.length;
    return (
      <Fragment key={run.key}>
        {run.header ? (
          <Text className={classes.sectionHeader} component="div">
            {run.header}
          </Text>
        ) : null}
        {capped.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onOpen={onOpen}
            onFocus={onFocus}
            onComplete={onComplete}
            failed={failedIds?.has(task.id)}
          />
        ))}
        {hidden > 0 ? (
          <UnstyledButton
            className={classes.sectionMore}
            data-testid={`section-more-${run.key}`}
            onClick={() => setExpanded((current) => new Set(current).add(run.key))}
          >
            {t("moreHidden", { count: hidden })}
          </UnstyledButton>
        ) : null}
      </Fragment>
    );
  });

  return (
    <div ref={scrollRef} className={classes.list} data-testid="task-list">
      {body}
      {list.truncated ? (
        <Text className={classes.truncation} data-testid="task-truncation">
          {t("showingFirst", { count: list.cap })}
        </Text>
      ) : null}
    </div>
  );
}
