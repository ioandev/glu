import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/**
 * Mockup 1ad (third set) — minutes over seconds at poster scale, native dark.
 * The sheet calls it "Broadside Up"; ADR 07's Broadside is a different design,
 * so this one is Marquee.
 */
export const marqueeTheme: ClockTheme = {
  light: {
    background: "#f2f2f2",
    ink: "#191919",
    accent: "#4a4a4a",
    onAccent: "#ffffff",
    muted: "#5e5e5e",
  },
  dark: {
    background: "#191919",
    ink: "#f2f2f2",
    accent: "#bdbdbd",
    onAccent: "#191919",
    muted: "#8f8f8f",
  },
};

export function Marquee({
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

  return (
    <ClockFrame theme={marqueeTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "space-between" }}>
        <span className={classes.label}>{stateLabel(state)}</span>
        <div className={`${designs.display} ${classes.time} ${designs.marqueeStack}`}>
          <span>{p.minutes}</span>
          <span className={designs.marqueeSeconds}>{p.seconds}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2cqmin" }}>
          <span className={designs.hairTrack} aria-hidden="true">
            <span
              className={designs.hairFill}
              style={{ width: `${p.elapsedFraction * 100}%` }}
            />
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {t("marqueeCountingDown")}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
