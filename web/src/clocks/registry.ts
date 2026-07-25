import type { ClockDefinition } from "./types";
import { Halo, haloTheme } from "./designs/Halo";
import { Meridian, meridianTheme } from "./designs/Meridian";
import { Broadside, broadsideTheme } from "./designs/Broadside";
import { Aurora, auroraTheme } from "./designs/Aurora";
import { Mono, monoTheme } from "./designs/Mono";
import { Stack, stackTheme } from "./designs/Stack";
import { Orbit, orbitTheme } from "./designs/Orbit";
import { Field, fieldTheme } from "./designs/Field";
import { Eclipse, eclipseTheme } from "./designs/Eclipse";
import { Grid, gridTheme } from "./designs/Grid";
import { Terminal, terminalTheme } from "./designs/Terminal";
import { Sunset, sunsetTheme } from "./designs/Sunset";
import { Pill, pillTheme } from "./designs/Pill";
import { Tide, tideTheme } from "./designs/Tide";
import { SplitFlap, splitFlapTheme } from "./designs/SplitFlap";
import { Radar, radarTheme } from "./designs/Radar";
import { Bauhaus, bauhausTheme } from "./designs/Bauhaus";
import { Edge, edgeTheme } from "./designs/Edge";

/**
 * The single consumption point for ADR 08's gallery and for the completeness
 * tests. Order matches the design inventory (1a–1h then 2a–2j) — that is the
 * order the gallery flips through.
 */
export const CLOCKS: ClockDefinition[] = [
  {
    id: "halo",
    name: "Halo",
    component: Halo,
    theme: haloTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "meridian",
    name: "Meridian",
    component: Meridian,
    theme: meridianTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "broadside",
    name: "Broadside",
    component: Broadside,
    theme: broadsideTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "aurora",
    name: "Aurora",
    component: Aurora,
    theme: auroraTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "mono",
    name: "Mono",
    component: Mono,
    theme: monoTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "stack",
    name: "Stack",
    component: Stack,
    theme: stackTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "orbit",
    name: "Orbit",
    component: Orbit,
    theme: orbitTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "field",
    name: "Field",
    component: Field,
    theme: fieldTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    component: Eclipse,
    theme: eclipseTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "grid",
    name: "Grid",
    component: Grid,
    theme: gridTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "terminal",
    name: "Terminal",
    component: Terminal,
    theme: terminalTheme,
    showsSession: true,
    // The only design that displays the run's total.
    showsTotal: true,
    nativeScheme: "dark",
  },
  {
    id: "sunset",
    name: "Sunset",
    component: Sunset,
    theme: sunsetTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "pill",
    name: "Pill",
    component: Pill,
    theme: pillTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "tide",
    name: "Tide",
    component: Tide,
    theme: tideTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "split-flap",
    name: "Split-flap",
    component: SplitFlap,
    theme: splitFlapTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "radar",
    name: "Radar",
    component: Radar,
    theme: radarTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "bauhaus",
    name: "Bauhaus",
    component: Bauhaus,
    theme: bauhausTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "edge",
    name: "Edge",
    component: Edge,
    theme: edgeTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
];

export const CLOCK_BY_ID: Record<string, ClockDefinition> = Object.fromEntries(
  CLOCKS.map((clock) => [clock.id, clock]),
);

/** ADR 08: Halo is the default — PLAN.md's counter-around-the-circle. */
export const DEFAULT_CLOCK_ID = "halo";

/** An unknown id (a clock renamed or removed later) falls back, never crashes. */
export function resolveClock(id: string | null | undefined): ClockDefinition {
  return CLOCK_BY_ID[id ?? ""] ?? CLOCK_BY_ID[DEFAULT_CLOCK_ID];
}
