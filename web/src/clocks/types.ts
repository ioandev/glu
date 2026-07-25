import type { ComponentType } from "react";
import type { ClockTheme } from "@/theme/palette";
import type { TimerStatus } from "@/store/types";

/**
 * The one props contract all 18 clocks implement (ADR 07). Pure functions of
 * their props: no `Date.now()`, no internal timers — the 50 ms tick (ADR 02)
 * drives them from outside, which is what makes them storybookable at any
 * frozen instant and cheap to test.
 */
export interface ClockProps {
  remainingSeconds: number;
  /**
   * A ring cannot draw an arc from `remaining` alone; every geometry needs the
   * fraction. Only Terminal *displays* it.
   */
  totalSeconds: number;
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
