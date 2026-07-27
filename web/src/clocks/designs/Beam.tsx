import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1b (third set) — a growing bar under a big readout, native dark. */
export const beamTheme: ClockTheme = {
  light: {
    background: "#eef2f8",
    ink: "#14161b",
    accent: "#1f6f8b",
    onAccent: "#ffffff",
    muted: "#565d6d",
  },
  dark: {
    background: "#14161b",
    ink: "#f2f4f8",
    accent: "#5eead4",
    onAccent: "#06201c",
    muted: "#8d95a8",
  },
};

export function Beam({
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

  return (
    <ClockFrame theme={beamTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "5cqmin" }}>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state)}
          {showSession ? ` · ${session}` : ""}
        </span>
        <span className={classes.time} style={{ fontSize: "18cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={designs.beamTrack} aria-hidden="true">
          <span
            className={designs.beamFill}
            style={{ width: `${p.elapsedFraction * 100}%` }}
          />
        </span>
        <span className={classes.label} style={{ letterSpacing: "0.1em" }}>
          {t("beamDone", {
            percent: Math.round(p.elapsedFraction * 100),
            minutes: p.totalMinutes,
          })}
        </span>
      </div>
    </ClockFrame>
  );
}
