import { useLocale } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1g — dual rings, native light. Outer = the run, inner = the day. */
export const orbitTheme: ClockTheme = {
  light: {
    background: "#fdf3ec",
    ink: "#3a2e26",
    accent: "#c96a30",
    onAccent: "#ffffff",
    muted: "#8b7261",
  },
  dark: {
    background: "#1c1410",
    ink: "#f6e9df",
    accent: "#f0925f",
    onAccent: "#1c1410",
    muted: "#b79a86",
  },
};

const OUTER = 112;
const INNER = 86;
const OUTER_C = 2 * Math.PI * OUTER;
const INNER_C = 2 * Math.PI * INNER;

export function Orbit({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const locale = useLocale();
  const p = clockProgress(remainingMs, totalMs);
  // The inner ring fills with the day's sessions, capped at eight.
  const dayFraction = Math.min(1, session / 8);

  return (
    <ClockFrame theme={orbitTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <svg viewBox="0 0 260 260" className={designs.svgSquare} aria-hidden="true">
          <circle
            cx="130"
            cy="130"
            r={OUTER}
            fill="none"
            stroke="var(--clk-muted)"
            strokeOpacity="0.3"
            strokeWidth="10"
          />
          <circle
            cx="130"
            cy="130"
            r={OUTER}
            fill="none"
            stroke="var(--clk-accent)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={OUTER_C}
            strokeDashoffset={OUTER_C * (1 - p.remainingFraction)}
            transform="rotate(-90 130 130)"
          />
          {showSession ? (
            <>
              <circle
                cx="130"
                cy="130"
                r={INNER}
                fill="none"
                stroke="var(--clk-muted)"
                strokeOpacity="0.25"
                strokeWidth="10"
              />
              <circle
                cx="130"
                cy="130"
                r={INNER}
                fill="none"
                stroke="var(--clk-ink)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={INNER_C}
                strokeDashoffset={INNER_C * (1 - dayFraction)}
                transform="rotate(-90 130 130)"
              />
            </>
          ) : null}
          <text
            x="130"
            y="128"
            textAnchor="middle"
            fontSize="38"
            fontWeight="500"
            fill="var(--clk-ink)"
            className={classes.time}
          >
            {p.time}
          </text>
          <text
            x="130"
            y="156"
            textAnchor="middle"
            fontSize="11"
            letterSpacing="3"
            fill="var(--clk-muted)"
          >
            {stateLabel(state).toLocaleUpperCase(locale)}
            {showSession ? (
              <tspan data-testid="clock-session"> {"\u00b7"} {session}</tspan>
            ) : null}
          </text>
        </svg>
      </div>
    </ClockFrame>
  );
}
