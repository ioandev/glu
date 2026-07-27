import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1n (second set) — forty lines fading out left to right, native light. */
export const barcodeTheme: ClockTheme = {
  light: {
    background: "#f7f5f0",
    ink: "#191817",
    accent: "#191817",
    onAccent: "#f7f5f0",
    muted: "#6f6c64",
  },
  dark: {
    background: "#131211",
    ink: "#f0ede6",
    accent: "#f0ede6",
    onAccent: "#131211",
    muted: "#9b968b",
  },
};

const LINES = 40;

export function Barcode({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const inked = Math.round(p.remainingFraction * LINES);

  return (
    <ClockFrame theme={barcodeTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "6cqmin" }}>
        <div className={designs.barcodeRow} aria-hidden="true">
          {Array.from({ length: LINES }, (_, i) => (
            <span
              key={i}
              className={designs.barcodeLine}
              style={{
                background: i < inked ? "var(--clk-accent)" : "var(--clk-muted)",
                opacity: i < inked ? 1 : 0.22,
              }}
            />
          ))}
        </div>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "9.5cqmin" }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state)}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
