import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1af (third set) — sixty ticks lighting up around the face, native
 * dark. The sheet calls it "Meridian Up"; ADR 07's Meridian is its own design.
 */
export const ticksTheme: ClockTheme = {
  light: {
    background: "#fdeef3",
    ink: "#3a1420",
    accent: "#c03a63",
    onAccent: "#ffffff",
    muted: "#8a5f6c",
  },
  dark: {
    background: "#1c1417",
    ink: "#fdf0f4",
    accent: "#ff8fab",
    onAccent: "#2a0a14",
    muted: "#a97f8c",
  },
};

const TICKS = 60;

export function Ticks({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const lit = Math.round(p.elapsedFraction * TICKS);

  return (
    <ClockFrame theme={ticksTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.tickFace}>
          {Array.from({ length: TICKS }, (_, i) => (
            <span
              key={i}
              className={designs.tick}
              style={{
                transform: `rotate(${i * 6}deg)`,
                background: i < lit ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < lit ? 1 : 0.3,
              }}
              aria-hidden="true"
            />
          ))}
          <div className={designs.overlayCenter}>
            <span
              className={`${classes.time} ${designs.mono}`}
              style={{ fontSize: "11cqmin", fontWeight: 500 }}
            >
              {p.time}
            </span>
            <span className={classes.label}>{stateLabel(state, "lightingUp")}</span>
          </div>
        </div>
      </div>
    </ClockFrame>
  );
}
