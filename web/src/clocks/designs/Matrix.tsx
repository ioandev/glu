import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1r (third set) — an 8×8 grid filling in, native dark. */
export const matrixTheme: ClockTheme = {
  light: {
    background: "#eef7f0",
    ink: "#0f2415",
    accent: "#12805a",
    onAccent: "#ffffff",
    muted: "#476b52",
  },
  dark: {
    background: "#101210",
    ink: "#d9f2dd",
    accent: "#34d399",
    onAccent: "#04170f",
    muted: "#6f9a7c",
  },
};

const CELLS = 64;

export function Matrix({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const filled = Math.round(p.elapsedFraction * CELLS);

  return (
    <ClockFrame theme={matrixTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div className={designs.matrixGrid} aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => (
            <span
              key={i}
              className={designs.matrixCell}
              style={{
                background: i < filled ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < filled ? 1 : 0.22,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "8.5cqmin" }}>
            {p.time}
          </span>
          <span className={classes.label}>
            {t("percentThenLabel", {
              percent: Math.round(p.elapsedFraction * 100),
              label: stateLabel(state),
            })}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
