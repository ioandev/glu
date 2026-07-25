import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1e — brutalist dashed ring + percent, native dark. */
export const monoTheme: ClockTheme = {
  light: {
    background: "#f5f5f5",
    ink: "#0c0c0c",
    accent: "#0c0c0c",
    onAccent: "#f5f5f5",
    muted: "#5e5e5e",
  },
  dark: {
    background: "#0c0c0c",
    ink: "#f5f5f5",
    accent: "#f5f5f5",
    onAccent: "#0c0c0c",
    muted: "#8a8a8a",
  },
};

const R = 100;
const CIRC = 2 * Math.PI * R;

export function Mono({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={monoTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "space-between" }}>
        <div className={designs.rowBetween}>
          <span className={`${classes.label} ${designs.mono}`}>Timer_01</span>
          <span className={`${classes.label} ${designs.mono}`}>
            {Math.round(p.elapsedFraction * 100)}%
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", flex: 1, minHeight: 0 }}>
          <svg viewBox="0 0 230 230" className={designs.svgSquare} aria-hidden="true">
            <circle
              cx="115"
              cy="115"
              r={R}
              fill="none"
              stroke="var(--clk-muted)"
              strokeWidth="2"
              strokeDasharray="3 6"
            />
            <circle
              cx="115"
              cy="115"
              r={R}
              fill="none"
              stroke="var(--clk-accent)"
              strokeWidth="2"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - p.remainingFraction)}
              transform="rotate(-90 115 115)"
            />
            <text
              x="115"
              y="112"
              textAnchor="middle"
              fontSize="36"
              fill="var(--clk-ink)"
              fontFamily="var(--glu-font-mono), monospace"
              className={classes.time}
            >
              {p.time}
            </text>
            <text
              x="115"
              y="142"
              textAnchor="middle"
              fontSize="11"
              letterSpacing="3"
              fill="var(--clk-muted)"
              fontFamily="var(--glu-font-mono), monospace"
            >
              {stateLabel(state).toUpperCase()}
            </text>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          {showSession ? (
            <span className={`${classes.label} ${designs.mono}`} data-testid="clock-session">
              [ {session} ]
            </span>
          ) : null}
        </div>
      </div>
    </ClockFrame>
  );
}
