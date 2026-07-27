import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1j (second set) — an unwinding coil, native light. No session count. */
export const spiralTheme: ClockTheme = {
  light: {
    background: "#fbf6ef",
    ink: "#4a3527",
    accent: "#b4552d",
    onAccent: "#ffffff",
    muted: "#7e6a54",
  },
  dark: {
    background: "#1c1511",
    ink: "#f2e3d3",
    accent: "#d98a62",
    onAccent: "#21100a",
    muted: "#a8907a",
  },
};

/** The mockup's coil, verbatim: eight half-turns of growing radius. */
const COIL =
  "M125 125 a12 12 0 0 1 0 24 a18 18 0 0 1 0 -36 a24 24 0 0 1 0 48 a30 30 0 0 1 0 -60 " +
  "a36 36 0 0 1 0 72 a42 42 0 0 1 0 -84 a48 48 0 0 1 0 96 a54 54 0 0 1 0 -108";

export function Spiral({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={spiralTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <svg viewBox="0 0 250 250" className={designs.svgSquare} aria-hidden="true">
          <path
            d={COIL}
            fill="none"
            stroke="var(--clk-muted)"
            strokeOpacity="0.28"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d={COIL}
            fill="none"
            stroke="var(--clk-accent)"
            strokeWidth="9"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            // The coil shows what is LEFT — the mockup driver's was elapsed.
            strokeDashoffset={100 * p.elapsedFraction}
          />
        </svg>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state)}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
