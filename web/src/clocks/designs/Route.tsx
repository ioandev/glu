import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ai (third set) — a winding path walked end to end, native light. */
export const routeTheme: ClockTheme = {
  light: {
    background: "#f5f2ec",
    ink: "#26415a",
    accent: "#3b6b8f",
    onAccent: "#ffffff",
    muted: "#616e61",
  },
  dark: {
    background: "#131a20",
    ink: "#e2ecf3",
    accent: "#6ba3c9",
    onAccent: "#0b1218",
    muted: "#93a5ab",
  },
};

const PATH =
  "M20 210 C120 210 140 160 60 150 C-10 140 40 90 120 95 C210 100 240 60 160 40 " +
  "C120 30 180 10 260 20";

export function Route({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={routeTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "4cqmin" }}>
        <svg viewBox="0 0 280 230" className={designs.routeSvg} aria-hidden="true">
          <path
            d={PATH}
            fill="none"
            stroke="var(--clk-muted)"
            strokeOpacity="0.4"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={PATH}
            fill="none"
            stroke="var(--clk-accent)"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 * p.remainingFraction}
          />
          <circle cx="20" cy="210" r="7" fill="var(--clk-accent)" />
          <circle
            cx="260"
            cy="20"
            r="7"
            fill="none"
            stroke="var(--clk-accent)"
            strokeWidth="3"
          />
        </svg>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "enRoute")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
