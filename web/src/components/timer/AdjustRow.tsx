"use client";

import { Button, Group } from "@mantine/core";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("timer");

  return (
    <Group gap="xs" justify="center" aria-label={t("adjustAriaLabel")}>
      {ADJUSTMENTS.map(({ label, minutes }) => (
        <Button
          key={label}
          className={classes.adjustButton}
          variant="default"
          onClick={() => adjust(minutes * MINUTE)}
          aria-label={
            minutes > 0
              ? t("adjustAdd", { count: Math.abs(minutes) })
              : t("adjustSubtract", { count: Math.abs(minutes) })
          }
        >
          {label}
        </Button>
      ))}
    </Group>
  );
}
