"use client";

import { useEffect } from "react";

import { ClockGallery } from "@/components/clock/ClockGallery";
import { EnvironmentToggles } from "@/components/environment/EnvironmentToggles";
import { HeaderDrawer } from "@/components/chrome/HeaderDrawer";
import { PresetRow } from "@/components/timer/PresetRow";
import { TodoistPanel } from "@/components/todoist/TodoistPanel";
import { useHydrated } from "@/hooks/useHydrated";
import { useTimerHotkeys } from "@/hooks/useTimerHotkeys";
import { useSessionAlerts } from "@/hooks/useSessionAlerts";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useGluStore } from "@/store/gluStore";
import { useTodoistAuth } from "@/store/todoistAuth";
import { TimerPanel } from "./TimerPanel";
import classes from "./AppShell.module.css";

export function AppShell() {
  // Gate the timer on hydration so the sub-100 ms defaults→persisted swap never
  // shows the wrong time or the wrong clock (ADR 02, ADR 08).
  const hydrated = useHydrated();
  useTimerHotkeys();
  // Read-only consumer of timer status: it never transitions the machine (ADR 17).
  const status = useGluStore((s) => s.status);
  useWakeLock(status);
  useSessionAlerts(status, useGluStore((s) => s.total));

  // One status fetch for the whole app; every Todoist surface observes the
  // same store from here on (ADR 19).
  const refreshAuth = useTodoistAuth((s) => s.refresh);
  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  return (
    <div className={classes.shell}>
      <div className={classes.cornerToggle}>
        <HeaderDrawer />
      </div>

      <section className={classes.timerArea} aria-label="Timer">
        {/* DOM order is the phone order — the clock owns the first viewport.
            At/above `sm` the preset row is re-ordered above the clock in CSS. */}
        <div className={classes.clockSlot}>{hydrated ? <ClockGallery /> : null}</div>
        <div className={classes.presets}>{hydrated ? <PresetRow /> : null}</div>
        <div className={classes.controls}>{hydrated ? <TimerPanel /> : null}</div>
      </section>

      <section className={classes.reservedArea} aria-label="Todoist area">
        <TodoistPanel />
      </section>
      <section className={classes.togglesArea} aria-label="Environment toggles">
        <EnvironmentToggles />
      </section>
    </div>
  );
}
