import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2d — the sun descends a gradient sky, native dark. No session. */
export const sunsetTheme: ClockTheme = {
  light: {
    background: "#fde7c8",
    ink: "#4a2c1a",
    accent: "#c2571f",
    onAccent: "#fff6e8",
    muted: "#7d5334",
  },
  dark: {
    background: "#1d1526",
    ink: "#f6e7cf",
    accent: "#f2b263",
    onAccent: "#1d1526",
    muted: "#b9a3c4",
  },
};

export function Sunset({ remainingMs, totalMs, state, accent }: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);
  // 8% at the start of the run, just above the horizon at the end.
  const top = 8 + p.elapsedFraction * 55;

  return (
    <ClockFrame theme={sunsetTheme} accent={accent} state={state}>
      <div className={designs.sky} aria-hidden="true" />
      <div className={designs.sun} style={{ top: `${top}%` }} aria-hidden="true" />
      <div className={designs.ground}>
        <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={classes.label}>{stateLabel(state, "Focus until sundown")}</span>
      </div>
    </ClockFrame>
  );
}
