import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1d (third set) — a rolling counter in a recessed housing, native dark. */
export const odometerTheme: ClockTheme = {
  light: {
    background: "#e6e2dc",
    ink: "#1e1c1a",
    accent: "#6b5c46",
    onAccent: "#f0ead9",
    muted: "#665f56",
  },
  dark: {
    background: "#1e1c1a",
    ink: "#f0ead9",
    accent: "#c8b48c",
    onAccent: "#1e1c1a",
    muted: "#9d938a",
  },
};

export function Odometer({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const digits = [...p.minutes, ...p.seconds];

  return (
    <ClockFrame theme={odometerTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "6cqmin" }}>
        <div className={designs.drumHousing}>
          {digits.map((digit, i) => (
            <span key={i} className={`${designs.drum} ${classes.time} ${designs.mono}`}>
              {digit}
            </span>
          ))}
        </div>
        <span className={classes.label}>{t("odometerLine", { label: stateLabel(state) })}</span>
      </div>
    </ClockFrame>
  );
}
