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
import { useLocale, useTranslations } from "next-intl";
import { AlertSoundRows } from "@/components/settings/AlertSoundRows";
import { LanguageRow } from "@/components/settings/LanguageRow";
import { NotificationRow } from "@/components/settings/NotificationRow";
import { TodoistLogin } from "@/components/todoist/TodoistLogin";
import {
  activeEnvironmentKeys,
  previewMinutes,
  previewTimeComment,
  SAMPLE_ENVIRONMENT,
} from "@/lib/timeComment";
import { useGluStore } from "@/store/gluStore";
import { useTodoistAuth } from "@/store/todoistAuth";
import {
  COMMENT_THRESHOLD_CHOICES,
  resolveCommentThresholdMinutes,
  resolveSectionItemLimit,
  SECTION_ITEM_LIMIT_ALL,
  SECTION_ITEM_LIMIT_CHOICES,
} from "@/store/types";
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
  const t = useTranslations("settings");
  const tLanguage = useTranslations("language");
  // The sample environment's two names come from the chips' own namespace, so
  // the note can never drift from what the toggles are called (ADR 44).
  const tEnv = useTranslations("environment");
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
  const sectionItemLimit = useGluStore((s) => s.sectionItemLimit);
  const setSectionItemLimit = useGluStore((s) => s.setSectionItemLimit);
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
  // The preview is only honest if it is in the language the server will write
  // in, which is the one the app is being read in (ADR 44).
  const commentLocale = useLocale();
  const decorated = previewTimeComment(minutes, sampled ? SAMPLE_ENVIRONMENT : keys, commentLocale);
  const plain = previewTimeComment(minutes, [], commentLocale);

  // Resolved on read as well as on write (ADR 28): a hand-edited blob must not
  // leave the ladder with nothing selected.
  const threshold = resolveCommentThresholdMinutes(commentThresholdMinutes);
  const itemLimit = resolveSectionItemLimit(sectionItemLimit);

  return (
    <Stack gap="lg" className={classes.sections}>
      {/* ADR 44, and deliberately the **first** section: it is the one setting a
          user might need while unable to read any of the others, so it must be
          findable without reading the panel. */}
      <section aria-label={tLanguage("sectionAriaLabel")}>
        <Text className={classes.sectionTitle}>{tLanguage("sectionTitle")}</Text>
        <Divider className={classes.divider} />

        <LanguageRow />
      </section>

      <section aria-label={t("todoistAriaLabel")}>
        <Text className={classes.sectionTitle}>{t("todoistTitle")}</Text>
        <Divider className={classes.divider} />

        {/* `unknown` renders neither state: no logged-in chrome may flash while
            the status fetch is in flight (ADR 19). */}
        {status === "unknown" ? (
          <div className={classes.row} data-testid="settings-todoist-unknown" />
        ) : status === "in" ? (
          <Group className={classes.row} justify="space-between" wrap="nowrap">
            <Text size="sm" data-testid="settings-account-name">
              {t("signedInAs", { name: name ?? t("signedInFallbackName") })}
            </Text>
            {/* No confirmation: re-login is one tap, so this guards an
                inconvenience, not a loss (contrast ADR 05's New day). */}
            <UnstyledButton className={classes.action} onClick={() => void logout()}>
              {t("logOut")}
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

      {/* ADR 39. Its own section rather than a row under Todoist: that one is
          about the account, this one is about the list. */}
      <section aria-label={t("tasksAriaLabel")}>
        <Text className={classes.sectionTitle}>{t("tasksTitle")}</Text>
        <Divider className={classes.divider} />

        <div className={classes.field} data-testid="setting-section-item-limit">
          <Text component="span" className={classes.fieldLabel} id="section-item-limit-label">
            {t("sectionItemLimitLabel")}
          </Text>
          <Text component="span" className={classes.fieldDescription}>
            {t("sectionItemLimitDescription")}
          </Text>
          <SegmentedControl
            fullWidth
            className={classes.segmented}
            aria-labelledby="section-item-limit-label"
            value={String(itemLimit)}
            onChange={(value) => setSectionItemLimit(Number(value))}
            data={SECTION_ITEM_LIMIT_CHOICES.map((choice) => ({
              value: String(choice),
              // The 0 rung is the *absence* of a ceiling, so it says so in
              // words — "0" on a limit reads as "show nothing".
              label:
                choice === SECTION_ITEM_LIMIT_ALL
                  ? t("sectionItemLimitAll")
                  : String(choice),
            }))}
          />
        </div>
      </section>

      <section aria-label={t("screenAriaLabel")}>
        <Text className={classes.sectionTitle}>{t("screenTitle")}</Text>
        <Divider className={classes.divider} />

        <Stack gap="xs">
          {/* The wider of the two: it subsumes the run policy by construction,
              so nothing here has to reconcile the pair (ADR 17 amendment). */}
          <Switch
            className={classes.switch}
            size="md"
            label={t("stayAwakeAlwaysLabel")}
            description={t("stayAwakeAlwaysDescription")}
            /* Mantine's `<label>` wraps the description too, so without this the
               accessible name swallows it — and `aria-describedby` then reads it
               out a second time. */
            aria-label={t("stayAwakeAlwaysLabel")}
            checked={stayAwakeAlways}
            onChange={(event) => setStayAwakeAlways(event.currentTarget.checked)}
            data-testid="setting-stay-awake-always"
          />
          <Switch
            className={classes.switch}
            size="md"
            label={t("stayAwakeRunningLabel")}
            description={t("stayAwakeRunningDescription")}
            aria-label={t("stayAwakeRunningLabel")}
            checked={stayAwakeWhileRunning}
            onChange={(event) => setStayAwakeWhileRunning(event.currentTarget.checked)}
            data-testid="setting-stay-awake-running"
          />
        </Stack>
      </section>

      <section aria-label={t("alertsAriaLabel")}>
        <Text className={classes.sectionTitle}>{t("alertsTitle")}</Text>
        <Divider className={classes.divider} />

        {/* First in the section (ADR 41 amendment). It shipped last, on the
            argument that the sound reaches everyone and the notification only
            the person who walked away — and the owner could not find it, buried
            under a nine-button grid in a long modal. A row nobody finds is a
            row nobody has. Discoverability beats that ordering. */}
        <NotificationRow />
        <AlertSoundRows />
      </section>

      <section aria-label={t("commentsAriaLabel")}>
        <Text className={classes.sectionTitle}>{t("commentsTitle")}</Text>
        <Divider className={classes.divider} />

        <Stack gap="xs">
          {/* Whether a run is logged at all comes before what the sentence
              says, so the ladder sits above the switch and its previews —
              which stay adjacent, because the previews belong to the switch. */}
          <div className={classes.field} data-testid="setting-comment-threshold">
            <Text component="span" className={classes.fieldLabel} id="comment-threshold-label">
              {t("thresholdLabel")}
            </Text>
            <Text component="span" className={classes.fieldDescription}>
              {t("thresholdDescription")}
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
                label: t("minutesShort", { count: choice }),
              }))}
            />
          </div>

          <Switch
            className={classes.switch}
            size="md"
            label={t("sayHowYouWorkedLabel")}
            description={t("sayHowYouWorkedDescription")}
            aria-label={t("sayHowYouWorkedLabel")}
            checked={commentEnvironment}
            onChange={(event) => setCommentEnvironment(event.currentTarget.checked)}
            data-testid="setting-comment-environment"
          />

          {/* The brief's "so the user knows": a description would describe the
              feature, a preview shows the artifact. Both states are always
              visible — the switch's effect is the difference between them. */}
          <div className={classes.previews} data-testid="comment-previews">
            <Preview
              label={t("previewOn")}
              text={decorated}
              active={commentEnvironment}
              sampled={sampled}
              testId="comment-preview-on"
            />
            <Preview
              label={t("previewOff")}
              text={plain}
              active={!commentEnvironment}
              testId="comment-preview-off"
            />
          </div>

          {/* Borrowed words have to be labelled as borrowed, or the preview is
              a small lie about what the next comment will say. */}
          {sampled && (
            <Text size="xs" c="dimmed" data-testid="comment-preview-note">
              {t("previewSampleNote", {
                first: tEnv("music"),
                second: tEnv("headphones"),
              })}
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
  const t = useTranslations("settings");
  return (
    <div
      className={`${classes.preview} ${active ? classes.previewActive : ""}`}
      data-testid={testId}
      data-active={active}
      data-sampled={sampled}
    >
      <span className={classes.previewLabel}>
        {sampled
          ? t("previewSampled", { label })
          : active
            ? t("previewLive", { label })
            : label}
      </span>
      {/* Long sentences in a narrow modal: they wrap, they never ellipsize. */}
      <span className={classes.previewText} data-testid={`${testId}-text`}>
        {text}
      </span>
    </div>
  );
}
