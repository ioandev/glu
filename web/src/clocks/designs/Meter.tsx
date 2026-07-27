import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1c (second set) — an equalizer emptying right to left, native dark. */
export const meterTheme: ClockTheme = {
  light: {
    background: "#eef7f1",
    ink: "#0d2417",
    accent: "#127a45",
    onAccent: "#ffffff",
    muted: "#47725b",
  },
  dark: {
    background: "#101418",
    ink: "#e8f7ee",
    accent: "#3ddc84",
    onAccent: "#06180d",
    muted: "#6f9c84",
  },
};

const BARS = 16;

export function Meter({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const lit = Math.round(p.remainingFraction * BARS);

  return (
    <ClockFrame theme={meterTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "6cqmin" }}>
        <div className={designs.eqRow} aria-hidden="true">
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              className={designs.eqBar}
              style={{
                // A fixed silhouette, not noise: the shape must be identical
                // on every render (ADR 07's purity rule).
                height: `${30 + Math.abs(Math.sin(i * 2.7)) * 70}%`,
                background: i < lit ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < lit ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "10cqmin" }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state)}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
