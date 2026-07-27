import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1b (second set) — twelve chunky arcs burning down, native dark. */
export const segmentTheme: ClockTheme = {
  light: {
    background: "#eef0ff",
    ink: "#1b1d2a",
    accent: "#4351c4",
    onAccent: "#ffffff",
    muted: "#5a5f7d",
  },
  dark: {
    background: "#1b1d2a",
    ink: "#eef0ff",
    accent: "#7c8cf8",
    onAccent: "#12142a",
    muted: "#8f96bb",
  },
};

const SEGMENTS = 12;
const R = 105;
const CIRC = 2 * Math.PI * R;
/** A hair of the arc is given back as the gap between segments. */
const ARC = (CIRC / SEGMENTS) * 0.78;

export function Segment({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const lit = Math.round(p.remainingFraction * SEGMENTS);

  return (
    <ClockFrame theme={segmentTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.stackCenter}>
          <svg viewBox="0 0 250 250" className={designs.svgSquare} aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <circle
                key={i}
                cx="125"
                cy="125"
                r={R}
                fill="none"
                stroke={i < lit ? "var(--clk-accent)" : "var(--clk-muted)"}
                strokeOpacity={i < lit ? 1 : 0.3}
                strokeWidth="22"
                strokeDasharray={`${ARC} ${CIRC - ARC}`}
                strokeDashoffset={-((i * CIRC) / SEGMENTS)}
                transform="rotate(-90 125 125)"
              />
            ))}
          </svg>
          <div className={designs.overlayCenter}>
            <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 500 }}>
              {p.time}
            </span>
            <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
              {stateLabel(state)}
              {showSession ? ` · ${session}` : ""}
            </span>
          </div>
        </div>
      </div>
    </ClockFrame>
  );
}
