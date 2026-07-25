"use client";

import { useEffect, useState, type RefObject } from "react";
import type { TakeoverPhase } from "./useTakeover";
import classes from "./takeover.module.css";

/**
 * The overlay (ADR 21): a solid `--glu-page-bg` rectangle that expands from the
 * clock's measured rect to the whole viewport, sitting above all chrome and
 * below the clock — so "everything except the clock" is literal.
 *
 * **The div is deliberately contentless.** A non-uniform `transform: scale()` is
 * only safe because there is nothing inside to distort; that is what keeps the
 * animation on the compositor. Anything that ever needs to be *on* the takeover
 * goes in a separate, non-scaling layer.
 */
export function TakeoverOverlay({
  phase,
  reducedMotion,
  originRef,
  onPress,
}: {
  phase: TakeoverPhase;
  reducedMotion: boolean;
  originRef: RefObject<HTMLElement | null>;
  onPress: () => void;
}) {
  const [origin, setOrigin] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (phase !== "entering" && phase !== "retracting") return;
    setOrigin(originRef.current?.getBoundingClientRect() ?? null);
  }, [phase, originRef]);

  const visible = phase === "entering" || phase === "on" || phase === "retracting";
  if (!visible) return null;

  // The origin rect matters only during the entrance; after that the overlay is
  // simply full-viewport, so a rotation mid-takeover just stays covered.
  const animating = (phase === "entering" || phase === "retracting") && !reducedMotion && origin;
  const style = animating
    ? {
        left: `${origin.left}px`,
        top: `${origin.top}px`,
        width: `${Math.max(1, origin.width)}px`,
        height: `${Math.max(1, origin.height)}px`,
        "--takeover-scale-x": `${window.innerWidth / Math.max(1, origin.width) + 0.2}`,
        "--takeover-scale-y": `${window.innerHeight / Math.max(1, origin.height) + 0.2}`,
      }
    : undefined;

  return (
    <div
      className={classes.overlay}
      data-phase={phase}
      data-reduced-motion={reducedMotion || undefined}
      data-testid="takeover-overlay"
      // Not announced, but it does capture pointer events: that is the peek
      // trigger, and it prevents ghost-taps on covered controls (ADR 21).
      aria-hidden="true"
      style={style as React.CSSProperties}
      onPointerDown={onPress}
    />
  );
}
