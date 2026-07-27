import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1am (third set) — the run as a drafting figure, native dark. */
export const blueprintTheme: ClockTheme = {
  light: {
    background: "#e8eff7",
    ink: "#123657",
    accent: "#b5820c",
    onAccent: "#ffffff",
    muted: "#4a6b87",
  },
  dark: {
    background: "#12365c",
    ink: "#eaf3fb",
    accent: "#ffd166",
    onAccent: "#2b2100",
    muted: "#a8c6de",
  },
};

export function Blueprint({
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
    <ClockFrame theme={blueprintTheme} accent={accent} state={state}>
      <span className={designs.grid28} aria-hidden="true" />
      <div className={classes.pad} style={{ justifyContent: "center", gap: "3.5cqmin" }}>
        <span className={classes.label} data-testid={showSession ? "clock-session" : undefined}>
          {t("blueprintFigure")}
          {showSession ? ` · ${session}` : ""}
        </span>
        <span className={`${classes.time} ${designs.mono}`} style={{ fontSize: "19cqmin" }}>
          {p.time}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "3cqmin" }}>
          <span className={designs.dimensionLine} aria-hidden="true">
            <span className={designs.dimensionEnd} style={{ left: 0 }} />
            <span className={designs.dimensionEnd} style={{ right: 0 }} />
            <span
              className={designs.dimensionDot}
              style={{ left: `${p.elapsedFraction * 100}%` }}
            />
          </span>
          <span className={classes.label}>{stateLabel(state)}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
