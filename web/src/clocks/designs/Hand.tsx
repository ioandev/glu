import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1q (third set) — one bare hand on an unnumbered dial, native dark. */
export const handTheme: ClockTheme = {
  light: {
    background: "#f4f4f0",
    ink: "#111110",
    accent: "#c9432a",
    onAccent: "#ffffff",
    muted: "#66655e",
  },
  dark: {
    background: "#111110",
    ink: "#f5f5ef",
    accent: "#e4593a",
    onAccent: "#2a0d06",
    muted: "#8e8d85",
  },
};

export function Hand({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // One turn across the run — the hand sweeps like a stopwatch, the digits
  // still count down (ADR 45).
  const angle = p.elapsedFraction * 360;

  return (
    <ClockFrame theme={handTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div className={designs.bareDial} aria-hidden="true">
          {[0, 90, 180, 270].map((deg) => (
            <span key={deg} className={designs.dialPip} style={{ transform: `rotate(${deg}deg)` }} />
          ))}
          <span className={designs.dialHand} style={{ transform: `rotate(${angle}deg)` }} />
          <span className={designs.dialHub} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "9cqmin" }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state)}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
