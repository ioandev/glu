import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ar (third set) — a row tipping over one by one, native light. */
export const dominoesTheme: ClockTheme = {
  light: {
    background: "#eceff4",
    ink: "#252a33",
    accent: "#3f4c63",
    onAccent: "#ffffff",
    muted: "#606878",
  },
  dark: {
    background: "#14171d",
    ink: "#e6eaf2",
    accent: "#98a2b5",
    onAccent: "#14171d",
    muted: "#8e97a8",
  },
};

const TILES = 10;

export function Dominoes({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const tipped = Math.round(p.elapsedFraction * TILES);

  return (
    <ClockFrame theme={dominoesTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "8cqmin" }}>
        <div className={designs.dominoRow} aria-hidden="true">
          {Array.from({ length: TILES }, (_, i) => (
            <span
              key={i}
              className={designs.domino}
              style={{
                transform: i < tipped ? "rotate(62deg)" : "rotate(0deg)",
                background: i < tipped ? "var(--clk-muted)" : "var(--clk-ink)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "momentumDominoes")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
