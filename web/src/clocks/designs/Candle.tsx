import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1g (second set) — a candle burning down to the holder, native dark. */
export const candleTheme: ClockTheme = {
  light: {
    background: "#f7efe2",
    ink: "#2c221a",
    accent: "#c26a12",
    onAccent: "#ffffff",
    muted: "#7b6550",
  },
  dark: {
    background: "#221c17",
    ink: "#f3e4c8",
    accent: "#ff9d3c",
    onAccent: "#2a1605",
    muted: "#a68a6d",
  },
};

export function Candle({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // The wax is what is left; the flame rides on top of it, never below the
  // holder.
  const waxHeight = 18 + p.remainingFraction * 42;

  return (
    <ClockFrame theme={candleTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "flex-end", gap: "5cqmin" }}>
        <div className={designs.candleStack} aria-hidden="true">
          {state === "finished" ? null : <span className={designs.flame} />}
          <span className={designs.wick} />
          <span className={designs.wax} style={{ height: `${waxHeight}cqmin` }} />
          <span className={designs.holder} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: "3cqmin",
          }}
        >
          <span className={classes.time} style={{ fontSize: "9.5cqmin", fontWeight: 500 }}>
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
