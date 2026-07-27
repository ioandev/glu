import { useLocale } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1b — 60 tick marks light up, native dark. Light rendition is GLU's. */
export const meridianTheme: ClockTheme = {
  light: {
    background: "#f3f5f2",
    ink: "#1b2129",
    accent: "#0f8f70",
    onAccent: "#ffffff",
    muted: "#5a6470",
  },
  dark: {
    background: "#16181d",
    ink: "#f2f4f1",
    accent: "#7ee8c7",
    onAccent: "#0b1a16",
    muted: "#8a94a1",
  },
};

const TICKS = 60;

export function Meridian({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const locale = useLocale();
  const p = clockProgress(remainingMs, totalMs);
  const lit = Math.round(p.remainingFraction * TICKS);

  return (
    <ClockFrame theme={meridianTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <svg viewBox="0 0 260 260" className={designs.svgSquare} aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => (
            <rect
              key={i}
              x="128.5"
              y="6"
              width="3"
              height="16"
              rx="1.5"
              fill={i < lit ? "var(--clk-accent)" : "var(--clk-muted)"}
              fillOpacity={i < lit ? 1 : 0.3}
              transform={`rotate(${i * (360 / TICKS)} 130 130)`}
            />
          ))}
          <text
            x="130"
            y="128"
            textAnchor="middle"
            fontSize="40"
            fontWeight="500"
            fill="var(--clk-ink)"
            fontFamily="var(--glu-font-mono), monospace"
            className={classes.time}
          >
            {p.time}
          </text>
          <text
            x="130"
            y="152"
            textAnchor="middle"
            fontSize="11"
            letterSpacing="2"
            fill="var(--clk-muted)"
            fontFamily="var(--glu-font-mono), monospace"
          >
            {stateLabel(state).toLocaleUpperCase(locale)}
            {showSession ? (
              <tspan data-testid="clock-session"> {"\u00b7"} {session}</tspan>
            ) : null}
          </text>
        </svg>
      </div>
    </ClockFrame>
  );
}
