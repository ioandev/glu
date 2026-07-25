"use client";

import { useEffect } from "react";
import { resolveClock } from "@/clocks/registry";
import { useGluStore } from "@/store/gluStore";

/**
 * ADR 08's page painting: the active clock's palette repaints the app *through*
 * the chrome's tokens (ADR 15). All that takes is the attribute — the token
 * space itself is static CSS, so the scheme still flips without JS and an
 * unknown id resolves to Halo rather than leaving the page untokenised.
 */
export function ClockSync() {
  const activeClockId = useGluStore((s) => s.activeClockId);

  useEffect(() => {
    document.documentElement.setAttribute("data-clock", resolveClock(activeClockId).id);
  }, [activeClockId]);

  return null;
}
