import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1i (third set) — rings radiating outward as the work lands, native dark. */
export const rippleTheme: ClockTheme = {
  light: {
    background: "#eaf5fa",
    ink: "#0f1c22",
    accent: "#146c8c",
    onAccent: "#ffffff",
    muted: "#4a6f83",
  },
  dark: {
    background: "#0f1c22",
    ink: "#e6f7fd",
    accent: "#4cc9f0",
    onAccent: "#03212c",
    muted: "#7fa9bb",
  },
};

const RINGS = 5;

export function Ripple({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={rippleTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.stackCenter}>
          {Array.from({ length: RINGS }, (_, i) => {
            const size = 26 + i * 18;
            const lit = p.elapsedFraction * RINGS >= i + 0.5;
            return (
              <span
                key={i}
                className={designs.rippleRing}
                style={{
                  width: `${size}cqmin`,
                  height: `${size}cqmin`,
                  opacity: lit ? 0.9 - i * 0.15 : 0.12,
                }}
                aria-hidden="true"
              />
            );
          })}
          <div className={designs.overlayCenter}>
            <span className={classes.time} style={{ fontSize: "12cqmin" }}>
              {p.time}
            </span>
            <span className={classes.label}>{stateLabel(state, "radiating")}</span>
          </div>
        </div>
      </div>
    </ClockFrame>
  );
}
