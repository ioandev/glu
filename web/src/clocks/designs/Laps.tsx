import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ac (third set) — five laps of an orbit per run, native dark. */
export const lapsTheme: ClockTheme = {
  light: {
    background: "#eafaf4",
    ink: "#0c2b23",
    accent: "#0f7a63",
    onAccent: "#ffffff",
    muted: "#48756a",
  },
  dark: {
    background: "#101422",
    ink: "#eafcf5",
    accent: "#63e6be",
    onAccent: "#04211a",
    muted: "#7f93b5",
  },
};

const LAPS = 5;

export function Laps({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const angle = ((p.elapsedFraction * LAPS) % 1) * 360;
  const lap = Math.min(LAPS, Math.floor(p.elapsedFraction * LAPS) + 1);

  return (
    <ClockFrame theme={lapsTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.orbitField} aria-hidden="true">
          <span className={designs.orbitPath} />
          <span className={designs.cometArm} style={{ transform: `rotate(${angle}deg)` }}>
            <span className={designs.cometBody} />
          </span>
          <div className={designs.overlayCenter}>
            <span className={classes.time} style={{ fontSize: "11cqmin" }}>
              {p.time}
            </span>
            <span className={classes.label}>
              {t("lapsCounter", { lap, total: LAPS })}
            </span>
          </div>
        </div>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {stateLabel(state)}
          {showSession ? ` · ${session}` : ""}
        </span>
      </div>
    </ClockFrame>
  );
}
