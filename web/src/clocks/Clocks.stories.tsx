import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { CLOCKS, CLOCK_BY_ID } from "./registry";
import { MINUTE, SECOND } from "@/lib/time";
import type { ClockProps } from "./types";

/**
 * One story per clock, plus the overview grid. Every story exposes the five
 * shared controls, and the canvas is painted with the clock's own page
 * background per scheme (the `ClockFrame` does that from the exported palette).
 */
function ClockStage({ id, ...props }: ClockProps & { id: string }) {
  const Component = CLOCK_BY_ID[id].component;
  return (
    <div style={{ width: "min(72vw, 420px)", height: "min(72vh, 560px)" }}>
      <Component {...props} />
    </div>
  );
}

const meta = {
  title: "Clocks/Design",
  component: ClockStage,
  parameters: { layout: "centered" },
  args: {
    id: "halo",
    remainingMs: 750 * SECOND,
    totalMs: 1500 * SECOND,
    session: 3,
    showSession: true,
    state: "running" as const,
  },
  argTypes: {
    id: { control: "select", options: CLOCKS.map((c) => c.id) },
    // A sub-second step is the point of the control: dragging it across one
    // second is how you see whether a design's geometry moves continuously or
    // jumps (ADR 07, amended 2026-07-25).
    remainingMs: { control: { type: "range", min: 0, max: 5940 * SECOND, step: 100 } },
    totalMs: { control: { type: "range", min: MINUTE, max: 5940 * SECOND, step: MINUTE } },
    session: { control: { type: "number", min: 0, max: 30 } },
    showSession: { control: "boolean" },
    state: {
      control: "inline-radio",
      options: ["idle", "running", "paused", "finished"],
    },
  },
} satisfies Meta<typeof ClockStage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Generated per clock so the sidebar lists every design by name. */
const perClock = Object.fromEntries(
  CLOCKS.map((clock) => [clock.name.replace(/[^A-Za-z]/g, ""), { args: { id: clock.id } }]),
) as Record<string, Story>;

export const Halo = perClock.Halo;
export const Meridian = perClock.Meridian;
export const Broadside = perClock.Broadside;
export const Aurora = perClock.Aurora;
export const Mono = perClock.Mono;
export const Stack = perClock.Stack;
export const Orbit = perClock.Orbit;
export const Field = perClock.Field;
export const Eclipse = perClock.Eclipse;
export const Grid = perClock.Grid;
export const Terminal = perClock.Terminal;
export const Sunset = perClock.Sunset;
export const Pill = perClock.Pill;
export const Tide = perClock.Tide;
export const SplitFlap = perClock.Splitflap;
export const Radar = perClock.Radar;
export const Bauhaus = perClock.Bauhaus;
export const Edge = perClock.Edge;

// ADR 42's second set.
export const Hourglass = perClock.Hourglass;
export const Segment = perClock.Segment;
export const Meter = perClock.Meter;
export const Nixie = perClock.Nixie;
export const Nest = perClock.Nest;
export const Lunar = perClock.Lunar;
export const Candle = perClock.Candle;
export const Steps = perClock.Steps;
export const LCD = perClock.LCD;
export const Spiral = perClock.Spiral;
export const Soft = perClock.Soft;
export const Glass = perClock.Glass;
export const Comet = perClock.Comet;
export const Barcode = perClock.Barcode;
export const Cell = perClock.Cell;
export const Wedge = perClock.Wedge;
export const Words = perClock.Words;
export const Prism = perClock.Prism;
export const Pixels = perClock.Pixels;
export const Tempo = perClock.Tempo;
export const Mercury = perClock.Mercury;
export const Ghost = perClock.Ghost;

// ADR 45's third set.
export const Sweep = perClock.Sweep;
export const Beam = perClock.Beam;
export const Tally = perClock.Tally;
export const Odometer = perClock.Odometer;
export const Sunrise = perClock.Sunrise;
export const Column = perClock.Column;
export const Gauge = perClock.Gauge;
export const Bank = perClock.Bank;
export const Ripple = perClock.Ripple;
export const Ink = perClock.Ink;
export const Percent = perClock.Percent;
export const Ruler = perClock.Ruler;
export const Bubble = perClock.Bubble;
export const Skyline = perClock.Skyline;
export const Altitude = perClock.Altitude;
export const Beads = perClock.Beads;
export const Hand = perClock.Hand;
export const Matrix = perClock.Matrix;
export const Arcade = perClock.Arcade;
export const Quicksilver = perClock.Quicksilver;
export const Log = perClock.Log;
export const Stars = perClock.Stars;
export const Depth = perClock.Depth;
export const Chain = perClock.Chain;
export const Pulse = perClock.Pulse;
export const Pour = perClock.Pour;
export const Dial = perClock.Dial;
export const Sprout = perClock.Sprout;
export const Laps = perClock.Laps;
export const Marquee = perClock.Marquee;
export const Slices = perClock.Slices;
export const Ticks = perClock.Ticks;
export const Punchcard = perClock.Punchcard;
export const Wash = perClock.Wash;
export const Route = perClock.Route;
export const Neon = perClock.Neon;
export const Ledger = perClock.Ledger;
export const Signal = perClock.Signal;
export const Blueprint = perClock.Blueprint;
export const Chip = perClock.Chip;
export const Waveform = perClock.Waveform;
export const Milestones = perClock.Milestones;
export const Heat = perClock.Heat;
export const Dominoes = perClock.Dominoes;
export const Aperture = perClock.Aperture;
export const Confetti = perClock.Confetti;

/** Geometry at the three telling instants. */
export const FullHalfEmpty: Story = {
  args: { id: "halo" },
  render: (args) => (
    <div style={{ display: "flex", gap: 16 }}>
      {[1500, 750, 0].map((remaining) => (
        <div key={remaining} style={{ width: 240, height: 320 }}>
          <ClockStage {...args} remainingMs={remaining * SECOND} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("25:00")).toBeInTheDocument();
    await expect(canvas.getByText("12:30")).toBeInTheDocument();
    await expect(canvas.getByText("00:00")).toBeInTheDocument();
  },
};

/**
 * Blend-mode designs against an arbitrary canvas colour: the frame's
 * `isolation: isolate` is what keeps them blending against their own background
 * rather than the page (ADR 07).
 */
export const BlendModeIsolation: Story = {
  args: { id: "pill" },
  render: (args) => (
    <div style={{ background: "magenta", padding: 24, display: "flex", gap: 16 }}>
      {["pill", "tide", "field"].map((id) => (
        <div key={id} style={{ width: 220, height: 300 }}>
          <ClockStage {...args} id={id} />
        </div>
      ))}
    </div>
  ),
};

/** The whole roster at a glance. */
export const AllClocks: Story = {
  parameters: { layout: "fullscreen", a11y: { test: "todo" } },
  render: (args) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
        padding: 16,
      }}
    >
      {CLOCKS.map((clock) => (
        <figure key={clock.id} style={{ margin: 0 }}>
          <div style={{ height: 300 }}>
            <ClockStage {...args} id={clock.id} />
          </div>
          <figcaption style={{ fontSize: 12, paddingTop: 6, color: "var(--glu-muted)" }}>
            {clock.name}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("figure")).toHaveLength(CLOCKS.length);
  },
};
