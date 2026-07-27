import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1o (third set) — a marker climbing a rail, native light. */
export const altitudeTheme: ClockTheme = {
  light: {
    background: "#e9f2f9",
    ink: "#153a5f",
    accent: "#2563ab",
    onAccent: "#ffffff",
    muted: "#4e6c88",
  },
  dark: {
    background: "#0c1722",
    ink: "#dce9f5",
    accent: "#5fa3e0",
    onAccent: "#08131e",
    muted: "#8fa9c1",
  },
};

export function Altitude({
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
  const climbed = p.elapsedFraction * 100;

  return (
    <ClockFrame theme={altitudeTheme} accent={accent} state={state}>
      <div className={designs.altitudeRow}>
        <div className={designs.rail} aria-hidden="true">
          <span className={designs.railFill} style={{ height: `${climbed}%` }} />
          <span className={designs.railMarker} style={{ bottom: `calc(${climbed}% - 2.4cqmin)` }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2cqmin" }}>
          <span className={classes.time} style={{ fontSize: "15cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {t("altitudeLine", {
              label: stateLabel(state, "ascending"),
              percent: Math.round(climbed),
            })}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
