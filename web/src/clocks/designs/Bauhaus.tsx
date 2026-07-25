import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2i — a rotating half-disc, native light. */
export const bauhausTheme: ClockTheme = {
  light: {
    background: "#f2ede3",
    ink: "#22222a",
    accent: "#2f4b8f",
    onAccent: "#f2ede3",
    muted: "#6b6656",
  },
  dark: {
    background: "#16161c",
    ink: "#f0ebe1",
    accent: "#7b95d8",
    onAccent: "#16161c",
    muted: "#9c9689",
  },
};

export function Bauhaus({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);
  const rotation = p.elapsedFraction * 360 - 90;

  return (
    <ClockFrame theme={bauhausTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "space-between" }}>
        <div className={designs.rowBetween}>
          <span className={classes.label}>{stateLabel(state)}</span>
          <span className={designs.bauhausSquare} aria-hidden="true" />
        </div>
        <div className={designs.bauhausDisc} aria-hidden="true">
          <div className={designs.bauhausHalf} style={{ transform: `rotate(${rotation}deg)` }} />
          <div className={designs.bauhausPin} />
        </div>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={classes.time} style={{ fontSize: "12cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          {showSession ? (
            <span className={classes.label} data-testid="clock-session">
              {session}
            </span>
          ) : null}
        </div>
      </div>
    </ClockFrame>
  );
}
