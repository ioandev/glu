import type { ComponentType } from "react";
import type { ClockTheme } from "@/theme/palette";
import type { TimerStatus } from "@/store/types";

/**
 * The one props contract all 18 clocks implement (ADR 07). Pure functions of
 * their props: no `Date.now()`, no internal timers — the frame tick (ADR 02)
 * drives them from outside, which is what makes them storybookable at any
 * frozen instant and cheap to test.
 */
export interface ClockProps {
  /**
   * Milliseconds, not seconds (ADR 07, amended 2026-07-25). Whole seconds cap
   * every geometry at one move per second no matter how often the clock
   * re-renders — sub-second precision is the whole of what makes a ring sweep
   * instead of tick. `clockProgress` still rounds for the digits.
   */
  remainingMs: number;
  /**
   * A ring cannot draw an arc from `remaining` alone; every geometry needs the
   * fraction. Only Terminal *displays* it.
   */
  totalMs: number;
  /** Completed sessions today — a bare count, no target (ADR 07). */
  session: number;
  showSession: boolean;
  state: TimerStatus;
  /** Optional per-design accent override; defaults come from the design. */
  accent?: string;
}

export interface ClockDefinition {
  id: string;
  name: string;
  component: ComponentType<ClockProps>;
  theme: ClockTheme;
  showsSession: boolean;
  showsTotal: boolean;
  /** The scheme the mockup was drawn in; the other is GLU's own design work. */
  nativeScheme: "light" | "dark";
}
