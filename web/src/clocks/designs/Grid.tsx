import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress, unitCount } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2b — a dot matrix fills, native light. One dot per minute, capped. */
export const gridTheme: ClockTheme = {
  light: {
    background: "#eef4ef",
    ink: "#1e3a2b",
    accent: "#1e3a2b",
    onAccent: "#eef4ef",
    muted: "#2f5c45",
  },
  dark: {
    background: "#0d1c14",
    ink: "#dcefe2",
    accent: "#6fd39b",
    onAccent: "#0d1c14",
    muted: "#89b39a",
  },
};

export function Grid({
  remainingMs,
  totalMs,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);
  const units = unitCount(p.totalSeconds);
  const spent = Math.round(p.elapsedFraction * units);
  const columns = Math.ceil(Math.sqrt(units));

  return (
    <ClockFrame theme={gridTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div
          className={designs.dotGrid}
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          aria-hidden="true"
        >
          {Array.from({ length: units }, (_, i) => (
            <span
              key={i}
              className={designs.gridDot}
              style={{
                background: i < spent ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < spent ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "2.5cqmin" }}>
          <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state)}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
