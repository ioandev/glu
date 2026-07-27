import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1p (third set) — beads counted along a string, native light. */
export const beadsTheme: ClockTheme = {
  light: {
    background: "#f7f1ea",
    ink: "#4a3b2a",
    accent: "#a44f30",
    onAccent: "#ffffff",
    muted: "#796753",
  },
  dark: {
    background: "#1a1410",
    ink: "#f0e4d6",
    accent: "#c97a58",
    onAccent: "#22100a",
    muted: "#a89076",
  },
};

const BEADS = 12;

export function Beads({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const counted = Math.round(p.elapsedFraction * BEADS);

  return (
    <ClockFrame theme={beadsTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "7cqmin" }}>
        <div className={designs.beadString} aria-hidden="true">
          <span className={designs.beadWire} />
          {Array.from({ length: BEADS }, (_, i) => (
            <span
              key={i}
              className={designs.bead}
              style={{
                background: i < counted ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < counted ? 1 : 0.35,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "counting")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
