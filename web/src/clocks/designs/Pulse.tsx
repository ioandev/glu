import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1y (third set) — a heartbeat trace drawing itself, native dark. */
export const pulseTheme: ClockTheme = {
  light: {
    background: "#fdeef3",
    ink: "#3d1122",
    accent: "#c01d4f",
    onAccent: "#ffffff",
    muted: "#8a5068",
  },
  dark: {
    background: "#160d12",
    ink: "#ffe3ec",
    accent: "#ff4d7d",
    onAccent: "#2c0512",
    muted: "#b07c8e",
  },
};

const TRACE =
  "M0 35 L60 35 L72 12 L86 58 L98 35 L170 35 L182 20 L194 50 L204 35 L276 35";

export function Pulse({
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
    <ClockFrame theme={pulseTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "5cqmin" }}>
        <svg viewBox="0 0 276 70" className={designs.traceSvg} aria-hidden="true">
          <path
            d={TRACE}
            fill="none"
            stroke="var(--clk-muted)"
            strokeOpacity="0.4"
            strokeWidth="3"
          />
          <path
            d={TRACE}
            fill="none"
            stroke="var(--clk-accent)"
            strokeWidth="3"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 * p.remainingFraction}
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5cqmin" }}>
          <span className={classes.time} style={{ fontSize: "15cqmin", fontWeight: 500 }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state, "stillAlive")}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
