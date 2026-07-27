import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1v (second set) — outlined minutes draining from the top, native dark. */
export const ghostTheme: ClockTheme = {
  light: {
    background: "#f5f5f5",
    ink: "#111111",
    accent: "#444444",
    onAccent: "#ffffff",
    muted: "#5c5c5c",
  },
  dark: {
    background: "#111111",
    ink: "#f5f5f5",
    accent: "#cfcfcf",
    onAccent: "#111111",
    muted: "#8c8c8c",
  },
};

export function Ghost({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={ghostTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "2cqmin" }}>
        <span className={`${designs.ghostOutline} ${classes.time}`}>
          {p.minutes}
          {/* The solid copy is clipped to what is LEFT, so the minutes drain
              from the top as the run burns down. */}
          <span
            className={designs.ghostFill}
            style={{ clipPath: `inset(${p.elapsedFraction * 100}% 0 0 0)` }}
            aria-hidden="true"
          >
            {p.minutes}
          </span>
        </span>
        <span className={classes.label} style={{ letterSpacing: "0.5em" }}>
          {t("ghostLine", { seconds: p.seconds, label: stateLabel(state) })}
        </span>
      </div>
    </ClockFrame>
  );
}
