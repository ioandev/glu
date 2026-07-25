import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2g — a departures board, native light. Static digits (ADR 07). */
export const splitFlapTheme: ClockTheme = {
  light: {
    background: "#efe9df",
    ink: "#26241f",
    accent: "#26241f",
    onAccent: "#f4efe4",
    muted: "#6f6858",
  },
  dark: {
    background: "#181611",
    ink: "#f4efe4",
    accent: "#e8dcc2",
    onAccent: "#26241f",
    muted: "#a89e88",
  },
};

export function SplitFlap({
  remainingSeconds,
  totalSeconds,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingSeconds, totalSeconds);
  const digits = [...p.minutes, ...p.seconds];

  return (
    <ClockFrame theme={splitFlapTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.flapRow} aria-hidden="true">
          {digits.map((d, i) => (
            <span key={i} className={designs.flap}>
              <span className={designs.flapSeam} />
              {d}
            </span>
          ))}
        </div>
        <div className={classes.center} style={{ gap: "1.2cqmin", height: "auto" }}>
          <span className={classes.label}>Now departing {"\u00b7"} {stateLabel(state)}</span>
          {showSession ? (
            <span className={classes.label} data-testid="clock-session">
              Platform {session}
            </span>
          ) : null}
        </div>
      </div>
    </ClockFrame>
  );
}
