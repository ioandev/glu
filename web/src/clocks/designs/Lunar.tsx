import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1f (second set) — a row of moons waxing across the run, native dark. */
export const lunarTheme: ClockTheme = {
  light: {
    background: "#eef0f7",
    ink: "#1a1e2b",
    accent: "#3f4a6b",
    onAccent: "#ffffff",
    muted: "#626b82",
  },
  dark: {
    background: "#12141c",
    ink: "#e9ecf5",
    accent: "#c3cbe4",
    onAccent: "#12141c",
    muted: "#8a92a8",
  },
};

const MOONS = 8;

export function Lunar({
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
    <ClockFrame theme={lunarTheme} accent={accent} state={state}>
      <div className={classes.center} style={{ gap: "7cqmin" }}>
        <span className={classes.time} style={{ fontSize: "16cqmin" }}>
          {p.time}
        </span>
        <div className={designs.moonRow} aria-hidden="true">
          {Array.from({ length: MOONS }, (_, i) => {
            const fill = Math.min(1, Math.max(0, p.elapsedFraction * MOONS - i));
            return (
              <span
                key={i}
                className={designs.moon}
                style={{
                  background: `linear-gradient(90deg, var(--clk-accent) ${fill * 100}%, transparent ${fill * 100}%)`,
                }}
              />
            );
          })}
        </div>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {t("lunarLine", { label: stateLabel(state) })}
          {showSession ? ` · ${session}` : ""}
        </span>
      </div>
    </ClockFrame>
  );
}
