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
import { Hourglass, hourglassTheme } from "./designs/Hourglass";
import { Segment, segmentTheme } from "./designs/Segment";
import { Meter, meterTheme } from "./designs/Meter";
import { Nixie, nixieTheme } from "./designs/Nixie";
import { Nest, nestTheme } from "./designs/Nest";
import { Lunar, lunarTheme } from "./designs/Lunar";
import { Candle, candleTheme } from "./designs/Candle";
import { Steps, stepsTheme } from "./designs/Steps";
import { Lcd, lcdTheme } from "./designs/Lcd";
import { Spiral, spiralTheme } from "./designs/Spiral";
import { Soft, softTheme } from "./designs/Soft";
import { Glass, glassTheme } from "./designs/Glass";
import { Comet, cometTheme } from "./designs/Comet";
import { Barcode, barcodeTheme } from "./designs/Barcode";
import { Cell, cellTheme } from "./designs/Cell";
import { Wedge, wedgeTheme } from "./designs/Wedge";
import { Words, wordsTheme } from "./designs/Words";
import { Prism, prismTheme } from "./designs/Prism";
import { Pixels, pixelsTheme } from "./designs/Pixels";
import { Tempo, tempoTheme } from "./designs/Tempo";
import { Mercury, mercuryTheme } from "./designs/Mercury";
import { Ghost, ghostTheme } from "./designs/Ghost";
import { Sweep, sweepTheme } from "./designs/Sweep";
import { Beam, beamTheme } from "./designs/Beam";
import { Tally, tallyTheme } from "./designs/Tally";
import { Odometer, odometerTheme } from "./designs/Odometer";
import { Sunrise, sunriseTheme } from "./designs/Sunrise";
import { Column, columnTheme } from "./designs/Column";
import { Gauge, gaugeTheme } from "./designs/Gauge";
import { Bank, bankTheme } from "./designs/Bank";
import { Ripple, rippleTheme } from "./designs/Ripple";
import { Ink, inkTheme } from "./designs/Ink";
import { Percent, percentTheme } from "./designs/Percent";
import { Ruler, rulerTheme } from "./designs/Ruler";
import { Bubble, bubbleTheme } from "./designs/Bubble";
import { Skyline, skylineTheme } from "./designs/Skyline";
import { Altitude, altitudeTheme } from "./designs/Altitude";
import { Beads, beadsTheme } from "./designs/Beads";
import { Hand, handTheme } from "./designs/Hand";
import { Matrix, matrixTheme } from "./designs/Matrix";
import { Arcade, arcadeTheme } from "./designs/Arcade";
import { Quicksilver, quicksilverTheme } from "./designs/Quicksilver";
import { Log, logTheme } from "./designs/Log";
import { Stars, starsTheme } from "./designs/Stars";
import { Depth, depthTheme } from "./designs/Depth";
import { Chain, chainTheme } from "./designs/Chain";
import { Pulse, pulseTheme } from "./designs/Pulse";
import { Pour, pourTheme } from "./designs/Pour";
import { Dial, dialTheme } from "./designs/Dial";
import { Sprout, sproutTheme } from "./designs/Sprout";
import { Laps, lapsTheme } from "./designs/Laps";
import { Marquee, marqueeTheme } from "./designs/Marquee";
import { Slices, slicesTheme } from "./designs/Slices";
import { Ticks, ticksTheme } from "./designs/Ticks";
import { Punchcard, punchcardTheme } from "./designs/Punchcard";
import { Wash, washTheme } from "./designs/Wash";
import { Route, routeTheme } from "./designs/Route";
import { Neon, neonTheme } from "./designs/Neon";
import { Ledger, ledgerTheme } from "./designs/Ledger";
import { Signal, signalTheme } from "./designs/Signal";
import { Blueprint, blueprintTheme } from "./designs/Blueprint";
import { Chip, chipTheme } from "./designs/Chip";
import { Waveform, waveformTheme } from "./designs/Waveform";
import { Milestones, milestonesTheme } from "./designs/Milestones";
import { Heat, heatTheme } from "./designs/Heat";
import { Dominoes, dominoesTheme } from "./designs/Dominoes";
import { Aperture, apertureTheme } from "./designs/Aperture";
import { Confetti, confettiTheme } from "./designs/Confetti";

