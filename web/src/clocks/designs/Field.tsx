import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1h — rising fill with blend-mode text, native light. No session. */
export const fieldTheme: ClockTheme = {
  light: {
    background: "#d8d4cd",
    ink: "#3c3a36",
    accent: "#3c3a36",
    onAccent: "#d8d4cd",
    muted: "#5d5a53",
  },
  dark: {
    background: "#22211e",
    ink: "#ded9d0",
    accent: "#c8c2b6",
    onAccent: "#22211e",
    muted: "#a8a297",
  },
};

export function Field({ remainingMs, totalMs, state, accent }: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={fieldTheme} accent={accent} state={state}>
      <div
        className={designs.fillLayer}
        style={{ height: `${p.elapsedFraction * 100}%` }}
        aria-hidden="true"
      />
      {/* Readout plate rather than `mix-blend-mode: difference` — see the note
          in Tide. */}
      <div className={`${designs.overlayCenter} ${designs.plate}`}>
        <span className={classes.time} style={{ fontSize: "24cqmin", lineHeight: 1 }}>
          {p.minutes}
        </span>
        <span className={classes.time} style={{ fontSize: "24cqmin", lineHeight: 1 }}>
          {p.seconds}
        </span>
        <span className={designs.mono} style={{ fontSize: "3cqmin", letterSpacing: "0.3em" }}>
          {stateLabel(state).toUpperCase()}
        </span>
      </div>
    </ClockFrame>
  );
}
