import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1i (second set) — a retro handheld, screen and two buttons, native light. */
export const lcdTheme: ClockTheme = {
  light: {
    background: "#c8cbb8",
    ink: "#2b3226",
    accent: "#4a5540",
    onAccent: "#eef0e5",
    muted: "#4b5442",
  },
  dark: {
    background: "#1b1f18",
    ink: "#cfe0b8",
    accent: "#9aa284",
    onAccent: "#12160f",
    muted: "#8b9678",
  },
};

export function Lcd({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={lcdTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div className={designs.lcdScreen}>
          <span className={`${classes.time} ${designs.mono} ${designs.lcdDigits}`}>{p.time}</span>
          <div className={designs.rowBetween}>
            <span
              className={classes.label}
              style={{ color: "var(--clk-ink)" }}
              data-testid={showSession ? "clock-session" : undefined}
            >
              {stateLabel(state)}
              {showSession ? ` ${session}` : ""}
            </span>
            <span className={classes.label} style={{ color: "var(--clk-ink)" }}>
              {Math.round(p.elapsedFraction * 100)}%
            </span>
          </div>
          <span className={designs.lcdTrack} aria-hidden="true">
            <span
              className={designs.lcdTrackFill}
              style={{ width: `${p.elapsedFraction * 100}%` }}
            />
          </span>
        </div>
        <div className={designs.lcdButtons} aria-hidden="true">
          <span className={designs.lcdButton} />
          <span className={`${designs.lcdButton} ${designs.lcdButtonHot}`} />
        </div>
      </div>
    </ClockFrame>
  );
}
