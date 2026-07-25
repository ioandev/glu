import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1d — ambient glow blobs, native dark. Shows no session count. */
export const auroraTheme: ClockTheme = {
  light: {
    background: "#eef0fb",
    ink: "#1d2140",
    accent: "#5a44c8",
    onAccent: "#ffffff",
    muted: "#5b608a",
  },
  dark: {
    background: "#0b0e1a",
    ink: "#f4f5fb",
    accent: "#7c5cff",
    onAccent: "#0b0e1a",
    muted: "#9aa0c4",
  },
};

export function Aurora({ remainingMs, totalMs, state, accent }: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);
  // The glow tracks the run: two fixed-size pre-blurred layers, not
  // viewport-sized filters — those are GPU-expensive on a tablet (ADR 07).
  // The drift is applied as a `transform`, not as `left`/`right`: now that it
  // moves every frame, an offset change would re-rasterize a 9cqmin blur each
  // time, where a transform only moves the layer the compositor already has.
  // `cqw` is 1% of the same container the percentages resolved against, so the
  // geometry is unchanged.
  const drift = 10 + p.elapsedFraction * 22;

  return (
    <ClockFrame theme={auroraTheme} accent={accent} state={state}>
      <div
        aria-hidden="true"
        className={designs.glowA}
        style={{ left: 0, top: "18%", transform: `translateX(${drift}cqw)` }}
      />
      <div
        aria-hidden="true"
        className={designs.glowB}
        style={{ right: 0, bottom: "16%", transform: `translateX(${-drift}cqw)` }}
      />
      <div className={classes.center} style={{ position: "relative" }}>
        <span className={`${classes.time} ${designs.bigTime}`} style={{ fontSize: "17cqmin" }}>
          {p.time}
        </span>
        <span className={designs.pillLabel}>{stateLabel(state)}</span>
      </div>
    </ClockFrame>
  );
}
