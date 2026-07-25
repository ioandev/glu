"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { useGluStore } from "@/store/gluStore";
import classes from "./scrollHint.module.css";

/**
 * The phone's "there is more below" arrow (ADR 08 amendment).
 *
 * Below `sm` the clock owns the first `100dvh` full-bleed, which is exactly the
 * layout that reads as the whole page: nothing peeks above the fold to say the
 * presets, transport and toggles are one scroll away. This is the arrow that
 * says it, pinned to the bottom edge of the clock slot.
 *
 * It retires on the first run rather than on a tap: the question it answers is
 * "is this all there is?", and you cannot have started a timer without having
 * found the Start button below. `hasStartedRun` is a one-way persisted field, so
 * the answer survives reloads and the arrow never comes back.
 *
 * Inert to pointers for the same reason [[SwipeHint]] is — the clock slot is a
 * swipe surface, and an affordance that ate the gesture next to it would be its
 * own bug. `aria-hidden` because it is a visual affordance for a fold that does
 * not exist in the reading order: the content it points at is already the next
 * thing a screen reader reaches.
 */
export function ScrollHint() {
  const hasStartedRun = useGluStore((s) => s.hasStartedRun);

  if (hasStartedRun) return null;

  return (
    <div className={classes.hint} data-testid="scroll-hint" aria-hidden="true">
      <span className={classes.chip}>
        <IconChevronDown size={22} stroke={1.75} />
      </span>
    </div>
  );
}
