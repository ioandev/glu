"use client";

import { Chip, Group, Stack, Text } from "@mantine/core";
import { useGluStore } from "@/store/gluStore";
import { ENVIRONMENT_KEYS, type EnvironmentKey } from "@/store/types";
import classes from "./environment.module.css";

const LABELS: Record<EnvironmentKey, string> = {
  music: "Music",
  podcast: "Podcast",
  tv: "TV",
  silence: "Silence",
  noisy: "Noisy",
  headphones: "Headphones",
};

/**
 * ADR 02: six chips. Silence clears Music/Podcast/TV/Noisy and any of those
 * clears Silence; Headphones is orthogonal. The rule lives in one reducer
 * (`nextEnvironment`), never per-chip.
 */
export function EnvironmentToggles() {
  const environment = useGluStore((s) => s.environment);
  const toggleEnvironment = useGluStore((s) => s.toggleEnvironment);

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" className={classes.legend}>
        Environment
      </Text>
      <Group gap="xs" wrap="wrap" role="group" aria-label="Environment">
        {ENVIRONMENT_KEYS.map((key) => (
          <Chip
            key={key}
            size="lg"
            className={classes.chip}
            checked={environment[key]}
            onChange={() => toggleEnvironment(key)}
            value={key}
          >
            {LABELS[key]}
          </Chip>
        ))}
      </Group>
    </Stack>
  );
}
