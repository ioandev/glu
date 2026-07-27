"use client";

import { Button, Group } from "@mantine/core";
import { useTranslations } from "next-intl";
import { durationOptions } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import classes from "./timer.module.css";

/**
 * ADR 02: tapping a preset sets total and remaining, preserving run state — the
 * tap is the consent, no confirmation dialog on a device you're touching
 * mid-focus-session.
 *
 * ADR 32: the row is the ladder *plus* the selection when ± has walked it off
 * the ladder. The custom rung looks exactly like a preset on purpose — it is a
 * length you can tap to re-select, which is all the other seven are — and it
 * survives Start, Stop and `n` because it lives in `selectedDuration` like any
 * other selection.
 */
export function PresetRow() {
  const selectedDuration = useGluStore((s) => s.selectedDuration);
  const setPreset = useGluStore((s) => s.setPreset);
  const t = useTranslations("timer");

  return (
    <Group gap="xs" justify="center" wrap="wrap" aria-label={t("presetsAriaLabel")}>
      {durationOptions(selectedDuration).map(({ ms, label, custom }) => {
        const active = selectedDuration === ms;
        return (
          <Button
            // Keyed by duration, not label: the custom rung changes value, and
            // a shared key would have React reuse the wrong button's state.
            key={ms}
            className={classes.presetButton}
            variant={active ? "filled" : "default"}
            data-active={active || undefined}
            data-custom={custom || undefined}
            aria-pressed={active}
            onClick={() => setPreset(ms)}
          >
            {label}
          </Button>
        );
      })}
    </Group>
  );
}
