"use client";

import { ActionIcon, Drawer, Modal, Skeleton, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconRefresh } from "@tabler/icons-react";
import { TaskCircle } from "./TaskCircle";
import { useTaskDetail, type TaskDetailState } from "./useTaskDetail";
import classes from "./todoist.module.css";

/**
 * The read-only task detail (ADR 13).
 *
 * Below `sm` a full-screen modal, at/above a right-side drawer — the container
 * is responsive furniture, the content is written once, and crossing the
 * breakpoint while open loses nothing because the *child* owns the fetch state.
 */
export function TaskDetail({
  taskId,
  onClose,
  refreshNonce = 0,
  onComplete,
  completed,
}: {
  taskId: string | null;
  onClose: () => void;
  onComplete?: (task: { id: string; title: string }) => void;
  completed?: boolean;
  /** ADR 14: bumped after a successful comment post, so an open detail on that
   *  task picks the new comment up without pressing its refresh button. */
  refreshNonce?: number;
}) {
  const fullScreen = useMediaQuery("(max-width: 48em)") ?? false;
  const detail = useTaskDetail(taskId, refreshNonce);
  const opened = taskId !== null;

  const body = (
    <TaskDetailBody
      detail={detail}
      onClose={onClose}
      onComplete={onComplete}
      completed={completed}
    />
  );
  const shared = {
    opened,
    onClose,
    title: "Task",
    classNames: { content: classes.detailPanel, header: classes.detailHeader },
    closeButtonProps: { "aria-label": "Close task" },
    transitionProps: { duration: 0 },
  } as const;

  return fullScreen ? (
    <Modal {...shared} fullScreen>
      {body}
    </Modal>
  ) : (
    <Drawer {...shared} position="right" size={420}>
      {body}
    </Drawer>
  );
}

export function TaskDetailBody({
  detail,
  onClose,
  onComplete,
  completed,
}: {
  detail: TaskDetailState;
  onClose: () => void;
  /** ADR 20: the same circle, the same gesture, in the detail header. */
  onComplete?: (task: { id: string; title: string }) => void;
  completed?: boolean;
}) {
  if (detail.phase === "loading") {
    return (
      <Stack gap="sm" data-testid="detail-skeletons">
        <Skeleton height={28} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </Stack>
    );
  }

  if (detail.phase === "gone") {
    return (
      <Stack gap="sm" data-testid="detail-gone">
        <Text size="sm">This task no longer exists in Todoist.</Text>
        <button type="button" className={classes.detailAction} onClick={onClose}>
          Close
        </button>
      </Stack>
    );
  }

  if (detail.phase === "error" || !detail.task) {
    return (
      <Stack gap="sm" data-testid="detail-error">
        <Text size="sm">{detail.errorMessage ?? "Could not reach Todoist."}</Text>
        <button type="button" className={classes.detailAction} onClick={detail.refresh}>
          Retry
        </button>
      </Stack>
    );
  }

  const task = detail.task;

  return (
    <Stack gap="md" data-testid="task-detail">
      <div className={classes.detailTitleRow}>
        <TaskCircle
          priority={task.uiPriority}
          title={task.title}
          completed={completed}
          onComplete={onComplete ? () => onComplete({ id: task.id, title: task.title }) : undefined}
        />
        <Text className={classes.detailTitle}>{task.title}</Text>
        <ActionIcon
          variant="subtle"
          size={44}
          aria-label="Refresh task"
          loading={detail.refreshing}
          onClick={detail.refresh}
        >
          <IconRefresh size={20} />
        </ActionIcon>
      </div>

      {task.description ? (
        // Plain text with line breaks preserved — no markdown engine in v1,
        // which is also the XSS posture (ADR 13).
        <Text className={classes.detailDescription} data-testid="detail-description">
          {task.description}
        </Text>
      ) : null}

      <Text className={classes.sectionHeader} component="div">
        Comments · oldest first
      </Text>

      {detail.comments.length === 0 ? (
        <Text size="sm" c="dimmed" data-testid="detail-no-comments">
          No comments yet.
        </Text>
      ) : (
        detail.comments.map((comment) => (
          <div key={comment.id} className={classes.comment} data-testid="comment">
            <Text size="xs" c="dimmed">
              {formatTimestamp(comment.postedAt)}
            </Text>
            {comment.text ? <Text size="sm">{comment.text}</Text> : null}

            {comment.attachment?.kind === "image" && comment.attachment.src ? (
              // Reserved space from the attachment's own metadata: without it,
              // late-loading images shove the thread around (ADR 13).
              <div
                className={classes.commentImageBox}
                style={{
                  aspectRatio:
                    comment.attachment.width && comment.attachment.height
                      ? `${comment.attachment.width} / ${comment.attachment.height}`
                      : "16 / 10",
                }}
              >
                {/* Same-origin by construction: every byte comes through the
                    hardened proxy, never from a Todoist host (ADR 13). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comment.attachment.src}
                  alt={comment.attachment.fileName}
                  loading="lazy"
                  className={classes.commentImage}
                  data-testid="comment-image"
                />
              </div>
            ) : comment.attachment ? (
              <Text size="xs" c="dimmed" data-testid="comment-file">
                {comment.attachment.fileName}
                {comment.attachment.fileType ? ` · ${comment.attachment.fileType}` : ""}
              </Text>
            ) : null}
          </div>
        ))
      )}

      {detail.truncated ? (
        <Text className={classes.truncation} data-testid="detail-truncation">
          Showing first {detail.cap}
        </Text>
      ) : null}
    </Stack>
  );
}

function formatTimestamp(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace("T", " ").slice(0, 16);
}
