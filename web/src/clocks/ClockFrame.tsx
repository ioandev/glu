import type { CSSProperties, ReactNode } from "react";
import type { ClockTheme } from "@/theme/palette";
import type { TimerStatus } from "@/store/types";
import classes from "./clock.module.css";

/**
 * Every clock renders inside this frame. It does three jobs:
 *
 *  - publishes the design's palette as `--clk-*` variables using `light-dark()`,
 *    so flipping the colour scheme is pure CSS and never a re-render;
 *  - establishes a **size container**, so designs can size themselves in `cqmin`
 *    and fill any aspect ratio — the mockups' 340×460 card is a preview size,
 *    not a contract;
 *  - sets `isolation: isolate`, which is what keeps the `mix-blend-mode`
 *    designs (Pill, Tide, Field) blending against their own background instead
 *    of whatever the page is painted (ADR 07).
 */
export function ClockFrame({
  theme,
  accent,
  state,
  children,
  className,
  style,
}: {
  theme: ClockTheme;
  accent?: string;
  state: TimerStatus;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const vars = {
    "--clk-bg": `light-dark(${theme.light.background}, ${theme.dark.background})`,
    "--clk-ink": `light-dark(${theme.light.ink}, ${theme.dark.ink})`,
    "--clk-accent": accent ?? `light-dark(${theme.light.accent}, ${theme.dark.accent})`,
    "--clk-on-accent": `light-dark(${theme.light.onAccent}, ${theme.dark.onAccent})`,
    "--clk-muted": `light-dark(${theme.light.muted}, ${theme.dark.muted})`,
  } as CSSProperties;

  return (
    <div
      className={`${classes.frame}${className ? ` ${className}` : ""}`}
      style={{ ...vars, ...style }}
      data-state={state}
    >
      {children}
    </div>
  );
}

/**
 * The one place a clock's status copy is decided. Per-state artwork is future
 * polish (ADR 07); a state-aware label is what makes paused and finished render
 * sanely on all 18 designs today.
 */
export function stateLabel(state: TimerStatus, running = "Focus"): string {
  if (state === "paused") return "Paused";
  if (state === "finished") return "Done";
  if (state === "idle") return "Ready";
  return running;
}

/** Session copy: a bare count, never "N/target" — GLU has no target concept. */
export function sessionLabel(session: number): string {
  return `${session}`;
}
