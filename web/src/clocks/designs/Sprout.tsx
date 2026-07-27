import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ab (third set) — a stem growing out of a pot, native light. */
export const sproutTheme: ClockTheme = {
  light: {
    background: "#f2f7ee",
    ink: "#2f4a28",
    accent: "#4a8a3c",
    onAccent: "#ffffff",
    muted: "#587351",
  },
  dark: {
    background: "#111a0e",
    ink: "#e2f0dc",
    accent: "#7cc466",
    onAccent: "#0a1607",
    muted: "#8fae85",
  },
};

export function Sprout({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={sproutTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "flex-end", gap: "5cqmin" }}>
        <div className={designs.sproutStack} aria-hidden="true">
          <span className={designs.leaf} />
          <span
            className={designs.stem}
            style={{ height: `${4 + p.elapsedFraction * 48}cqmin` }}
          />
          <span className={designs.soil} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: "3cqmin",
          }}
        >
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "growingSprout")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
