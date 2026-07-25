import { ClockFrame } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 2c — CLI readout + ASCII bar, native dark. The one design that
 * displays the run's **total** (`--focus Nm`).
 */
export const terminalTheme: ClockTheme = {
  light: {
    background: "#f2f8ef",
    ink: "#0d4a1c",
    accent: "#0d7a2c",
    onAccent: "#f2f8ef",
    muted: "#3c6b47",
  },
  dark: {
    background: "#0a0f0a",
    ink: "#7dfc9a",
    accent: "#7dfc9a",
    onAccent: "#0a0f0a",
    muted: "#5aa06a",
  },
};

const BAR_WIDTH = 18;

export function Terminal({
  remainingSeconds,
  totalSeconds,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingSeconds, totalSeconds);
  const filled = Math.round(p.elapsedFraction * BAR_WIDTH);
  const bar = `[${"\u2588".repeat(filled)}${"\u2591".repeat(BAR_WIDTH - filled)}] ${Math.round(
    p.elapsedFraction * 100,
  )}%`;

  return (
    <ClockFrame theme={terminalTheme} accent={accent} state={state}>
      <div className={`${classes.pad} ${designs.mono}`} style={{ justifyContent: "center", gap: "2cqmin" }}>
        <span className={designs.termDim} data-testid="clock-total">
          $ pomodoro --focus {p.totalMinutes}m
        </span>
        {showSession ? (
          <span className={designs.termDim} data-testid="clock-session">
            session {session} {"\u00b7"} {state}
          </span>
        ) : null}
        <span className={classes.time} style={{ fontSize: "12cqmin", margin: "3cqmin 0 1cqmin" }}>
          {p.time}
        </span>
        <span style={{ fontSize: "3.4cqmin", letterSpacing: "0.06em" }}>{bar}</span>
        <span className={designs.termDim}>^C to abandon {"\u00b7"} s to stop</span>
      </div>
    </ClockFrame>
  );
}
