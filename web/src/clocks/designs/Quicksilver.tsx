import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1t (third set) — a rising column in a bulb thermometer, native light.
 * Named Quicksilver because ADR 42's Mercury already holds the horizontal one.
 */
export const quicksilverTheme: ClockTheme = {
  light: {
    background: "#fff4f0",
    ink: "#3a1f1a",
    accent: "#c9432a",
    onAccent: "#ffffff",
    muted: "#8d6357",
  },
  dark: {
    background: "#1e1110",
    ink: "#ffe0d6",
    accent: "#e4593a",
    onAccent: "#2a0d06",
    muted: "#b98c7c",
  },
};

export function Quicksilver({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={quicksilverTheme} accent={accent} state={state}>
      <div className={designs.columnRow}>
        <div className={designs.thermoStack} aria-hidden="true">
          <span className={designs.thermoColumn}>
            <span
              className={designs.thermoRise}
              style={{ height: `${p.elapsedFraction * 100}%` }}
            />
          </span>
          <span className={designs.thermoBall} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2cqmin" }}>
          <span className={classes.time} style={{ fontSize: "13cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "heatingUp")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
