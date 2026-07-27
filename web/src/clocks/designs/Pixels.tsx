import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1s (second set) — one hundred cells, one per percent, native dark. */
export const pixelsTheme: ClockTheme = {
  light: {
    background: "#f4f0f8",
    ink: "#1a1520",
    accent: "#6d3fd4",
    onAccent: "#ffffff",
    muted: "#6d5f80",
  },
  dark: {
    background: "#141215",
    ink: "#efe9f5",
    accent: "#a583f8",
    onAccent: "#150a2b",
    muted: "#918099",
  },
};

const CELLS = 100;

export function Pixels({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const spent = Math.round(p.elapsedFraction * CELLS);

  return (
    <ClockFrame theme={pixelsTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div className={designs.pixelGrid} aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => (
            <span
              key={i}
              className={designs.pixel}
              style={{
                background: i < spent ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < spent ? 1 : 0.22,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "8.5cqmin" }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {t("percentThenLabel", { percent: spent, label: stateLabel(state) })}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
