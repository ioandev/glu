"use client";

import { useRef } from "react";
import { ActionIcon } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { resolveClock } from "@/clocks/registry";
import { useCountdown } from "@/hooks/useCountdown";
import { useGluStore } from "@/store/gluStore";
import classes from "./clockGallery.module.css";
import takeoverClasses from "./takeover.module.css";
import { TakeoverOverlay } from "./TakeoverOverlay";
import { useClockFlip } from "./useClockFlip";
import { useTakeover } from "./useTakeover";

/** Pointer travel before a drag counts as a flip (ADR 08). */
export const SWIPE_THRESHOLD_PX = 40;

/**
 * Decides whether a pointer drag is a clock flip. Horizontal intent has to beat
 * vertical, or a page scroll on mobile would flip clocks (ADR 08).
 */
export function swipeIntent(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return 0;
  if (Math.abs(dx) <= Math.abs(dy)) return 0;
  // Dragging left moves forward through the registry, like a carousel.
  return dx < 0 ? 1 : -1;
}

/**
 * The clock slot *is* the gallery (ADR 08): swipe or tap the flanking chevrons
 * to move through the registry in order, wrapping at the ends. Only the active
 * clock renders — 18 mounted clocks means 18 ticking subtrees and Aurora's blur
 * layers running off-screen.
 *
 * ADR 25 carves the one bounded exception: for the 420 ms of a flip the slot
 * holds two layers, the departing clock and the arriving one, sliding in the
 * direction the user swiped. Two, briefly, is the floor for a paired slide —
 * it is not the strip ADR 08 rejected.
 */
export function ClockGallery() {
  const activeClockId = useGluStore((s) => s.activeClockId);
  const showSessionOnClock = useGluStore((s) => s.showSessionOnClock);
  const session = useGluStore((s) => s.day.sessions.length);
  const runId = useGluStore((s) => s.runId);
  const { remainingMs, seconds, totalMs, status } = useCountdown();

  const clock = resolveClock(activeClockId);
  const start = useRef<{ x: number; y: number } | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);

  // ADR 25: swipe and both chevrons go through one entry point, or the two
  // drift. The outgoing clock stays mounted for the length of the slide only.
  const { outgoingClockId, direction, flipSeq, flip } = useClockFlip();

  // ADR 21: during the takeover the clock's container rides above the overlay,
  // which is what makes "everything except the clock" literal.
  const takeover = useTakeover(status, seconds, runId);

  /** Both layers render from the same props — identical by construction. */
  const layer = (id: string, role: "entering" | "leaving") => {
    const Clock = resolveClock(id).component;
    return (
      // The key is the flip counter: remounting is what replays a one-shot CSS
      // animation, and `flipSeq === 0` is what keeps first paint from sliding.
      <div
        key={`${role}:${flipSeq}`}
        className={classes.layer}
        data-role={role}
        data-direction={direction}
        data-animate={flipSeq > 0 ? "" : undefined}
      >
        <Clock
          // Milliseconds, so the geometry moves every frame; the takeover below
          // still reads the ceiling-rounded second the digits show (ADR 21).
          remainingMs={remainingMs}
          totalMs={totalMs}
          session={session}
          showSession={showSessionOnClock}
          state={status}
        />
      </div>
    );
  };

  return (
    <div className={classes.gallery} data-takeover={takeover.phase}>
      <TakeoverOverlay
        phase={takeover.phase}
        reducedMotion={takeover.reducedMotion}
        originRef={slotRef}
        onPress={takeover.onOverlayPress}
      />
      <ActionIcon
        className={classes.chevron}
        variant="subtle"
        aria-label="Previous clock design"
        onClick={() => flip(-1)}
      >
        <IconChevronLeft size={24} />
      </ActionIcon>

      <div
        ref={slotRef}
        className={`${classes.slot}${takeover.covered ? ` ${takeoverClasses.clockAbove}` : ""}`}
        data-testid="clock-slot"
        data-clock-id={clock.id}
        onPointerDown={(event) => {
          // Multi-touch is not a swipe: a second finger or a palm would
          // otherwise overwrite the start point and resolve into a flip.
          if (!event.isPrimary) return;
          start.current = { x: event.clientX, y: event.clientY };
          // Capture, so a drag that ends past the slot's edge still lands here.
          // The slot is at most 520 px wide — ending outside it is the normal
          // gesture, not an edge case (ADR 25).
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const from = start.current;
          start.current = null;
          if (!from) return;
          const step = swipeIntent(event.clientX - from.x, event.clientY - from.y);
          if (step !== 0) {
            flip(step);
            return;
          }
          // ADR 21 amendment (2026-07-25): the clock rides *above* the overlay,
          // and below `sm` it is the entire first viewport (ADR 08) — so on a
          // phone the overlay has no exposed pixel left to press, and the "tap
          // anywhere" ADR 21 promises has to be honoured here or the takeover
          // cannot be dismissed at all. A press that resolved to no swipe is
          // that tap: it dissolves the takeover for the rest of the run,
          // running or finished. A swipe stays a flip — browsing clocks on the
          // distraction-free screen is not a request to end it.
          if (takeover.covered) takeover.onOverlayPress();
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
        {outgoingClockId !== null && layer(outgoingClockId, "leaving")}
        {layer(clock.id, "entering")}
      </div>

      <ActionIcon
        className={classes.chevron}
        variant="subtle"
        aria-label="Next clock design"
        onClick={() => flip(1)}
      >
        <IconChevronRight size={24} />
      </ActionIcon>
    </div>
  );
}
