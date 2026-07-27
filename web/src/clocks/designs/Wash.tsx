import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1ah (third set) — ink flooding the card from the top, native light.
 * The sheet calls it "Mono Up"; ADR 07's Mono is a different design.
 */
export const washTheme: ClockTheme = {
  light: {
    background: "#d8d4cd",
    ink: "#3c3a36",
    accent: "#3c3a36",
    onAccent: "#d8d4cd",
    muted: "#5b5851",
  },
  dark: {
    background: "#2a2825",
    ink: "#e6e2da",
    accent: "#e6e2da",
    onAccent: "#2a2825",
    muted: "#a19c92",
  },
};

export function Wash({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const flood = p.elapsedFraction * 100;

  return (
    <ClockFrame theme={washTheme} accent={accent} state={state}>
      <span className={designs.washFlood} style={{ height: `${flood}%` }} aria-hidden="true" />
      {/* The mockup reverses the readout with `mix-blend-mode: difference`. GLU
          draws it twice and clips instead (ADR 07's ruling on Tide): ink on the
          bare card, background ink inside the flood — legible at every level and
          visible to a contrast checker. */}
      <div className={designs.washStack}>
        <span className={`${classes.time} ${designs.washDigits}`}>{p.minutes}</span>
        <span className={`${classes.time} ${designs.washDigits}`}>{p.seconds}</span>
        <span className={classes.label} style={{ marginTop: "3cqmin" }}>
          {stateLabel(state, "filling")}
        </span>
      </div>
      <div
        className={`${designs.washStack} ${designs.washInverse}`}
        style={{ clipPath: `inset(0 0 ${100 - flood}% 0)` }}
        aria-hidden="true"
      >
        <span className={`${classes.time} ${designs.washDigits}`}>{p.minutes}</span>
        <span className={`${classes.time} ${designs.washDigits}`}>{p.seconds}</span>
        <span className={classes.label} style={{ marginTop: "3cqmin", color: "inherit" }}>
          {stateLabel(state, "filling")}
        </span>
      </div>
    </ClockFrame>
  );
}
