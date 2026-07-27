import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1j (third set) — the word FOCUS inking in from the bottom, native light. */
export const inkTheme: ClockTheme = {
  light: {
    background: "#efeae2",
    ink: "#262119",
    accent: "#7a5b2e",
    onAccent: "#ffffff",
    muted: "#6d6454",
  },
  dark: {
    background: "#17140f",
    ink: "#f0e9dd",
    accent: "#d8b87c",
    onAccent: "#1e1607",
    muted: "#a1957f",
  },
};

export function Ink({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={inkTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "4cqmin" }}>
        <span className={designs.inkWord}>
          {t("inkFocus")}
          {/* Fills from the bottom with the work done — clipped, not blended, so
              both layers stay ink-on-background at every level. */}
          <span
            className={designs.inkFill}
            style={{ clipPath: `inset(${(1 - p.elapsedFraction) * 100}% 0 0 0)` }}
            aria-hidden="true"
          >
            {t("inkFocus")}
          </span>
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: "2.5cqmin" }}>
          <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "8cqmin" }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "leftInk")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
