import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1f (third set) — dots stacking up beside the readout, native dark. */
export const columnTheme: ClockTheme = {
  light: {
    background: "#eef7f1",
    ink: "#10231a",
    accent: "#1a7a4a",
    onAccent: "#ffffff",
    muted: "#48705a",
  },
  dark: {
    background: "#101a16",
    ink: "#e7f5ec",
    accent: "#4ade80",
    onAccent: "#06180d",
    muted: "#75a189",
  },
};

const DOTS = 12;

export function Column({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const stacked = Math.round(p.elapsedFraction * DOTS);

  return (
    <ClockFrame theme={columnTheme} accent={accent} state={state}>
      <div className={designs.columnRow}>
        <div className={designs.dotStack} aria-hidden="true">
          {Array.from({ length: DOTS }, (_, i) => (
            <span
              key={i}
              className={designs.stackDot}
              style={{
                background: i < stacked ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < stacked ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5cqmin" }}>
          <span className={classes.time} style={{ fontSize: "14cqmin", fontWeight: 500 }}>
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
