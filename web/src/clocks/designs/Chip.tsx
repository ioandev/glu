import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1an (third set) — one pill on an empty card, native light. The
 * mockup's `+12:30` reads as a stopwatch; GLU's chip shows the time left, so
 * the plus sign goes (ADR 45).
 */
export const chipTheme: ClockTheme = {
  light: {
    background: "#f2f1ef",
    ink: "#1c1b19",
    accent: "#15803d",
    onAccent: "#ffffff",
    muted: "#6b6a66",
  },
  dark: {
    background: "#17171a",
    ink: "#f0efec",
    accent: "#22c55e",
    onAccent: "#04170c",
    muted: "#9a9a96",
  },
};

export function Chip({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={chipTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.chipPill}>
          <span className={designs.chipDot} aria-hidden="true" />
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "8cqmin" }}>
            {p.time}
          </span>
        </div>
        <span className={classes.label}>{stateLabel(state)}</span>
      </div>
    </ClockFrame>
  );
}
