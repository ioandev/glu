import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1t (second set) — a metronome, four full swings per run, native light. */
export const tempoTheme: ClockTheme = {
  light: {
    background: "#fbf8f1",
    ink: "#2f2a22",
    accent: "#b4552d",
    onAccent: "#ffffff",
    muted: "#7a6c57",
  },
  dark: {
    background: "#1b1813",
    ink: "#f3ece0",
    accent: "#d98a62",
    onAccent: "#22100a",
    muted: "#a1927b",
  },
};

const SWINGS = 4;
const AMPLITUDE = 24;

export function Tempo({
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
  // A slow beat that reads as motion without being a per-second tick: the arm
  // completes four swings across the whole run, whatever the run's length.
  const degrees = Math.sin(p.elapsedFraction * Math.PI * SWINGS * 2) * AMPLITUDE;
  const rotate = `rotate(${degrees} 100 190)`;

  return (
    <ClockFrame theme={tempoTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className={classes.label}>{t("tempoLine", { label: stateLabel(state) })}</span>
        <svg viewBox="0 0 200 210" className={designs.svgSquare} aria-hidden="true">
          <path
            d="M100 190 L60 20 L140 20 Z"
            fill="none"
            stroke="var(--clk-muted)"
            strokeOpacity="0.5"
            strokeWidth="3"
          />
          <line
            x1="100"
            y1="190"
            x2="100"
            y2="30"
            stroke="var(--clk-ink)"
            strokeWidth="5"
            strokeLinecap="round"
            transform={rotate}
          />
          <circle cx="100" cy="70" r="12" fill="var(--clk-accent)" transform={rotate} />
          <circle cx="100" cy="190" r="7" fill="var(--clk-ink)" />
        </svg>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          {showSession ? (
            <span className={classes.label} data-testid="clock-session">
              {session}
            </span>
          ) : null}
        </div>
      </div>
    </ClockFrame>
  );
}
