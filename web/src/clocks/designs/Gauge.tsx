import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1g (third set) — a speedometer of work done, native dark. */
export const gaugeTheme: ClockTheme = {
  light: {
    background: "#f4f2ee",
    ink: "#17171c",
    accent: "#9a6b06",
    onAccent: "#ffffff",
    muted: "#66646e",
  },
  dark: {
    background: "#17171c",
    ink: "#f5f5f0",
    accent: "#f0b429",
    onAccent: "#1d1503",
    muted: "#9d9daa",
  },
};

const ARC = "M20 140 A105 105 0 0 1 230 140";

export function Gauge({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const needle = -90 + p.elapsedFraction * 180;

  return (
    <ClockFrame theme={gaugeTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "2cqmin" }}>
        <svg viewBox="0 0 250 150" className={designs.gaugeSvg} aria-hidden="true">
          <path
            d={ARC}
            fill="none"
            stroke="var(--clk-muted)"
            strokeOpacity="0.35"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d={ARC}
            fill="none"
            stroke="var(--clk-accent)"
            strokeWidth="16"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 * p.remainingFraction}
          />
          <line
            x1="125"
            y1="140"
            x2="125"
            y2="55"
            stroke="var(--clk-ink)"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${needle} 125 140)`}
          />
          <circle cx="125" cy="140" r="9" fill="var(--clk-ink)" />
        </svg>
        <span className={classes.time} style={{ fontSize: "12cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={classes.label}>{stateLabel(state, "momentumGauge")}</span>
      </div>
    </ClockFrame>
  );
}
