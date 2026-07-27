import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1l (second set) — a frosted card over a lit gradient, native dark. */
export const glassTheme: ClockTheme = {
  light: {
    background: "#eaf1ea",
    ink: "#16324f",
    accent: "#2b6a6c",
    onAccent: "#ffffff",
    muted: "#546f5a",
  },
  dark: {
    background: "#16324f",
    ink: "#f4f8f4",
    accent: "#ffd97a",
    onAccent: "#16324f",
    muted: "#a8c3ad",
  },
};

export function Glass({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={glassTheme} accent={accent} state={state}>
      <span className={designs.glassWash} aria-hidden="true" />
      <span className={designs.glassBloom} aria-hidden="true" />
      <div className={designs.glassCard}>
        <span className={`${classes.label} ${designs.glassInk}`} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state)}
          {showSession ? ` · ${session}` : ""}
        </span>
        <span
          className={`${classes.time} ${designs.glassInk}`}
          style={{ fontSize: "16cqmin", fontWeight: 500 }}
        >
          {p.time}
        </span>
        <span className={designs.glassTrack} aria-hidden="true">
          <span
            className={designs.glassTrackFill}
            style={{ width: `${p.elapsedFraction * 100}%` }}
          />
        </span>
      </div>
    </ClockFrame>
  );
}
