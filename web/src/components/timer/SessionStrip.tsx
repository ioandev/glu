"use client";

import { useState } from "react";
import { Button, Group, Popover, Stack, Switch, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useGluStore } from "@/store/gluStore";
import { SESSION_DOT_CAP } from "@/store/types";
import classes from "./sessionStrip.module.css";

/**
 * ADR 05: one dot per completed session today, a count, and a "New day" button
 * that asks first — wiping the visible count on a stray tap reads as data loss
 * even when it isn't. Lives in the timer's left half, below the ± row.
 */
export function SessionStrip() {
  const sessions = useGluStore((s) => s.day.sessions);
  const newDay = useGluStore((s) => s.newDay);
  const showSessionOnClock = useGluStore((s) => s.showSessionOnClock);
  const setShowSessionOnClock = useGluStore((s) => s.setShowSessionOnClock);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const t = useTranslations("timer");

  const count = sessions.length;
  const dots = Math.min(count, SESSION_DOT_CAP);
  const overflow = count - dots;

  return (
    <Group gap="sm" justify="center" wrap="wrap" aria-label={t("sessionsAriaLabel")}>
      <Group gap={6} aria-hidden="true">
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} className={classes.dot} />
        ))}
        {overflow > 0 ? (
          <Text component="span" className={classes.overflow}>
            {t("sessionsOverflow", { count: overflow })}
          </Text>
        ) : null}
      </Group>

      <Text component="span" className={classes.count} data-testid="session-count">
        {t("sessionsToday", { count })}
      </Text>

      <Popover
        opened={confirmOpen}
        onChange={setConfirmOpen}
        position="top"
        withArrow
        shadow="md"
        trapFocus
        // Kept out of a portal so the confirm stays inside the timer column's
        // stacking context — and so it is reachable from the story canvas.
        withinPortal={false}
        // No fade: the confirm is a decision surface, and an animating opacity
        // makes both the a11y snapshot and the interaction tests flaky.
        transitionProps={{ duration: 0 }}
      >
        <Popover.Target>
          <Button
            className={classes.newDayButton}
            variant="default"
            onClick={() => setConfirmOpen((o) => !o)}
          >
            {t("newDay")}
          </Button>
        </Popover.Target>
        <Popover.Dropdown className={classes.confirm}>
          <Stack gap="xs" role="dialog" aria-label={t("newDayConfirmAriaLabel")}>
            <Text fw={600} size="sm">
              {t("newDayHeading")}
            </Text>
            <Text size="sm" c="dimmed">
              {count === 0 ? t("newDayNothing") : t("newDayReset", { count })}
            </Text>
            <Group gap="xs" justify="flex-end">
              <Button
                className={classes.confirmButton}
                variant="subtle"
                onClick={() => setConfirmOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                className={classes.confirmButton}
                onClick={() => {
                  newDay();
                  setConfirmOpen(false);
                }}
              >
                {t("reset")}
              </Button>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      {/* ADR 08: a display preference about session data, so it lives with the
          session UI rather than ADR 10's chrome drawer — and outside the clock. */}
      <Switch
        className={classes.showSessionSwitch}
        size="md"
        label={t("showSessions")}
        checked={showSessionOnClock}
        onChange={(event) => setShowSessionOnClock(event.currentTarget.checked)}
      />
    </Group>
  );
}
