import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1a (third set) — a stopwatch ring, native light.
 *
 * The third sheet is drawn as a stopwatch: its rings grow and its readouts say
 * ELAPSED. GLU counts **down** (ADR 45), so the digits are `remaining` and the
 * ring keeps the sheet's growth — it is the work done, not the time left.
 */
export const sweepTheme: ClockTheme = {
  light: {
    background: "#faf7f2",
    ink: "#20241f",
    accent: "#2f7d5c",
    onAccent: "#ffffff",
    muted: "#687064",
  },
  dark: {
    background: "#101410",
    ink: "#eaf2e9",
    accent: "#5fc79a",
    onAccent: "#08170f",
    muted: "#93a795",
  },
};

const R = 110;

export function Sweep({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={sweepTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.stackCenter}>
          <svg viewBox="0 0 250 250" className={designs.svgSquare} aria-hidden="true">
            <circle
              cx="125"
              cy="125"
              r={R}
              fill="none"
              stroke="var(--clk-muted)"
              strokeOpacity="0.3"
              strokeWidth="8"
            />
            <circle
              cx="125"
              cy="125"
              r={R}
              fill="none"
              stroke="var(--clk-accent)"
              strokeWidth="8"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 * p.remainingFraction}
              transform="rotate(-90 125 125)"
            />
          </svg>
          <div className={designs.overlayCenter}>
            <span className={classes.time} style={{ fontSize: "13cqmin", fontWeight: 500 }}>
              {p.time}
            </span>
            <span className={classes.label}>{stateLabel(state)}</span>
          </div>
        </div>
      </div>
    </ClockFrame>
  );
}
