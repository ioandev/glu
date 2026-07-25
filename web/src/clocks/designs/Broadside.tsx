import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1c — giant typographic mm/ss + hairline bar, native light. */
export const broadsideTheme: ClockTheme = {
  light: {
    background: "#f4f1ea",
    ink: "#141414",
    accent: "#141414",
    onAccent: "#f4f1ea",
    muted: "#6d6656",
  },
  dark: {
    background: "#131210",
    ink: "#f0ece1",
    accent: "#f0ece1",
    onAccent: "#131210",
    muted: "#9c9484",
  },
};

export function Broadside({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={broadsideTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "space-between" }}>
        <span className={classes.label}>Pomodoro {"\u2014"} {stateLabel(state)}</span>
        <div className={designs.display} style={{ lineHeight: 0.92 }}>
          <div className={classes.time} style={{ fontSize: "30cqmin", color: "var(--clk-ink)" }}>
            {p.minutes}
          </div>
          <div className={classes.time} style={{ fontSize: "30cqmin", color: "var(--clk-muted)" }}>
            {p.seconds}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2cqmin" }}>
          <div
            style={{
              height: "0.8cqmin",
              background: "var(--clk-muted)",
              opacity: 0.35,
              borderRadius: "1px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${p.elapsedFraction * 100}%`,
                background: "var(--clk-accent)",
              }}
            />
          </div>
          {showSession ? (
            <span className={classes.label} data-testid="clock-session">
              Sessions {session}
            </span>
          ) : null}
        </div>
      </div>
    </ClockFrame>
  );
}
