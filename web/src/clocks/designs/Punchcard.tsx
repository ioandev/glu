import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress, unitCount } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ag (third set) — a card stamped a minute at a time, native light. */
export const punchcardTheme: ClockTheme = {
  light: {
    background: "#efe6d5",
    ink: "#4a3a1f",
    accent: "#7a5c22",
    onAccent: "#efe6d5",
    muted: "#706141",
  },
  dark: {
    background: "#191408",
    ink: "#efe6d5",
    accent: "#cbb98a",
    onAccent: "#191408",
    muted: "#a0906b",
  },
};

export function Punchcard({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const units = unitCount(p.totalSeconds);
  const stamped = Math.round(p.elapsedFraction * units);

  return (
    <ClockFrame theme={punchcardTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "5cqmin" }}>
        <span className={classes.label}>{t("punchcardTitle")}</span>
        <div className={designs.punchGrid} aria-hidden="true">
          {Array.from({ length: units }, (_, i) => {
            const done = i < stamped;
            return (
              <span
                key={i}
                className={done ? `${designs.punch} ${designs.punchDone}` : designs.punch}
              >
                {done ? "✕" : i + 1}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "stamping")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
