import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1o (second set) — a battery draining, native dark. */
export const cellTheme: ClockTheme = {
  light: {
    background: "#eef6ef",
    ink: "#10240f",
    accent: "#2e7d3c",
    onAccent: "#ffffff",
    muted: "#4b7554",
  },
  dark: {
    background: "#101d13",
    ink: "#d9f5dd",
    accent: "#7fe08f",
    onAccent: "#0a1a0d",
    muted: "#79a683",
  },
};

export function Cell({
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
    <ClockFrame theme={cellTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "7cqmin" }}>
        <div className={designs.battery} aria-hidden="true">
          <div className={designs.batteryShell}>
            <span
              className={designs.batteryFill}
              style={{ width: `${p.remainingFraction * 100}%` }}
            />
          </div>
          <span className={designs.batteryNub} />
        </div>
        <div className={classes.center} style={{ gap: "1.5cqmin", height: "auto" }}>
          <span className={classes.time} style={{ fontSize: "13cqmin", fontWeight: 500 }}>
            {p.time}
          </span>
          <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
            {t("cellLine", { label: stateLabel(state) })}
            {showSession ? ` · ${session}` : ""}
          </span>
        </div>
      </div>
    </ClockFrame>
  );
}
