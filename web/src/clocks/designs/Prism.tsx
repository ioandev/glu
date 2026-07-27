import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1r (second set) — a gradient ring turning once per run, native dark. */
export const prismTheme: ClockTheme = {
  light: {
    background: "#f2f2f6",
    ink: "#16161c",
    accent: "#2f6f8f",
    onAccent: "#ffffff",
    muted: "#5f5f70",
  },
  dark: {
    background: "#0e0e12",
    ink: "#f4f4f8",
    accent: "#47e5bc",
    onAccent: "#052019",
    muted: "#90909f",
  },
};

export function Prism({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  const angle = p.elapsedFraction * 360;

  return (
    <ClockFrame theme={prismTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.prismWrap}>
          {/* The mockup's four fixed hues become mixes of the design's own
              tokens, so the ring still recolours with the palette (ADR 15). */}
          <span
            className={designs.prismRing}
            style={{ transform: `rotate(${angle}deg)` }}
            aria-hidden="true"
          />
          <div className={designs.overlayCenter}>
            <span className={classes.time} style={{ fontSize: "12cqmin" }}>
              {p.time}
            </span>
            <span className={classes.label}>{stateLabel(state)}</span>
          </div>
        </div>
      </div>
    </ClockFrame>
  );
}
