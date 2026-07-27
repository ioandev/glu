import { useLocale, useTranslations } from "next-intl";
import { ClockFrame, useStateLabel } from "../ClockFrame";
import { spellMinutes } from "./wordsNumbers";
import { clockProgress } from "../progress";
import type { ClockProps } from "../types";
import type { ClockTheme } from "@/theme/palette";
import classes from "../clock.module.css";
import designs from "./designs.module.css";

/** Mockup 1q (second set) — the time spoken, not counted, native dark. */
export const wordsTheme: ClockTheme = {
  light: {
    background: "#f5f2ea",
    ink: "#1c1b1a",
    accent: "#7a5a2e",
    onAccent: "#ffffff",
    muted: "#6e695f",
  },
  dark: {
    background: "#1c1b1a",
    ink: "#f3efe6",
    accent: "#d8b979",
    onAccent: "#241d0d",
    muted: "#a49d8f",
  },
};

export function Words({
  remainingMs,
  totalMs,
  session,
  showSession,
  state,
  accent,
}: ClockProps) {
  const stateLabel = useStateLabel();
  const t = useTranslations("clock");
  const locale = useLocale();
  const p = clockProgress(remainingMs, totalMs);
  const minutes = Math.min(99, Math.ceil(p.remainingSeconds / 60));
  // The number is spelled by the locale's own rules (ADR 44): German compounds
  // and inverts, French counts the seventies in twenties, Chinese composes from
  // digits. See `wordsNumbers.ts` — this design is the only reader.
  const sentence =
    minutes === 0
      ? t("wordsUnderAMinute")
      : t("wordsSentence", { spelled: spellMinutes(minutes, locale), count: minutes });

  return (
    <ClockFrame theme={wordsTheme} accent={accent} state={state}>
      <div className={classes.pad} style={{ justifyContent: "center", gap: "4cqmin" }}>
        <span className={classes.label}>{t("wordsRightNow")}</span>
        <span className={designs.sentence}>{sentence}</span>
        {/* The mockup carries no digits at all. GLU keeps a small exact readout:
            every design in the roster answers "how long exactly?" — a clock
            that cannot is a different product (ADR 07's shared contract). */}
        <span
          className={`${classes.time} ${designs.mono}`}
          style={{ fontSize: "7cqmin", color: "var(--clk-accent)" }}
        >
          {p.time}
        </span>
        <span
          className={classes.label}
          style={{ marginTop: "2cqmin" }}
          data-testid={showSession ? "clock-session" : undefined}
        >
          {stateLabel(state, "thenABreak")}
          {showSession ? ` · ${session}` : ""}
        </span>
      </div>
    </ClockFrame>
  );
}
