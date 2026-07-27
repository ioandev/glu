import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1e (second set) — concentric squares dropping out, native light. */
export const nestTheme: ClockTheme = {
  light: {
    background: "#f0eee9",
    ink: "#25313f",
    accent: "#3c6396",
    onAccent: "#ffffff",
    muted: "#5e6a77",
  },
  dark: {
    background: "#131a22",
    ink: "#dfe7ef",
    accent: "#8fb3d9",
    onAccent: "#101922",
    muted: "#93a3b4",
  },
};

const RINGS = 6;

export function Nest({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const spent = Math.round(p.elapsedFraction * RINGS);

  return (
    <ClockFrame theme={nestTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <svg viewBox="0 0 230 230" className={designs.svgSquare} aria-hidden="true">
          {Array.from({ length: RINGS }, (_, i) => {
            const inset = 8 + i * 19;
            const side = 214 - i * 38;
            const done = i < spent;
            return (
              <rect
                key={i}
                x={inset}
                y={inset}
                width={side}
                height={side}
                rx="10"
                fill="none"
                stroke={done ? "var(--clk-muted)" : "var(--clk-accent)"}
                strokeOpacity={done ? 0.3 : 1 - i * 0.12}
                strokeWidth="10"
              />
            );
          })}
        </svg>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "9.5cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state)}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
