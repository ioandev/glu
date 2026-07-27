import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1m (third set) — a sphere inflating with the work, native light. */
export const bubbleTheme: ClockTheme = {
  light: {
    background: "#f2e8f5",
    ink: "#331545",
    accent: "#7b2fb5",
    onAccent: "#ffffff",
    muted: "#6b5178",
  },
  dark: {
    background: "#180d20",
    ink: "#f1e3f8",
    accent: "#9d4edd",
    onAccent: "#ffffff",
    muted: "#a284b5",
  },
};

export function Bubble({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const size = 16 + p.elapsedFraction * 62;

  return (
    <ClockFrame theme={bubbleTheme} accent={accent} state={state}>
      <span
        className={designs.bubble}
        style={{ width: `${size}cqmin`, height: `${size}cqmin` }}
        aria-hidden="true"
      />
      {/* The mockup floats the readout on `mix-blend-mode: difference`; GLU uses
          the plate ADR 07 settled on, so the time is legible at every size. */}
      <div className={`${designs.overlayCenter} ${designs.plate}`}>
        <span className={classes.time} style={{ fontSize: "13cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={classes.label}>{stateLabel(state, "growingBubble")}</span>
      </div>
    </ClockFrame>
  );
}
