import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1aj (third set) — a glowing sign in a dark window, native dark. */
export const neonTheme: ClockTheme = {
  light: {
    background: "#eef7f8",
    ink: "#08222b",
    accent: "#0d6d7d",
    onAccent: "#ffffff",
    muted: "#4a6e75",
  },
  dark: {
    background: "#08080c",
    ink: "#7df9ff",
    accent: "#ff6ec7",
    onAccent: "#2a0620",
    muted: "#8b8ba0",
  },
};

export function Neon({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={neonTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "5cqmin" }}>
        <span className={`${classes.time} ${designs.mono} ${designs.neonTime}`}>{p.time}</span>
        <span className={designs.neonSub}>{stateLabel(state, "countingDownNeon")}</span>
        <span className={designs.neonTrack} aria-hidden="true">
          <span
            className={designs.neonFill}
            style={{ width: `${p.elapsedFraction * 100}%` }}
          />
        </span>
      </div>
    </ClockFrame>
  );
}
