import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2e — a bold bar with blend-mode text, native light. */
export const pillTheme: ClockTheme = {
  light: {
    background: "#f5d90a",
    ink: "#1a1a1a",
    accent: "#1a1a1a",
    onAccent: "#f5d90a",
    muted: "#4a4406",
  },
  dark: {
    background: "#1a1a10",
    ink: "#f5d90a",
    accent: "#f5d90a",
    onAccent: "#1a1a10",
    muted: "#b3a12a",
  },
};

export function Pill({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);
  // The fill is geometry, so it takes the unrounded fraction and slides; the
  // readout is a number you read, so it stays whole.
  const percent = Math.round(p.elapsedFraction * 100);

  return (
    <ClockFrame theme={pillTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "4cqmin" }}>
        <span className={designs.pillCap} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state)}
          {showSession ? ` \u2014 ${session}` : ""}
        </span>
        <div className={designs.pillBar}>
          <div className={designs.pillFill} style={{ width: `${p.elapsedFraction * 100}%` }} />
          {/* The mockup blends the readout against a solid ink bar. Dropped for
              the same reason as Tide: the track is a tint of the ink instead, so
              the ink readout is legible across the whole bar at every fill
              level (ADR 07). */}
          <div className={designs.pillTime}>
            <span className={classes.time}>{p.time}</span>
          </div>
        </div>
        <span className={designs.pillCap} style={{ alignSelf: "flex-end" }}>
          {percent}% done
        </span>
      </div>
    </ClockFrame>
  );
}
