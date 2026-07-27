import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1d (second set) — four warm tubes over a hairline bar, native dark. */
export const nixieTheme: ClockTheme = {
  light: {
    background: "#f7f0e9",
    ink: "#2a201a",
    accent: "#a6540f",
    onAccent: "#ffffff",
    muted: "#7d5f45",
  },
  dark: {
    background: "#171310",
    ink: "#ffdcb8",
    accent: "#ffab5e",
    onAccent: "#2a1607",
    muted: "#a8836a",
  },
};

export function Nixie({
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
  const digits = [...p.minutes, ...p.seconds];

  return (
    <ClockFrame theme={nixieTheme} accent={accent} state={state}>
      <div className={classes.center}>
        <div className={designs.tubeRow}>
          {digits.map((digit, i) => (
            <span key={i} className={`${designs.tube} ${classes.time}`}>
              {digit}
            </span>
          ))}
        </div>
        <div className={classes.center} style={{ gap: "2.5cqmin", height: "auto" }}>
          <span className={designs.track} aria-hidden="true">
            <span
              className={designs.trackFill}
              style={{ width: `${p.elapsedFraction * 100}%` }}
            />
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {stateLabel(state)}
            {showSession ? t("nixieTube", { session }) : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
