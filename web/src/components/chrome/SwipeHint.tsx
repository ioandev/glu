"use client";

import { ActionIcon } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useGluStore } from "@/store/gluStore";
import classes from "./swipeHint.module.css";

export const SWIPE_HINT_TEXT = "Swipe the clock to switch designs";

/**
 * The gallery's one-time discovery hint (ADR 08 amendment).
 *
 * Below `sm` the flanking chevrons are gone and the clock is the whole first
 * viewport, so the swipe is the only way through the roster — an affordance
 * with nothing on screen to advertise it. This says it once, floating over the
 * top of the clock (which below `sm` *is* the top of the page), and closing it
 * is permanent: `swipeHintDismissed` is an additive blob field, so the answer
 * survives reloads and never asks again.
 *
 * The banner is inert to pointers apart from its close button — a hint that ate
 * the gesture it teaches would be its own bug.
 */
export function SwipeHint() {
  const dismissed = useGluStore((s) => s.swipeHintDismissed);
  const dismiss = useGluStore((s) => s.dismissSwipeHint);

  if (dismissed) return null;

  return (
    <aside className={classes.hint} aria-label="Tip" data-testid="swipe-hint">
      <span className={classes.text}>{SWIPE_HINT_TEXT}</span>
      <ActionIcon
        className={classes.close}
        variant="subtle"
        size={44}
        aria-label="Dismiss tip"
        onClick={dismiss}
      >
        <IconX size={18} />
      </ActionIcon>
    </aside>
  );
}
