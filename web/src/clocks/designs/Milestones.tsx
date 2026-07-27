import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1ap (third set) — checkpoints ticked off down the run, native light. */
export const milestonesTheme: ClockTheme = {
  light: {
    background: "#fefcf9",
    ink: "#23211d",
    accent: "#2f7d5c",
    onAccent: "#ffffff",
    muted: "#757067",
  },
  dark: {
    background: "#151411",
    ink: "#f1eee8",
    accent: "#5cbf94",
    onAccent: "#06170f",
    muted: "#a09a90",
  },
};

/** Fractions of the run, so the list reads correctly at any duration. */
// `as const`, not `[number, string][]`: the second element has to stay a
// *literal* to be accepted as a message key (ADR 44).
const MARKS = [
  [0, "milestoneStarted"],
  [0.2, "milestoneSettledIn"],
  [0.5, "milestoneHalfway"],
  [0.8, "milestoneFinalStretch"],
  [1, "milestoneBreakEarned"],
] as const;

export function Milestones({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);

  return (
    <ClockFrame theme={milestonesTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center" }}>
        {MARKS.map(([at, label]) => {
          const done = at === 0 ? p.elapsedFraction > 0 : p.elapsedFraction >= at;
          return (
            <div key={label} className={designs.mileRow}>
              <span className={done ? `${designs.mileDot} ${designs.mileDone}` : designs.mileDot}>
                {done ? "✓" : ""}
              </span>
              <span className={designs.mileLabel} style={{ opacity: done ? 1 : 0.55 }}>
                {t("milestoneRow", { label: t(label), minutes: Math.round(p.totalMinutes * at) })}
              </span>
            </div>
          );
        })}
        <div className={designs.mileFoot}>
          <span className={classes.time} style={{ fontSize: "10cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "inSession")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
