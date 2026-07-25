import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2a — an occluding disc slides across, native dark. No session. */
export const eclipseTheme: ClockTheme = {
  light: {
    background: "#eceae4",
    ink: "#1b1b20",
    accent: "#4a4a55",
    onAccent: "#f0ede6",
    muted: "#5c5c66",
  },
  dark: {
    background: "#101014",
    ink: "#f0ede6",
    accent: "#f0ede6",
    onAccent: "#101014",
    muted: "#8b8b95",
  },
};

export function Eclipse({ remainingSeconds, totalSeconds, state, accent }: ClockProps) {
  const p = clockProgress(remainingSeconds, totalSeconds);
  // Fully clear at the start, fully occluded at the end.
  const shift = -100 + p.elapsedFraction * 100;

  return (
    <ClockFrame theme={eclipseTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.eclipseWrap} aria-hidden="true">
          <div className={designs.eclipseDisc} />
          <div className={designs.eclipseMoon} style={{ transform: `translateX(${shift}%)` }} />
        </div>
        <div className={classes.center} style={{ gap: "1.5cqmin", height: "auto" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 500 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "Until break")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
