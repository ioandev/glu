import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1k (third set) — one enormous figure on a flooded card, native dark. */
export const percentTheme: ClockTheme = {
  light: {
    background: "#e8e8fb",
    ink: "#23236b",
    accent: "#4646b8",
    onAccent: "#ffffff",
    muted: "#5656cb",
  },
  dark: {
    background: "#2b2b7a",
    ink: "#ffffff",
    accent: "#b8b8ef",
    onAccent: "#1a1a4d",
    muted: "#c3c3f2",
  },
};

export function Percent({
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
    <ClockFrame theme={percentTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "space-between" }}>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {t("percentProgress")}
          {showSession ? ` · ${session}` : ""}
        </span>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span className={`${designs.display} ${designs.percentFigure}`}>
            {Math.round(p.elapsedFraction * 100)}
          </span>
          <span className={`${designs.display} ${designs.percentSign}`}>%</span>
        </div>
        <div className={designs.rowBetween} style={{ alignItems: "baseline" }}>
          <span className={classes.time} style={{ fontSize: "8cqmin", fontWeight: 500 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "leftPercent")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
