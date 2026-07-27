import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1aq (third set) — the whole card warming through, native dark. */
export const heatTheme: ClockTheme = {
  light: {
    background: "#f3f0f5",
    ink: "#2b2d42",
    accent: "#c9432a",
    onAccent: "#ffffff",
    muted: "#5f6178",
  },
  dark: {
    background: "#2b2d42",
    ink: "#fdf3ee",
    accent: "#e4593a",
    onAccent: "#2a0d06",
    muted: "#a9abbe",
  },
};

export function Heat({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // The warm end creeps up the card as the run is spent.
  const stop = 90 - p.elapsedFraction * 80;

  return (
    <ClockFrame theme={heatTheme} accent={accent} state={state}>
      <span
        className={designs.heatWash}
        style={{
          background: `linear-gradient(160deg, var(--clk-bg) ${stop}%, var(--clk-accent) 130%)`,
        }}
        aria-hidden="true"
      />
      <div className={designs.overlayCenter} style={{ gap: "2cqmin" }}>
        <span className={classes.time} style={{ fontSize: "19cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={classes.label}>{stateLabel(state, "warmingUp")}</span>
      </div>
    </ClockFrame>
  );
}
