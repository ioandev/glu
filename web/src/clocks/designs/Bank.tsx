import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1h (third set) — coins earned, stacking upward, native light. */
export const bankTheme: ClockTheme = {
  light: {
    background: "#fdf6e3",
    ink: "#6b4e12",
    accent: "#a8791a",
    onAccent: "#ffffff",
    muted: "#7e6a3a",
  },
  dark: {
    background: "#1a150a",
    ink: "#f7e9c4",
    accent: "#f0c454",
    onAccent: "#241a03",
    muted: "#b09b6a",
  },
};

const COINS = 12;

export function Bank({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const earned = Math.round(p.elapsedFraction * COINS);

  return (
    <ClockFrame theme={bankTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "flex-end", gap: "5cqmin" }}>
        <div className={designs.coinStack} aria-hidden="true">
          {Array.from({ length: COINS }, (_, i) => (
            <span
              key={i}
              className={designs.coin}
              style={{
                background: i < earned ? "var(--clk-accent)" : "var(--clk-bg)",
                borderColor: i < earned ? "var(--clk-ink)" : "var(--clk-muted)",
                opacity: i < earned ? 1 : 0.45,
              }}
            />
          ))}
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
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state, "banking")}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
