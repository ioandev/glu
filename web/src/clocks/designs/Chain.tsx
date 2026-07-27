import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1x (third set) — links forged one at a time, native light. */
export const chainTheme: ClockTheme = {
  light: {
    background: "#f0efec",
    ink: "#2b2a27",
    accent: "#2b2a27",
    onAccent: "#f0efec",
    muted: "#696861",
  },
  dark: {
    background: "#171614",
    ink: "#eceae4",
    accent: "#eceae4",
    onAccent: "#171614",
    muted: "#9a978e",
  },
};

const LINKS = 8;

export function Chain({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const forged = Math.round(p.elapsedFraction * LINKS);

  return (
    <ClockFrame theme={chainTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "7cqmin" }}>
        <div className={designs.chainRow} aria-hidden="true">
          {Array.from({ length: LINKS }, (_, i) => (
            <span
              key={i}
              className={designs.link}
              style={{
                borderColor: i < forged ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < forged ? 1 : 0.35,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "dontBreakIt")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
