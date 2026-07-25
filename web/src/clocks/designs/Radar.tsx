import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2h — a conic sweep with a needle, native dark. */
export const radarTheme: ClockTheme = {
  light: {
    background: "#eef7f0",
    ink: "#0f3d1e",
    accent: "#12833c",
    onAccent: "#ffffff",
    muted: "#3f7a52",
  },
  dark: {
    background: "#07120c",
    ink: "#b7f7c8",
    accent: "#4ade80",
    onAccent: "#07120c",
    muted: "#5f9a70",
  },
};

export function Radar({
  remainingSeconds,
  totalSeconds,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingSeconds, totalSeconds);
  // Needle and trail move by `transform`/`rotate` only — regenerating the conic
  // gradient 20x a second is jank on an old tablet (ADR 07).
  const angle = p.elapsedFraction * 360;

  return (
    <ClockFrame theme={radarTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.radarDish} aria-hidden="true">
          <div className={designs.radarTrail} style={{ transform: `rotate(${angle}deg)` }} />
          <div className={designs.radarRing} style={{ inset: "16%" }} />
          <div className={designs.radarRing} style={{ inset: "32%" }} />
          <div className={designs.radarNeedle} style={{ transform: `rotate(${angle}deg)` }} />
          <div className={designs.radarHub} />
        </div>
        <div className={classes.center} style={{ gap: "1cqmin", height: "auto" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "9cqmin" }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state, "Scanning")}
            {showSession ? ` \u00b7 ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
