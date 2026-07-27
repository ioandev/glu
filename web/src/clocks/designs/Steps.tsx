import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1h (second set) — a staircase climbed left to right, native light. */
export const stepsTheme: ClockTheme = {
  light: {
    background: "#e9f0f7",
    ink: "#1d3557",
    accent: "#1d3557",
    onAccent: "#ffffff",
    muted: "#536b85",
  },
  dark: {
    background: "#0e1723",
    ink: "#dbe7f3",
    accent: "#74a6d9",
    onAccent: "#0e1723",
    muted: "#93a9c1",
  },
};

const STEPS = 10;

export function Steps({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const climbed = Math.round(p.elapsedFraction * STEPS);

  return (
    <ClockFrame theme={stepsTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "space-between" }}>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          {showSession ? (
            <span className={classes.label} data-testid="clock-session">
              {session}
            </span>
          ) : null}
        </div>
        <div className={designs.stepRow} aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={designs.step}
              style={{
                height: `${20 + i * 8.8}%`,
                background: i < climbed ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < climbed ? 1 : 0.35,
              }}
            />
          ))}
        </div>
        <span className={classes.label}>{stateLabel(state, "keepClimbing")}</span>
      </div>
    </ClockFrame>
  );
}
