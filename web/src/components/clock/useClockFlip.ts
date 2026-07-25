"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@mantine/hooks";
import { resolveClock } from "@/clocks/registry";
import { useGluStore } from "@/store/gluStore";

/** Length of the slide. Must match `clockGallery.module.css` (ADR 25). */
export const FLIP_ANIMATION_MS = 420;

/** Which way the roster is moving: forward is the carousel's drag-left. */
export type FlipDirection = "forward" | "back";

export interface ClockFlip {
  /** The clock the slide is moving *away* from, or null when settled. */
  outgoingClockId: string | null;
  direction: FlipDirection;
  /**
   * Flips completed since mount. It is the layers' React key: a changed key
   * remounts them, which is what replays a one-shot CSS animation. `0` means
   * "never flipped", which is how first paint avoids sliding in.
   */
  flipSeq: number;
  /** The single entry point every flip source goes through (ADR 25). */
  flip: (step: number) => void;
}

/**
 * The flip state machine (ADR 25).
 *
 * A flip commits to the store immediately — the ADR 08 palette repaint leads
 * the slide — and stages the clock that was on screen as an outgoing layer for
 * `FLIP_ANIMATION_MS`. At most two clocks are mounted, and only inside that
 * window.
 *
 * An interrupting flip is **honoured, not dropped**: it restages from whatever
 * is currently on screen and re-arms the landing timer. Re-arming is the whole
 * trick — a stale timer from the first flip would otherwise land mid-way
 * through the second and pop its outgoing layer early.
 */
export function useClockFlip(): ClockFlip {
  const flipClock = useGluStore((s) => s.flipClock);
  const reducedMotion = useReducedMotion() ?? false;

  const [outgoingClockId, setOutgoingClockId] = useState<string | null>(null);
  const [direction, setDirection] = useState<FlipDirection>("forward");
  const [flipSeq, setFlipSeq] = useState(0);
  const landing = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (landing.current) clearTimeout(landing.current);
    },
    [],
  );

  return {
    outgoingClockId,
    direction,
    flipSeq,
    flip: useCallback(
      (step: number) => {
        if (step === 0) return;

        // Read the id *before* committing, so the outgoing layer renders the
        // clock the user actually saw rather than the one arriving.
        const from = resolveClock(useGluStore.getState().activeClockId).id;
        flipClock(step);

        // Non-negotiable: same flip, no slide. Nothing to tear down either,
        // so no second layer is ever mounted (ADR 25).
        if (reducedMotion) return;

        setDirection(step > 0 ? "forward" : "back");
        setOutgoingClockId(from);
        setFlipSeq((n) => n + 1);

        if (landing.current) clearTimeout(landing.current);
        landing.current = setTimeout(() => {
          landing.current = null;
          setOutgoingClockId(null);
        }, FLIP_ANIMATION_MS);
      },
      [flipClock, reducedMotion],
    ),
  };
}
