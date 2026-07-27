import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1u (second set) — a thermometer rising with the work, native light. */
export const mercuryTheme: ClockTheme = {
  light: {
    background: "#fff6f3",
    ink: "#3a1f1a",
    accent: "#c9432a",
    onAccent: "#ffffff",
    muted: "#8d6357",
  },
  dark: {
    background: "#201211",
    ink: "#ffe3da",
    accent: "#e4593a",
    onAccent: "#2a0d06",
    muted: "#bb8d81",
  },
};

export function Mercury({
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
  // The scale is the run, not a hard-coded 25 minutes: a 5-minute run must not
  // claim it goes to 25 (ADR 07's unit rule).
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(p.totalMinutes * f));

  return (
    <ClockFrame theme={mercuryTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "6cqmin" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2cqmin" }}>
          <span className={classes.time} style={{ fontSize: "15cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {t("mercuryLine", { label: stateLabel(state) })}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
        <div className={designs.thermometer} aria-hidden="true">
          <span className={designs.thermoBulb} />
          <span className={designs.thermoTube}>
            <span
              className={designs.thermoFill}
              style={{ width: `${p.elapsedFraction * 100}%` }}
            />
          </span>
        </div>
        <div className={designs.rowBetween} aria-hidden="true">
          {ticks.map((minute, i) => (
            <span key={i} className={classes.label} style={{ letterSpacing: "0.1em" }}>
              {minute}
            </span>
          ))}
        </div>
      </div>
    </ClockFrame>
  );
}
