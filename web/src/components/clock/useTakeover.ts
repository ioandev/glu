"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@mantine/hooks";
import type { TimerStatus } from "@/store/types";

/** ADR 21: the final minute, pinned. One constant, one place. */
export const TAKEOVER_THRESHOLD_SECONDS = 60;
/** A tap while covered buys this long with the normal UI. */
export const PEEK_MS = 5_000;
/** Entrance and retract are the same length. */
export const TAKEOVER_ANIMATION_MS = 700;

export type TakeoverPhase = "off" | "entering" | "on" | "peeking" | "retracting";

export interface Takeover {
  phase: TakeoverPhase;
  /** True whenever the overlay should be painted at all. */
  covered: boolean;
  reducedMotion: boolean;
  /** Pointer on the overlay: peek while running, dissolve when finished. */
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
 * Level-triggering would re-fire the entrance on every 50 ms tick.
 */
export function useTakeover(
  status: TimerStatus,
  seconds: number,
  /** Identity of the run, so a dissolve applies to that run and no other. */
  runId: string | null = null,
): Takeover {
  const reducedMotion = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<TakeoverPhase>("off");
  /** The run whose finished-takeover the user has already dismissed. */
  const [dissolvedRunId, setDissolvedRunId] = useState<string | null>(null);
  const [peekUntil, setPeekUntil] = useState<number | null>(null);
  const wasEligible = useRef(false);
  const hasMounted = useRef(false);

  // The threshold compares the *same* ceiling-rounded second the display shows,
  // or the takeover and a visible "1:00" disagree by a frame (ADR 21).
  const eligible = status === "running" && seconds < TAKEOVER_THRESHOLD_SECONDS;
  // At 0:00 the takeover persists through `finished` — it *is* the
  // distraction-free 00:00 display — until an interaction dissolves it.
  const finishedCovered = status === "finished" && dissolvedRunId !== (runId ?? "__none");
  const wanted = eligible || finishedCovered;

  useEffect(() => {
    const crossedIn = wanted && !wasEligible.current;
    const crossedOut = !wanted && wasEligible.current;
    wasEligible.current = wanted;

    if (crossedIn) {
      setPeekUntil(null);
      // Restoring straight into the final minute renders instantly: the
      // animation narrates a crossing, and a page load has none to narrate.
      setPhase(hasMounted.current && !reducedMotion ? "entering" : "on");
    } else if (crossedOut) {
      // Pause, a `+5`, or a Stop: the takeover is a statement about time left,
      // so it obeys time left. An already-dismissed overlay stays dismissed —
      // a dissolve is not something to animate back out of.
      setPeekUntil(null);
      setPhase((current) => (current === "off" ? "off" : "retracting"));
    }
    hasMounted.current = true;
  }, [wanted, reducedMotion]);

  // Entrance and retract are fixed-length; land on the next phase.
  useEffect(() => {
    if (phase !== "entering" && phase !== "retracting") return;
    const timer = setTimeout(
      () => setPhase(phase === "entering" ? "on" : "off"),
      TAKEOVER_ANIMATION_MS + 20,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  // The peek deadline — a timestamp, not a bare timeout, so a re-render cannot
  // lose it. Re-enter only if the takeover is still warranted.
  useEffect(() => {
    if (phase !== "peeking" || peekUntil === null) return;
    const timer = setTimeout(
      () => {
        setPeekUntil(null);
        setPhase(wanted ? "on" : "off");
      },
      Math.max(0, peekUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [phase, peekUntil, wanted]);

  const onOverlayPress = useCallback(() => {
    if (status === "finished") {
      // The session is over: peek semantics apply only while running.
      setDissolvedRunId(runId ?? "__none");
      setPhase("off");
      return;
    }
    setPeekUntil(Date.now() + PEEK_MS);
    setPhase("peeking");
  }, [status, runId]);

  const covered = phase === "entering" || phase === "on" || phase === "retracting";

  return { phase, covered, reducedMotion, onOverlayPress };
}
