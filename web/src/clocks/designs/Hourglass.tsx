import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1a (second set) — falling sand, native light. No session count. */
export const hourglassTheme: ClockTheme = {
  light: {
    background: "#f6f1e8",
    ink: "#2e2b26",
    accent: "#b9741a",
    onAccent: "#ffffff",
    muted: "#766952",
  },
  dark: {
    background: "#191510",
    ink: "#f4ece0",
    accent: "#e0a43c",
    onAccent: "#241905",
    muted: "#a89a80",
  },
};

export function Hourglass({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={hourglassTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.hourglass} aria-hidden="true">
          <div className={`${designs.hgBulb} ${designs.hgTop}`}>
            <span
              className={designs.hgSand}
              style={{ height: `${p.remainingFraction * 100}%` }}
            />
          </div>
          <span className={designs.hgNeck} />
          <div className={`${designs.hgBulb} ${designs.hgBottom}`}>
            <span
              className={designs.hgSand}
              style={{ height: `${p.elapsedFraction * 100}%` }}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "9cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state)}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
