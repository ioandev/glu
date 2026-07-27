import { useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import { hash01 } from "./noise";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1v (third set) — a sky that fills in as you work, native dark. */
export const starsTheme: ClockTheme = {
  light: {
    background: "#eceefa",
    ink: "#0a0d1c",
    accent: "#3a4894",
    onAccent: "#ffffff",
    muted: "#5a6285",
  },
  dark: {
    background: "#0a0d1c",
    ink: "#e8ecff",
    accent: "#c9d2ff",
    onAccent: "#0a0d1c",
    muted: "#8b93b8",
  },
};

const STARS = 50;

export function Stars({ remainingMs, totalMs, state, accent }: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const p = clockProgress(remainingMs, totalMs);
  const lit = Math.round(p.elapsedFraction * STARS);
  // The mockup promises one star per 30 seconds; that only holds for a
  // 25-minute run, so the promise is stated from the run instead.
  const perStar = Math.max(1, Math.round(p.totalSeconds / STARS));

  return (
    <ClockFrame theme={starsTheme} accent={accent} state={state}>
      {Array.from({ length: STARS }, (_, i) => (
        <span
          key={i}
          className={designs.star}
          style={{
            left: `${hash01(i, 1) * 94 + 2}%`,
            top: `${hash01(i, 2) * 70 + 3}%`,
            opacity: i < lit ? 0.4 + hash01(i, 3) * 0.6 : 0,
          }}
          aria-hidden="true"
        />
      ))}
      <div className={designs.starFoot}>
        <span className={classes.time} style={{ fontSize: "12cqmin" }}>
          {p.time}
        </span>
        <span className={classes.label}>
          {t("starsLine", { seconds: perStar, label: stateLabel(state) })}
        </span>
      </div>
    </ClockFrame>
  );
}
