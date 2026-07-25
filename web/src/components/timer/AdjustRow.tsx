"use client";

import { Button, Group } from "@mantine/core";
import { MINUTE } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import classes from "./timer.module.css";

const ADJUSTMENTS = [
  { label: "+1", minutes: 1 },
  { label: "+5", minutes: 5 },
  { label: "−1", minutes: -1 },
  { label: "−5", minutes: -5 },
] as const;

/** ADR 02: ± apply to `remaining`; `total` follows so the ring stays honest. */
export function AdjustRow() {
  const adjust = useGluStore((s) => s.adjust);

  return (
    <Group gap="xs" justify="center" aria-label="Adjust remaining time">
      {ADJUSTMENTS.map(({ label, minutes }) => (
        <Button
          key={label}
          className={classes.adjustButton}
          variant="default"
          onClick={() => adjust(minutes * MINUTE)}
          aria-label={`${minutes > 0 ? "Add" : "Subtract"} ${Math.abs(minutes)} ${
            Math.abs(minutes) === 1 ? "minute" : "minutes"
          }`}
        >
          {label}
        </Button>
      ))}
    </Group>
  );
}
