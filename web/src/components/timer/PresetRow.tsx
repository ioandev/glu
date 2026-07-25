"use client";

import { Button, Group } from "@mantine/core";
import { MINUTE, PRESET_MINUTES } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import classes from "./timer.module.css";

/**
 * ADR 02: tapping a preset sets total and remaining, preserving run state — the
 * tap is the consent, no confirmation dialog on a device you're touching
 * mid-focus-session.
 */
export function PresetRow() {
  const selectedDuration = useGluStore((s) => s.selectedDuration);
  const setPreset = useGluStore((s) => s.setPreset);

  return (
    <Group gap="xs" justify="center" wrap="wrap" aria-label="Preset durations">
      {PRESET_MINUTES.map((minutes) => {
        const ms = minutes * MINUTE;
        const active = selectedDuration === ms;
        return (
          <Button
            key={minutes}
            className={classes.presetButton}
            variant={active ? "filled" : "default"}
            data-active={active || undefined}
            aria-pressed={active}
            onClick={() => setPreset(ms)}
          >
            {minutes}m
          </Button>
        );
      })}
    </Group>
  );
}
