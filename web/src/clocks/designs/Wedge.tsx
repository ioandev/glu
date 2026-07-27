import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1p (second set) — the kitchen dial, its wedge closing, native light. */
export const wedgeTheme: ClockTheme = {
  light: {
    background: "#fdeee8",
    ink: "#4a1c10",
    accent: "#c9432a",
    onAccent: "#ffffff",
    muted: "#8a5445",
  },
  dark: {
    background: "#241310",
    ink: "#fbe1d8",
    accent: "#e4593a",
    onAccent: "#2a0d06",
    muted: "#b98c7c",
  },
};

export function Wedge({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // The wedge is what is left, exactly like the dial you wound up.
  const degrees = p.remainingFraction * 360;

  return (
    <ClockFrame theme={wedgeTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div
          className={designs.wedgeDial}
          style={{
            background: `conic-gradient(var(--clk-accent) ${degrees}deg, color-mix(in srgb, var(--clk-accent) 22%, var(--clk-bg)) ${degrees}deg)`,
          }}
          aria-hidden="true"
        >
          <span className={designs.wedgePin} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "10.5cqmin", fontWeight: 700 }}>
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
