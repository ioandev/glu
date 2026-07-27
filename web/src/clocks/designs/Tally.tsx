import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress, unitCount } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1c (third set) — minutes scored in fives, native light. */
export const tallyTheme: ClockTheme = {
  light: {
    background: "#f4f0e6",
    ink: "#2a2620",
    accent: "#a83a2b",
    onAccent: "#ffffff",
    muted: "#726757",
  },
  dark: {
    background: "#181510",
    ink: "#f0e9db",
    accent: "#e07a5f",
    onAccent: "#1e0d08",
    muted: "#a89a80",
  },
};

export function Tally({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const p = clockProgress(remainingMs, totalMs);
  // One mark per minute of the run, five to a group — capped like every other
  // unit design, so a 99-minute run does not overflow the card.
  const units = unitCount(p.totalSeconds);
  const scored = Math.round(p.elapsedFraction * units);
  const groups = Array.from({ length: Math.ceil(units / 5) }, (_, g) => {
    const size = Math.min(5, units - g * 5);
    const done = Math.min(size, Math.max(0, scored - g * 5));
    return { size, done };
  });

  return (
    <ClockFrame theme={tallyTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "6cqmin" }}>
        <div className={designs.tallyWrap} aria-hidden="true">
          {groups.map((group, g) => (
            <div key={g} className={designs.tallyGroup}>
              {Array.from({ length: Math.min(4, group.size) }, (_, i) => (
                <span
                  key={i}
                  className={designs.tallyMark}
                  style={{ opacity: i < group.done ? 1 : 0.25 }}
                />
              ))}
              {group.size === 5 ? (
                <span
                  className={designs.tallySlash}
                  style={{ opacity: group.done === 5 ? 1 : 0 }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "3cqmin" }}>
          <span className={classes.time} style={{ fontSize: "11cqmin", fontWeight: 700 }}>
            {p.time}
          </span>
          <span className={classes.label}>{stateLabel(state, "leftToScore")}</span>
        </div>
      </div>
    </ClockFrame>
  );
}
