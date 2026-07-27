import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1al (third set) — five strength bars climbing, native dark. */
export const signalTheme: ClockTheme = {
  light: {
    background: "#eef4fa",
    ink: "#0d1c2b",
    accent: "#12658f",
    onAccent: "#ffffff",
    muted: "#4c637a",
  },
  dark: {
    background: "#11151a",
    ink: "#e8f1fa",
    accent: "#38bdf8",
    onAccent: "#04202e",
    muted: "#7f97ac",
  },
};

const BARS = [22, 40, 58, 76, 94];

export function Signal({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const lit = Math.round(p.elapsedFraction * BARS.length);

  return (
    <ClockFrame theme={signalTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "7cqmin" }}>
        <div className={designs.signalRow} aria-hidden="true">
          {BARS.map((height, i) => (
            <span
              key={i}
              className={designs.signalBar}
              style={{
                height: `${height}%`,
                background: i < lit ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < lit ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        <div className={classes.center} style={{ gap: "1.5cqmin", height: "auto" }}>
          <span className={classes.time} style={{ fontSize: "12cqmin", fontWeight: 500 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "focusSignal")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
