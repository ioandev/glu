import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1e (third set) — a sun climbing out of the dark, native dark. */
export const sunriseTheme: ClockTheme = {
  light: {
    background: "#e8eef7",
    ink: "#1d2a45",
    accent: "#a8571f",
    onAccent: "#ffffff",
    muted: "#5a668a",
  },
  dark: {
    background: "#1d2a45",
    ink: "#f8ecd2",
    accent: "#f5c882",
    onAccent: "#231604",
    muted: "#9aa4c4",
  },
};

export function Sunrise({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // The sun rises with the work done: nightfall at the start, high by the end.
  const top = 78 - p.elapsedFraction * 62;

  return (
    <ClockFrame theme={sunriseTheme} accent={accent} state={state}>
      <span className={designs.dawnSky} aria-hidden="true" />
      <span className={designs.sunDisc} style={{ top: `${top}%` }} aria-hidden="true" />
      <div className={designs.horizonBar}>
        <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state, "focusRising")}
          {showSession ? ` · ${session}` : ""}
        </span>
      </div>
    </ClockFrame>
  );
}
