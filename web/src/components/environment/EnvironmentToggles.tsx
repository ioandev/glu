"use client";

import { Chip, Group, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useGluStore } from "@/store/gluStore";
import { ENVIRONMENT_KEYS } from "@/store/types";
import classes from "./environment.module.css";

/**
 * ADR 02: six chips. Silence clears Music/Podcast/TV/Noisy and any of those
 * clears Silence; Headphones is orthogonal. The rule lives in one reducer
 * (`nextEnvironment`), never per-chip.
 */
export function EnvironmentToggles() {
  const environment = useGluStore((s) => s.environment);
  const toggleEnvironment = useGluStore((s) => s.toggleEnvironment);
  const t = useTranslations("environment");

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" className={classes.legend}>
        {t("legend")}
      </Text>
      <Group gap="xs" wrap="wrap" role="group" aria-label={t("ariaLabel")}>
        {ENVIRONMENT_KEYS.map((key) => (
          <Chip
            key={key}
            size="lg"
            className={classes.chip}
            checked={environment[key]}
            onChange={() => toggleEnvironment(key)}
            value={key}
          >
            {t(key)}
          </Chip>
        ))}
      </Group>
    </Stack>
  );
}
