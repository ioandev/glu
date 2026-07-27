import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1m (second set) — one body, one orbit per run, native dark. */
export const cometTheme: ClockTheme = {
  light: {
    background: "#f1eefb",
    ink: "#1b1636",
    accent: "#8a6d1f",
    onAccent: "#ffffff",
    muted: "#5d5588",
  },
  dark: {
    background: "#0d0b1e",
    ink: "#efeaff",
    accent: "#ffe08a",
    onAccent: "#17123a",
    muted: "#8a82c0",
  },
};

export function Comet({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // Exactly one revolution across the run — the orbit *is* the progress bar.
  const angle = p.elapsedFraction * 360;

  return (
    <ClockFrame theme={cometTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.orbitField} aria-hidden="true">
          <span className={designs.orbitPath} />
          <span className={designs.cometArm} style={{ transform: `rotate(${angle}deg)` }}>
            <span className={designs.cometBody} />
          </span>
          <div className={designs.overlayCenter}>
            <span className={classes.time} style={{ fontSize: "12cqmin" }}>
              {p.time}
            </span>
            <span className={classes.label}>{stateLabel(state, "orbit")}</span>
          </div>
        </div>
        {showSession ? (
          <span className={classes.label} data-testid="clock-session">
            {session}
          </span>
        ) : null}
      </div>
    </ClockFrame>
  );
}
