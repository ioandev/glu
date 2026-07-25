"use client";

import {
  Divider,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { TodoistLogin } from "@/components/todoist/TodoistLogin";
import {
  activeEnvironmentKeys,
  previewMinutes,
  previewTimeComment,
  SAMPLE_ENVIRONMENT,
} from "@/lib/timeComment";
import { useGluStore } from "@/store/gluStore";
import { useTodoistAuth } from "@/store/todoistAuth";
import { COMMENT_THRESHOLD_CHOICES, resolveCommentThresholdMinutes } from "@/store/types";
import classes from "./settings.module.css";

/**
 * The Settings surface (ADR 19). Deliberately a **section list**: each penciled
 * setting — chrome direction (15), archive export (05), alert volume (18),
 * takeover threshold (21) — becomes one more row plus an amendment, not a
 * layout renegotiation. Screen was the first to land; Time comments (ADR 27)
 * is the second, and the first section whose content is app *data* rather than
 * app state.
 */
export function SettingsContent() {
  const status = useTodoistAuth((s) => s.status);
  const name = useTodoistAuth((s) => s.name);
  const logout = useTodoistAuth((s) => s.logout);
  const stayAwakeAlways = useGluStore((s) => s.stayAwakeAlways);
  const stayAwakeWhileRunning = useGluStore((s) => s.stayAwakeWhileRunning);
  const setStayAwakeAlways = useGluStore((s) => s.setStayAwakeAlways);
  const setStayAwakeWhileRunning = useGluStore((s) => s.setStayAwakeWhileRunning);
  const commentEnvironment = useGluStore((s) => s.commentEnvironment);
  const setCommentEnvironment = useGluStore((s) => s.setCommentEnvironment);
  const commentThresholdMinutes = useGluStore((s) => s.commentThresholdMinutes);
  const setCommentThresholdMinutes = useGluStore((s) => s.setCommentThresholdMinutes);
  const environment = useGluStore((s) => s.environment);
  const selectedDuration = useGluStore((s) => s.selectedDuration);

  // Composed from the *live* toggles and the *user's own* preset, so the
  // preview is their next comment rather than a mock-up (ADR 27). With nothing
  // toggled there is no next comment to show, so it borrows a sample and says
  // so — the switch has to demonstrate itself before the chips are pressed,
  // not after (ADR 27 amendment).
  const keys = activeEnvironmentKeys(environment);
  const sampled = keys.length === 0;
  const minutes = previewMinutes(selectedDuration);
  const decorated = previewTimeComment(minutes, sampled ? SAMPLE_ENVIRONMENT : keys);
  const plain = previewTimeComment(minutes, []);

  // Resolved on read as well as on write (ADR 28): a hand-edited blob must not
  // leave the ladder with nothing selected.
  const threshold = resolveCommentThresholdMinutes(commentThresholdMinutes);

  return (
    <Stack gap="lg" className={classes.sections}>
      <section aria-label="Todoist settings">
        <Text className={classes.sectionTitle}>Todoist</Text>
        <Divider className={classes.divider} />

        {/* `unknown` renders neither state: no logged-in chrome may flash while
            the status fetch is in flight (ADR 19). */}
        {status === "unknown" ? (
          <div className={classes.row} data-testid="settings-todoist-unknown" />
        ) : status === "in" ? (
          <Group className={classes.row} justify="space-between" wrap="nowrap">
            <Text size="sm" data-testid="settings-account-name">
              Signed in as {name ?? "your Todoist account"}
            </Text>
            {/* No confirmation: re-login is one tap, so this guards an
                inconvenience, not a loss (contrast ADR 05's New day). */}
            <UnstyledButton className={classes.action} onClick={() => void logout()}>
              Log out
            </UnstyledButton>
          </Group>
        ) : (
          <Group className={classes.row}>
            {/* The same component the top-right area renders — one brand
                treatment to maintain, not a lookalike. */}
            <TodoistLogin />
          </Group>
        )}
      </section>

      <section aria-label="Screen settings">
        <Text className={classes.sectionTitle}>Screen</Text>
        <Divider className={classes.divider} />

        <Stack gap="xs">
          {/* The wider of the two: it subsumes the run policy by construction,
              so nothing here has to reconcile the pair (ADR 17 amendment). */}
          <Switch
            className={classes.switch}
            size="md"
            label="Stay awake on the website"
            description="Keeps the screen on for as long as GLU is open, timer or no timer."
            /* Mantine's `<label>` wraps the description too, so without this the
               accessible name swallows it — and `aria-describedby` then reads it
               out a second time. */
            aria-label="Stay awake on the website"
            checked={stayAwakeAlways}
            onChange={(event) => setStayAwakeAlways(event.currentTarget.checked)}
            data-testid="setting-stay-awake-always"
          />
          <Switch
            className={classes.switch}
            size="md"
            label="Stay awake when the timer is running"
            description="Keeps it on during a run, and for five minutes after it pauses or ends."
            aria-label="Stay awake when the timer is running"
            checked={stayAwakeWhileRunning}
            onChange={(event) => setStayAwakeWhileRunning(event.currentTarget.checked)}
            data-testid="setting-stay-awake-running"
          />
        </Stack>
      </section>

      <section aria-label="Time comment settings">
        <Text className={classes.sectionTitle}>Time comments</Text>
        <Divider className={classes.divider} />

        <Stack gap="xs">
          {/* Whether a run is logged at all comes before what the sentence
              says, so the ladder sits above the switch and its previews —
              which stay adjacent, because the previews belong to the switch. */}
          <div className={classes.field} data-testid="setting-comment-threshold">
            <Text component="span" className={classes.fieldLabel} id="comment-threshold-label">
              Minimum time to log
            </Text>
            <Text component="span" className={classes.fieldDescription}>
              A run shorter than this posts no comment on the focused task.
            </Text>
            <SegmentedControl
              fullWidth
              className={classes.segmented}
              /* The visible label *is* the accessible name — `aria-label` here
                 would be a second, invisible copy to keep in sync. */
              aria-labelledby="comment-threshold-label"
              value={String(threshold)}
              onChange={(value) => setCommentThresholdMinutes(Number(value))}
              data={COMMENT_THRESHOLD_CHOICES.map((choice) => ({
                value: String(choice),
                label: `${choice} min`,
              }))}
            />
          </div>

          <Switch
            className={classes.switch}
            size="md"
            label="Say how you worked"
            description="Adds your environment toggles to the comment GLU posts on the focused task."
            aria-label="Say how you worked"
            checked={commentEnvironment}
            onChange={(event) => setCommentEnvironment(event.currentTarget.checked)}
            data-testid="setting-comment-environment"
          />

          {/* The brief's "so the user knows": a description would describe the
              feature, a preview shows the artifact. Both states are always
              visible — the switch's effect is the difference between them. */}
          <div className={classes.previews} data-testid="comment-previews">
            <Preview
              label="On"
              text={decorated}
              active={commentEnvironment}
              sampled={sampled}
              testId="comment-preview-on"
            />
            <Preview
              label="Off"
              text={plain}
              active={!commentEnvironment}
              testId="comment-preview-off"
            />
          </div>

          {/* Borrowed words have to be labelled as borrowed, or the preview is
              a small lie about what the next comment will say. */}
          {sampled && (
            <Text size="xs" c="dimmed" data-testid="comment-preview-note">
              No environment toggles are on yet — the example shows what Music
              and Headphones would look like.
            </Text>
          )}
        </Stack>
      </section>
    </Stack>
  );
}

/**
 * One sample comment. `Now` marks the one the switch currently selects, and it
 * is only ever claimed when the sentence is the real next comment — a borrowed
 * environment says `Example` instead, because "Now" on invented words would be
 * a small lie.
 */
function Preview({
  label,
  text,
  active,
  sampled = false,
  testId,
}: {
  label: string;
  text: string;
  active: boolean;
  sampled?: boolean;
  testId: string;
}) {
  return (
    <div
      className={`${classes.preview} ${active ? classes.previewActive : ""}`}
      data-testid={testId}
      data-active={active}
      data-sampled={sampled}
    >
      <span className={classes.previewLabel}>
        {sampled ? `${label} · Example` : active ? `${label} · Now` : label}
      </span>
      {/* Long sentences in a narrow modal: they wrap, they never ellipsize. */}
      <span className={classes.previewText} data-testid={`${testId}-text`}>
        {text}
      </span>
    </div>
  );
}
