import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1l (third set) — a playhead crossing a timeline, native light. */
export const rulerTheme: ClockTheme = {
  light: {
    background: "#fbfaf7",
    ink: "#1c1b18",
    accent: "#c9432a",
    onAccent: "#ffffff",
    muted: "#736e5b",
  },
  dark: {
    background: "#141312",
    ink: "#f2efe8",
    accent: "#e4593a",
    onAccent: "#2a0d06",
    muted: "#a9a291",
  },
};

const TICKS = 26;

export function Ruler({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // The scale is the run itself, not the mockup's hard-coded 25 minutes.
  const marks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => Math.round(p.totalMinutes * f));

  return (
    <ClockFrame theme={rulerTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "5cqmin" }}>
        <span className={classes.time} style={{ fontSize: "17cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <div className={designs.rulerBed} aria-hidden="true">
          <div className={designs.rulerTicks}>
            {Array.from({ length: TICKS }, (_, i) => (
              <span
                key={i}
                className={designs.rulerTick}
                style={{ height: i % 5 === 0 ? "5cqmin" : "2.6cqmin" }}
              />
            ))}
          </div>
          <span
            className={designs.playhead}
            style={{ left: `${p.elapsedFraction * 100}%` }}
          />
        </div>
        <div className={designs.rowBetween}>
          {marks.map((minute, i) => (
            <span key={i} className={classes.label} style={{ letterSpacing: "0.1em" }}>
              {minute}
            </span>
          ))}
        </div>
        <span className={classes.label}>{stateLabel(state)}</span>
      </div>
    </ClockFrame>
  );
}
