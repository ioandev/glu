import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1k (second set) — a neumorphic dial pressed into the card, native light. */
export const softTheme: ClockTheme = {
  light: {
    background: "#e4e7ee",
    ink: "#3d4358",
    accent: "#5361d1",
    onAccent: "#ffffff",
    muted: "#5f6475",
  },
  dark: {
    background: "#1a1d26",
    ink: "#dfe3ee",
    accent: "#8f9bf0",
    onAccent: "#141726",
    muted: "#949bb0",
  },
};

export function Soft({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const dots = Math.min(session, 6);

  return (
    <ClockFrame theme={softTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div className={designs.softDial}>
          <svg viewBox="0 0 230 230" className={designs.svgFill} aria-hidden="true">
            <circle
              cx="115"
              cy="115"
              r="97"
              fill="none"
              stroke="var(--clk-accent)"
              strokeWidth="7"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 * p.elapsedFraction}
              transform="rotate(-90 115 115)"
            />
          </svg>
          <div className={designs.softWell}>
            <span className={classes.time} style={{ fontSize: "9cqmin", fontWeight: 500 }}>
              {p.time}
            </span>
            <span className={classes.label}>{stateLabel(state)}</span>
          </div>
        </div>
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
