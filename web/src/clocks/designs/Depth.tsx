import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1w (third set) — a diver going deeper into the work, native dark. */
export const depthTheme: ClockTheme = {
  light: {
    background: "#e7f3fa",
    ink: "#07253c",
    accent: "#17638f",
    onAccent: "#ffffff",
    muted: "#486e87",
  },
  dark: {
    background: "#071527",
    ink: "#dff2fc",
    accent: "#6fc3df",
    onAccent: "#04121f",
    muted: "#87abc0",
  },
};

export function Depth({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const dive = 6 + p.elapsedFraction * 74;
  // One metre a minute — the depth is the work done, in the run's own units.
  const metres = Math.round(p.elapsedFraction * p.totalMinutes);

  return (
    <ClockFrame theme={depthTheme} accent={accent} state={state}>
      <span className={designs.water} aria-hidden="true" />
      <span className={designs.diver} style={{ top: `${dive}%` }} aria-hidden="true" />
      <span className={`${classes.label} ${designs.depthMark}`} style={{ top: `${dive}%` }}>
        {t("depthMetres", { metres })}
      </span>
      <div className={designs.depthFoot}>
        <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 500 }}>
          {p.time}
        </span>
        <span className={classes.label}>{stateLabel(state, "deepWork")}</span>
      </div>
    </ClockFrame>
  );
}
