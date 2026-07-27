import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1aa (third set) — a fat half-moon meter, native light. */
export const dialTheme: ClockTheme = {
  light: {
    background: "#fdfbf6",
    ink: "#123f3a",
    accent: "#0f766e",
    onAccent: "#ffffff",
    muted: "#5b756d",
  },
  dark: {
    background: "#0c1a18",
    ink: "#e2f2ef",
    accent: "#4bbfae",
    onAccent: "#041512",
    muted: "#87a9a3",
  },
};

const ARC = "M18 128 A107 107 0 0 1 232 128";

export function Dial({
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
    <ClockFrame theme={dialTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "1cqmin" }}>
        <svg viewBox="0 0 250 135" className={designs.gaugeSvg} aria-hidden="true">
          <path d={ARC} fill="none" stroke="var(--clk-muted)" strokeOpacity="0.3" strokeWidth="24" />
          <path
            d={ARC}
            fill="none"
            stroke="var(--clk-accent)"
            strokeWidth="24"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 * p.remainingFraction}
          />
        </svg>
        <span className={classes.time} style={{ fontSize: "14cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state)}
          {showSession ? ` · ${session}` : ""}
        </span>
      </div>
    </ClockFrame>
  );
}
