import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1n (third set) — a city going up block by block, native dark. */
export const skylineTheme: ClockTheme = {
  light: {
    background: "#eef1fb",
    ink: "#1a2036",
    accent: "#3d51c4",
    onAccent: "#ffffff",
    muted: "#5a6484",
  },
  dark: {
    background: "#1a2036",
    ink: "#eef1fb",
    accent: "#7c93f2",
    onAccent: "#141834",
    muted: "#8e98b8",
  },
};

/** A fixed skyline — the same city on every render (ADR 07's purity rule). */
const HEIGHTS = [35, 55, 42, 70, 50, 88, 62, 95, 58, 78, 46, 66];

export function Skyline({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const built = Math.round(p.elapsedFraction * HEIGHTS.length);

  return (
    <ClockFrame theme={skylineTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "flex-end", gap: "5cqmin" }}>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={classes.time} style={{ fontSize: "12cqmin", fontWeight: 500 }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state, "building")}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
        <div className={designs.skylineRow} aria-hidden="true">
          {HEIGHTS.map((height, i) => (
            <span
              key={i}
              className={designs.building}
              style={{
                height: `${height}%`,
                background: i < built ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < built ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      </div>
    </ClockFrame>
  );
}
