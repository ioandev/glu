import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ak (third set) — the run credited in five rows, native light. */
export const ledgerTheme: ClockTheme = {
  light: {
    background: "#fcfbf8",
    ink: "#1f1e1b",
    accent: "#7a5c22",
    onAccent: "#ffffff",
    muted: "#736f5c",
  },
  dark: {
    background: "#14130f",
    ink: "#f2efe6",
    accent: "#d3b471",
    onAccent: "#1d1503",
    muted: "#a09a89",
  },
};

/** Keyed, not worded — the phrases live in the catalog (ADR 44). */
const ROWS = [
  "ledgerDeepFocus",
  "ledgerSteadyWork",
  "ledgerPushThrough",
  "ledgerHomeStretch",
  "ledgerFinalSprint",
] as const;

export function Ledger({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  // Five equal stretches of the run — the mockup's rows are fixed at 5 minutes
  // each, which only adds up for a 25-minute pomodoro.
  const perRow = p.totalMinutes / ROWS.length;
  const minutesIn = p.elapsedFraction * p.totalMinutes;

  return (
    <ClockFrame theme={ledgerTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "2cqmin" }}>
        <div className={`${designs.rowBetween} ${designs.ledgerHead}`}>
          <span className={classes.time} style={{ fontSize: "9cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "credited")}</span>
        </div>
        {ROWS.map((label, i) => {
          const credited = Math.max(0, Math.min(perRow, minutesIn - i * perRow));
          const open = credited > 0;
          return (
            <div key={label} className={`${designs.ledgerRow} ${designs.mono}`}>
              <span className={designs.ledgerLabel}>{label}</span>
              <span style={{ color: open ? "var(--clk-ink)" : "var(--clk-muted)" }}>
                {t("ledgerCredited", { minutes: Math.round(credited) })}
              </span>
            </div>
          );
        })}
      </div>
    </ClockFrame>
  );
}
