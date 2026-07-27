import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import { hash01 } from "./noise";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ao (third set) — the session recorded so far, native dark. */
export const waveformTheme: ClockTheme = {
  light: {
    background: "#f7f2ec",
    ink: "#171412",
    accent: "#a35a15",
    onAccent: "#ffffff",
    muted: "#786858",
  },
  dark: {
    background: "#171412",
    ink: "#f3e9dd",
    accent: "#f0a05a",
    onAccent: "#231202",
    muted: "#a4907c",
  },
};

const BARS = 40;

export function Waveform({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const recorded = Math.round(p.elapsedFraction * BARS);

  return (
    <ClockFrame theme={waveformTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "5cqmin" }}>
        <div className={designs.waveRow} aria-hidden="true">
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              className={designs.waveBar}
              style={{
                height: `${14 + hash01(i, 7) * 86}%`,
                background: i < recorded ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < recorded ? 1 : 0.28,
              }}
            />
          ))}
        </div>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "9.5cqmin" }}>
            {"●"} {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state, "rec")}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
