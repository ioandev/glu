import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1z (third set) — a glass filling as the run is poured out, native
 * light. Named Pour because ADR 42's Glass already holds the frosted card.
 */
export const pourTheme: ClockTheme = {
  light: {
    background: "#eef6ee",
    ink: "#2e4a34",
    accent: "#3d8a52",
    onAccent: "#ffffff",
    muted: "#54725b",
  },
  dark: {
    background: "#0f1a12",
    ink: "#dcf0e0",
    accent: "#69b578",
    onAccent: "#08190d",
    muted: "#85ab8d",
  },
};

export function Pour({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={pourTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div className={designs.tumbler} aria-hidden="true">
          <span
            className={designs.tumblerFill}
            style={{ height: `${p.elapsedFraction * 100}%` }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "pouring")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
