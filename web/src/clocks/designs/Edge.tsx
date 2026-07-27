import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2j — the card border itself is the progress stroke, native light. */
export const edgeTheme: ClockTheme = {
  light: {
    background: "#ffffff",
    ink: "#1f1e1b",
    accent: "#1f1e1b",
    onAccent: "#ffffff",
    muted: "#6d6a63",
  },
  dark: {
    background: "#0f0f0e",
    ink: "#f2f1ec",
    accent: "#f2f1ec",
    onAccent: "#0f0f0e",
    muted: "#98958d",
  },
};

const W = 340;
const H = 460;
const PERIMETER = 2 * (W - 6) + 2 * (H - 6);

export function Edge({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={edgeTheme} accent={accent} state={state}>
      <svg
        className={designs.svgFill}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width={W - 6}
          height={H - 6}
          rx="25"
          fill="none"
          stroke="var(--clk-muted)"
          strokeOpacity="0.3"
          strokeWidth="5"
        />
        <rect
          x="3"
          y="3"
          width={W - 6}
          height={H - 6}
          rx="25"
          fill="none"
          stroke="var(--clk-accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={PERIMETER}
          strokeDashoffset={PERIMETER * (1 - p.remainingFraction)}
        />
      </svg>
      <div className={classes.center} style={{ gap: "2cqmin" }}>
        <span className={classes.time} style={{ fontSize: "18cqmin", letterSpacing: "-0.02em" }}>
          {p.time}
        </span>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state)}
          {showSession ? ` \u00b7 ${session}` : ""}
        </span>
      </div>
    </ClockFrame>
  );
}
