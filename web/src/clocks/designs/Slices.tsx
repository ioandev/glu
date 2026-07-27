import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1ae (third set) — a pie accumulating, native light. The mirror of
 * ADR 42's Wedge, which empties: this one fills with what you have earned.
 */
export const slicesTheme: ClockTheme = {
  light: {
    background: "#fff8ec",
    ink: "#92500a",
    accent: "#b8630a",
    onAccent: "#ffffff",
    muted: "#896939",
  },
  dark: {
    background: "#1e1408",
    ink: "#fbe6c6",
    accent: "#d97706",
    onAccent: "#241000",
    muted: "#b08e5c",
  },
};

export function Slices({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const degrees = p.elapsedFraction * 360;

  return (
    <ClockFrame theme={slicesTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div
          className={designs.pie}
          style={{
            background: `conic-gradient(var(--clk-accent) ${degrees}deg, color-mix(in srgb, var(--clk-accent) 20%, var(--clk-bg)) ${degrees}deg)`,
          }}
          aria-hidden="true"
        />
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "earning")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
