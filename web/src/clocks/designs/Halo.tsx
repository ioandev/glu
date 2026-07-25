import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1a — classic ring, native light. The dark rendition is GLU's. */
export const haloTheme: ClockTheme = {
  light: {
    background: "#faf7f2",
    ink: "#2b2925",
    accent: "#c8452f",
    onAccent: "#ffffff",
    muted: "#6f675b",
  },
  dark: {
    background: "#17140f",
    ink: "#f3ece1",
    accent: "#ff8a72",
    onAccent: "#2a1109",
    muted: "#b2a794",
  },
};

const R = 110;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function Halo({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);
  // The arc shows what is LEFT — the mockup driver's `progress` was elapsed.
  const offset = CIRCUMFERENCE * (1 - p.remainingFraction);
  const dots = Math.min(session, 8);

  return (
    <ClockFrame theme={haloTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <svg viewBox="0 0 250 250" className={designs.svgSquare} aria-hidden="true">
          <circle
            cx="125"
            cy="125"
            r={R}
            fill="none"
            stroke="var(--clk-muted)"
            strokeOpacity="0.28"
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
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 125 125)"
          />
          <text
            x="125"
            y="122"
            textAnchor="middle"
            fontSize="46"
            fontWeight="500"
            fill="var(--clk-ink)"
            className={classes.time}
          >
            {p.time}
          </text>
          <text
            x="125"
            y="152"
            textAnchor="middle"
            fontSize="12"
            letterSpacing="4"
            fill="var(--clk-muted)"
          >
            {stateLabel(state).toUpperCase()}
          </text>
        </svg>
        {showSession ? (
          <div className={designs.dotRow} data-testid="clock-session">
            {Array.from({ length: dots }, (_, i) => (
              <span key={i} className={designs.dotFilled} />
            ))}
            <span className={classes.label}>{session}</span>
          </div>
        ) : null}
      </div>
    </ClockFrame>
  );
}
