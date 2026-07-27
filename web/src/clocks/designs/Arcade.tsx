import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1s (third set) — a score climbing while the clock runs out, native dark. */
export const arcadeTheme: ClockTheme = {
  light: {
    background: "#f3eefb",
    ink: "#1b0838",
    accent: "#b81358",
    onAccent: "#ffffff",
    muted: "#5c4a80",
  },
  dark: {
    background: "#0d0221",
    ink: "#f8f8ff",
    accent: "#ff2975",
    onAccent: "#22000d",
    muted: "#9a8ec0",
  },
};

const LIVES = 4;

export function Arcade({
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
  // Points for the seconds you have already put in — the score climbs, the
  // clock still runs out (ADR 45).
  const score = String((p.totalSeconds - p.remainingSeconds) * 40).padStart(6, "0");
  const lit = Math.min(LIVES, session);

  return (
    <ClockFrame theme={arcadeTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "4cqmin" }}>
        <span className={classes.label} style={{ letterSpacing: "0.5em" }}>
          {t("arcadeLine", { label: stateLabel(state) })}
        </span>
        <span className={`${designs.mono} ${designs.arcadeScore}`}>{score}</span>
        <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "6cqmin" }}>
          {t("arcadeTime", { time: p.time })}
        </span>
        {showSession ? (
          <div className={designs.lifeRow} data-testid="clock-session">
            {Array.from({ length: LIVES }, (_, i) => (
              <span key={i} className={designs.life} style={{ opacity: i < lit ? 1 : 0.25 }} />
            ))}
            <span className={classes.label}>{session}</span>
          </div>
        ) : null}
      </div>
    </ClockFrame>
  );
}
