import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import { hash01 } from "./noise";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1at (third set) — a piece of confetti per slice of work, native light. */
export const confettiTheme: ClockTheme = {
  light: {
    background: "#fdf9f0",
    ink: "#2b2620",
    accent: "#c9432a",
    onAccent: "#ffffff",
    muted: "#756d5f",
  },
  dark: {
    background: "#17140f",
    ink: "#f3ece0",
    accent: "#e4593a",
    onAccent: "#2a0d06",
    muted: "#a3998a",
  },
};

const PIECES = 50;
/** The mockup's five party colours, as mixes of the design's own two (ADR 15). */
const TINTS = [
  "var(--clk-accent)",
  "color-mix(in srgb, var(--clk-accent) 55%, var(--clk-ink))",
  "var(--clk-ink)",
  "color-mix(in srgb, var(--clk-accent) 40%, var(--clk-muted))",
  "var(--clk-muted)",
];

export function Confetti({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const thrown = Math.round(p.elapsedFraction * PIECES);

  return (
    <ClockFrame theme={confettiTheme} accent={accent} state={state}>
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          className={designs.confettiPiece}
          style={{
            width: `${4 + hash01(i, 4) * 6}cqmin`,
            left: `${hash01(i, 5) * 88 + 4}%`,
            top: `${hash01(i, 6) * 62 + 4}%`,
            transform: `rotate(${hash01(i, 8) * 180}deg)`,
            background: TINTS[i % TINTS.length],
            opacity: i < thrown ? 1 : 0.08,
          }}
          aria-hidden="true"
        />
      ))}
      <div className={designs.confettiFoot}>
        <span className={classes.time} style={{ fontSize: "13cqmin", fontWeight: 700 }}>
          {p.time}
        </span>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state, "celebratingEarly")}
          {showSession ? ` · ${session}` : ""}
        </span>
      </div>
    </ClockFrame>
  );
}
