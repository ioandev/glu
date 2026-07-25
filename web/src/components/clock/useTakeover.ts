"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery, useReducedMotion } from "@mantine/hooks";
import type { TimerStatus } from "@/store/types";

/** ADR 21: the final minute, pinned. One constant, one place. */
export const TAKEOVER_THRESHOLD_SECONDS = 60;
/**
 * The takeover is a statement the tablet layout can make and the phone layout
 * cannot (ADR 21 amendment 2026-07-25). At/above `sm` there is chrome *beside*
 * the clock for the background to flood. Below it, ADR 08 already gives the
 * clock the entire first viewport: the toggles and the task list are below the
 * fold, reached by a deliberate scroll, so an overlay covers a screen that is
 * nothing but clock — all it can do is swallow that scroll. Mirrors the
 * layout's own `$mantine-breakpoint-sm`.
 */
export const TAKEOVER_MIN_WIDTH_QUERY = "(min-width: 48em)";
/** Entrance and retract are the same length. */
export const TAKEOVER_ANIMATION_MS = 700;

export type TakeoverPhase = "off" | "entering" | "on" | "retracting";

export interface Takeover {
  phase: TakeoverPhase;
  /** True whenever the overlay should be painted at all. */
  covered: boolean;
  reducedMotion: boolean;
  /** A tap anywhere dissolves the takeover for the rest of the run. */
  onOverlayPress: () => void;
}

/**
 * The takeover state machine (ADR 21).
 *
 * Read-only consumer of `{status, seconds}` — it never transitions the timer
 * (ADR 14's lifecycle question, answered the way ADR 17 answered it, and
 * spy-tested).
 *
 * Detection is **edge-triggered**: crossing from ≥60 s to <60 s engages once.
 * Level-triggering would re-fire the entrance on every animation frame.
 */
export function useTakeover(
  status: TimerStatus,
  seconds: number,
  /** Identity of the run, so a dissolve applies to that run and no other. */
  runId: string | null = null,
): Takeover {
  const reducedMotion = useReducedMotion() ?? false;
  // Read during the first client render rather than in an effect: a page that
  // restores into the final minute has to paint covered, and a width that
  // arrived one commit late would look like a crossing and sweep.
  const wideEnough = useMediaQuery(TAKEOVER_MIN_WIDTH_QUERY, undefined, {
    getInitialValueInEffect: false,
  });
  const [phase, setPhase] = useState<TakeoverPhase>("off");
  /**
   * The run whose takeover the user has already dismissed.
   *
   * A tap is a decision about *this run*, not about the next five seconds
   * (ADR 21 amendment 2026-07-25): someone who asked for the chrome back keeps
   * it — through the rest of the final minute, through 00:00, through a pause
   * and a `+5`. Only a new run (a new `runId`) covers again.
   *
   * A page that *loads* into `finished` starts dismissed for the same reason
   * the entrance sweep is skipped on restore: the 00:00 cover is the final
   * minute's cover still standing, it persists *through* the crossing, and a
   * load has no crossing behind it. Coming back to the app means coming back to
   * the whole app: chrome, header, controls.
   */
  const [dissolvedRunId, setDissolvedRunId] = useState<string | null>(() =>
    status === "finished" ? (runId ?? "__none") : null,
  );
  const wasEligible = useRef(false);
  const hasMounted = useRef(false);

  const dismissed = dissolvedRunId === (runId ?? "__none");
  // The threshold compares the *same* ceiling-rounded second the display shows,
  // or the takeover and a visible "1:00" disagree by a frame (ADR 21).
  const eligible = status === "running" && seconds < TAKEOVER_THRESHOLD_SECONDS;
  // At 0:00 the takeover persists through `finished` — it *is* the
  // distraction-free 00:00 display — until an interaction dissolves it.
  const finishedCovered = status === "finished";
  // Below `sm` the answer is simply no — there is nothing beside the clock to
  // cover (see `TAKEOVER_MIN_WIDTH_QUERY`). Folding it into `wanted` rather
  // than skipping the render keeps `covered` honest, so the clock is not
  // elevated and the slot's tap stays a plain gallery tap.
  const wanted = wideEnough && (eligible || finishedCovered) && !dismissed;

  useEffect(() => {
    const crossedIn = wanted && !wasEligible.current;
    wasEligible.current = wanted;

    if (crossedIn) {
      // Restoring straight into the final minute renders instantly: the
      // animation narrates a crossing, and a page load has none to narrate.
      setPhase(hasMounted.current && !reducedMotion ? "entering" : "on");
    }
    hasMounted.current = true;
  }, [wanted, reducedMotion]);

  // **Engage is edge-triggered (above); disengage is derived (here).** Pause, a
  // `+5`, or a Stop retracts — and so does *any* way of being covered while the
  // takeover is no longer warranted. Deriving it rather than firing on the
  // crossing is what makes that total: a retract requested mid-entrance used to
  // be undone by the entrance's own landing timer, stranding the overlay `on`
  // with nothing left to re-check it, and a stranded overlay swallows every
  // pointer event on the page. Derivation cannot re-fire the entrance either —
  // it only ever reads *down* from covered, so ADR 21's rule still holds.
  //
  // An already-dismissed overlay stays dismissed (`off` is not covered — a
  // dissolve is not something to animate back out of).
  const effectivePhase: TakeoverPhase =
    !wanted && (phase === "entering" || phase === "on") ? "retracting" : phase;

  // Entrance and retract are fixed-length; land on the next phase.
  useEffect(() => {
    if (effectivePhase !== "entering" && effectivePhase !== "retracting") return;
    const timer = setTimeout(
      () => setPhase(effectivePhase === "entering" ? "on" : "off"),
      TAKEOVER_ANIMATION_MS + 20,
    );
    return () => clearTimeout(timer);
  }, [effectivePhase]);

  // A tap dissolves the takeover for this run — running or finished, no timer,
  // nothing to come back and re-cover the page (ADR 21 amendment 2026-07-25).
  // The dismissal is recorded against the run, not the phase, so the crossing
  // detector above cannot re-engage it either: `wanted` is false for the rest
  // of the run, so there is no edge left to cross.
  const onOverlayPress = useCallback(() => {
    setDissolvedRunId(runId ?? "__none");
    setPhase("off");
  }, [runId]);

  const covered =
    effectivePhase === "entering" || effectivePhase === "on" || effectivePhase === "retracting";

  return { phase: effectivePhase, covered, reducedMotion, onOverlayPress };
}
