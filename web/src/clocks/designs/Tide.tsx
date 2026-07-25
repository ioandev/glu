import { ClockFrame, stateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 2f — liquid fill with a wave edge, native light. No session. */
export const tideTheme: ClockTheme = {
  light: {
    background: "#e8f4f4",
    ink: "#0c3a3a",
    accent: "#17a2a2",
    onAccent: "#04211f",
    muted: "#37706f",
  },
  dark: {
    background: "#04211f",
    ink: "#d8f2f0",
    accent: "#2fd0c9",
    onAccent: "#04211f",
    muted: "#7cb8b3",
  },
};

export function Tide({ remainingMs, totalMs, state, accent }: ClockProps) {
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={tideTheme} accent={accent} state={state}>
      <div
        className={designs.fillLayer}
        style={{ height: `${p.elapsedFraction * 100}%` }}
        aria-hidden="true"
      >
        <svg
          className={designs.wave}
          viewBox="0 0 340 24"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 24 Q 42.5 0 85 12 T 170 12 T 255 12 T 340 12 L 340 24 Z"
            fill="var(--clk-accent)"
          />
        </svg>
      </div>
      {/* The mockup floats the readout on `mix-blend-mode: difference`. Dropped:
          difference against a mid-tone is genuinely low-contrast as the water
          line crosses the glyphs — and invisible to every contrast checker,
          which is worse. The readout gets its own plate instead, so it is
          ink-on-background at every fill level, in both schemes (ADR 07). */}
      <div className={`${designs.overlayCenter} ${designs.plate}`}>
        <span className={classes.time} style={{ fontSize: "16cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={designs.mono} style={{ fontSize: "3cqmin", letterSpacing: "0.3em" }}>
          {stateLabel(state, "Filling \u00b7 focus").toUpperCase()}
        </span>
      </div>
    </ClockFrame>
  );
}