/**
 * The single consumption point for ADR 08's gallery and for the completeness
 * tests. Order matches the design inventory, sheet by sheet — ADR 07's first
 * set, then ADR 42's second, then ADR 45's third (the stopwatch sheet, re-pointed
 * at a countdown) — and that is the order the gallery flips through.
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
  {
    id: "hourglass",
    name: "Hourglass",
    component: Hourglass,
    theme: hourglassTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "segment",
    name: "Segment",
    component: Segment,
    theme: segmentTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "meter",
    name: "Meter",
    component: Meter,
    theme: meterTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "nixie",
    name: "Nixie",
    component: Nixie,
    theme: nixieTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "nest",
    name: "Nest",
    component: Nest,
    theme: nestTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "lunar",
    name: "Lunar",
    component: Lunar,
    theme: lunarTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "candle",
    name: "Candle",
    component: Candle,
    theme: candleTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "steps",
    name: "Steps",
    component: Steps,
    theme: stepsTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "lcd",
    name: "LCD",
    component: Lcd,
    theme: lcdTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "spiral",
    name: "Spiral",
    component: Spiral,
    theme: spiralTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "soft",
    name: "Soft",
    component: Soft,
    theme: softTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "glass",
    name: "Glass",
    component: Glass,
    theme: glassTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "comet",
    name: "Comet",
    component: Comet,
    theme: cometTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "barcode",
    name: "Barcode",
    component: Barcode,
    theme: barcodeTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "cell",
    name: "Cell",
    component: Cell,
    theme: cellTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "wedge",
    name: "Wedge",
    component: Wedge,
    theme: wedgeTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "words",
    name: "Words",
    component: Words,
    theme: wordsTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "prism",
    name: "Prism",
    component: Prism,
    theme: prismTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "pixels",
    name: "Pixels",
    component: Pixels,
    theme: pixelsTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "tempo",
    name: "Tempo",
    component: Tempo,
    theme: tempoTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "mercury",
    name: "Mercury",
    component: Mercury,
    theme: mercuryTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "ghost",
    name: "Ghost",
    component: Ghost,
    theme: ghostTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "sweep",
    name: "Sweep",
    component: Sweep,
    theme: sweepTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "beam",
    name: "Beam",
    component: Beam,
    theme: beamTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "tally",
    name: "Tally",
    component: Tally,
    theme: tallyTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "odometer",
    name: "Odometer",
    component: Odometer,
    theme: odometerTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    component: Sunrise,
    theme: sunriseTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "column",
    name: "Column",
    component: Column,
    theme: columnTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "gauge",
    name: "Gauge",
    component: Gauge,
    theme: gaugeTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "bank",
    name: "Bank",
    component: Bank,
    theme: bankTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "ripple",
    name: "Ripple",
    component: Ripple,
    theme: rippleTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "ink",
    name: "Ink",
    component: Ink,
    theme: inkTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "percent",
    name: "Percent",
    component: Percent,
    theme: percentTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "ruler",
    name: "Ruler",
    component: Ruler,
    theme: rulerTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "bubble",
    name: "Bubble",
    component: Bubble,
    theme: bubbleTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "skyline",
    name: "Skyline",
    component: Skyline,
    theme: skylineTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "altitude",
    name: "Altitude",
    component: Altitude,
    theme: altitudeTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "beads",
    name: "Beads",
    component: Beads,
    theme: beadsTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "hand",
    name: "Hand",
    component: Hand,
    theme: handTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "matrix",
    name: "Matrix",
    component: Matrix,
    theme: matrixTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "arcade",
    name: "Arcade",
    component: Arcade,
    theme: arcadeTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "quicksilver",
    name: "Quicksilver",
    component: Quicksilver,
    theme: quicksilverTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "log",
    name: "Log",
    component: Log,
    theme: logTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "stars",
    name: "Stars",
    component: Stars,
    theme: starsTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "depth",
    name: "Depth",
    component: Depth,
    theme: depthTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "chain",
    name: "Chain",
    component: Chain,
    theme: chainTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "pulse",
    name: "Pulse",
    component: Pulse,
    theme: pulseTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "pour",
    name: "Pour",
    component: Pour,
    theme: pourTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "dial",
    name: "Dial",
    component: Dial,
    theme: dialTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "sprout",
    name: "Sprout",
    component: Sprout,
    theme: sproutTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "laps",
    name: "Laps",
    component: Laps,
    theme: lapsTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "marquee",
    name: "Marquee",
    component: Marquee,
    theme: marqueeTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "slices",
    name: "Slices",
    component: Slices,
    theme: slicesTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "ticks",
    name: "Ticks",
    component: Ticks,
    theme: ticksTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "punchcard",
    name: "Punchcard",
    component: Punchcard,
    theme: punchcardTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "wash",
    name: "Wash",
    component: Wash,
    theme: washTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "route",
    name: "Route",
    component: Route,
    theme: routeTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "neon",
    name: "Neon",
    component: Neon,
    theme: neonTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "ledger",
    name: "Ledger",
    component: Ledger,
    theme: ledgerTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "signal",
    name: "Signal",
    component: Signal,
    theme: signalTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    component: Blueprint,
    theme: blueprintTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "chip",
    name: "Chip",
    component: Chip,
    theme: chipTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "waveform",
    name: "Waveform",
    component: Waveform,
    theme: waveformTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "milestones",
    name: "Milestones",
    component: Milestones,
    theme: milestonesTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "heat",
    name: "Heat",
    component: Heat,
    theme: heatTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "dominoes",
    name: "Dominoes",
    component: Dominoes,
    theme: dominoesTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "light",
  },
  {
    id: "aperture",
    name: "Aperture",
    component: Aperture,
    theme: apertureTheme,
    showsSession: false,
    showsTotal: false,
    nativeScheme: "dark",
  },
  {
    id: "confetti",
    name: "Confetti",
    component: Confetti,
    theme: confettiTheme,
    showsSession: true,
    showsTotal: false,
    nativeScheme: "light",
  },
];

/**
 * The roster's size, derived — **the one place the number lives** (ADR 42).
 * Copy at your peril: the docs page, the stories and the tests all read it from
 * here, which is why adding a design is a registry edit and nothing else.
 */
export const CLOCK_COUNT = CLOCKS.length;

export const CLOCK_BY_ID: Record<string, ClockDefinition> = Object.fromEntries(
  CLOCKS.map((clock) => [clock.id, clock]),
);

/** ADR 08: Halo is the default — PLAN.md's counter-around-the-circle. */
export const DEFAULT_CLOCK_ID = "halo";

/** An unknown id (a clock renamed or removed later) falls back, never crashes. */
export function resolveClock(id: string | null | undefined): ClockDefinition {
  return CLOCK_BY_ID[id ?? ""] ?? CLOCK_BY_ID[DEFAULT_CLOCK_ID];
}
