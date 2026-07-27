import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1u (third set) — a journal appending a line a minute, native dark. */
export const logTheme: ClockTheme = {
  light: {
    background: "#eef6f0",
    ink: "#0c1210",
    accent: "#12703c",
    onAccent: "#ffffff",
    muted: "#4a6a55",
  },
  dark: {
    background: "#0c1210",
    ink: "#8ef0a8",
    accent: "#8ef0a8",
    onAccent: "#04150a",
    muted: "#5c8f6c",
  },
};

const LINES = 6;

export function Log({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const minutesIn = Math.floor((p.totalSeconds - p.remainingSeconds) / 60);

  return (
    <ClockFrame theme={logTheme} accent={accent} state={state}>
      <div
        className={`${classes.pad} ${designs.mono}`}
        style={{ justifyContent: "flex-end", gap: "1.5cqmin" }}
      >
        {Array.from({ length: LINES }, (_, i) => {
          const minute = minutesIn - (LINES - 1) + i;
          if (minute < 0) {
            return (
              <span key={i} className={designs.logDim}>
                ·
              </span>
            );
          }
          const current = minute === minutesIn;
          return (
            <span key={i} className={current ? designs.logLive : designs.logDone}>
              {current
                ? t("logInProgress", { minute: String(minute).padStart(2, "0") })
                : t("logLogged", { minute: String(minute).padStart(2, "0") })}
            </span>
          );
        })}
        <span className={classes.time} style={{ fontSize: "9cqmin", marginTop: "3cqmin" }}>
          {"▼"} {t("logRemaining", { time: p.time })}
        </span>
        <span className={classes.label}>{stateLabel(state)}</span>
      </div>
    </ClockFrame>
  );
}
