"use client";

import { Divider, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { TodoistLogin } from "@/components/todoist/TodoistLogin";
import { useTodoistAuth } from "@/store/todoistAuth";
import classes from "./settings.module.css";

/**
 * The Settings surface (ADR 19). Deliberately a **section list** with one
 * section today: each penciled setting — chrome direction (15), archive export
 * (05), wake-lock opt-out (17), alert volume (18), takeover threshold (21) —
 * becomes one more row plus an amendment, not a layout renegotiation.
 */
export function SettingsContent() {
  const status = useTodoistAuth((s) => s.status);
  const name = useTodoistAuth((s) => s.name);
  const logout = useTodoistAuth((s) => s.logout);

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

      <Text size="sm" c="dimmed" className={classes.futureNote}>
        More settings land here as their ADRs do — chrome direction, session
        archive export, wake-lock opt-out, alert volume, final-countdown
        threshold.
      </Text>
    </Stack>
  );
}
