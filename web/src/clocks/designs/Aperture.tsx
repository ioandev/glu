import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1as (third set) — an iris opening onto the readout, native dark. */
export const apertureTheme: ClockTheme = {
  light: {
    background: "#f5f2ea",
    ink: "#141414",
    accent: "#5c5c56",
    onAccent: "#f5f2ea",
    muted: "#63625c",
  },
  dark: {
    background: "#141414",
    ink: "#f5f2ea",
    accent: "#c9c6bd",
    onAccent: "#141414",
    muted: "#928f88",
  },
};

export function Aperture({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // The mockup's iris closes to 32px and swallows its own readout. Here it
  // opens instead, and never below the size the time needs (ADR 45).
  const iris = 62 + p.elapsedFraction * 32;

  return (
    <ClockFrame theme={apertureTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "5cqmin" }}>
        <div className={designs.aperturePlate}>
          <div className={designs.iris} style={{ width: `${iris}%`, height: `${iris}%` }}>
            <span className={`${classes.time} ${designs.apertureTime}`}>{p.time}</span>
          </div>
        </div>
        <span className={classes.label}>{stateLabel(state, "apertureOpening")}</span>
      </div>
    </ClockFrame>
  );
}
