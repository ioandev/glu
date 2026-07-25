import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress, unitCount } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1f — depleting slats, native light. One slat per minute, capped. */
export const stackTheme: ClockTheme = {
  light: {
    background: "#eceaf7",
    ink: "#232144",
    accent: "#4b47c4",
    onAccent: "#ffffff",
    muted: "#5f5b8f",
  },
  dark: {
    background: "#12112a",
    ink: "#e6e4fb",
    accent: "#8f8bf0",
    onAccent: "#12112a",
    muted: "#9d99cf",
  },
};

export function Stack({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);
  const units = unitCount(p.totalSeconds);
  const spent = Math.round(p.elapsedFraction * units);

  return (
    <ClockFrame theme={stackTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ flexDirection: "row", gap: "6cqmin" }}>
        <div className={designs.slatColumn}>
          {Array.from({ length: units }, (_, i) => (
            <span
              key={i}
              className={designs.slat}
              style={{
                background: i < spent ? "var(--clk-muted)" : "var(--clk-accent)",
                opacity: i < spent ? 0.35 : 1,
              }}
            />
          ))}
        </div>
        <div className={designs.colEnd} style={{ flex: 1 }}>
          <span className={classes.time} style={{ fontSize: "16cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state)}
            {showSession ? ` \u00b7 ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
