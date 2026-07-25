import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { CLOCKS, CLOCK_BY_ID } from "./registry";
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
    remainingSeconds: 750,
    totalSeconds: 1500,
    session: 3,
    showSession: true,
    state: "running" as const,
  },
  argTypes: {
    id: { control: "select", options: CLOCKS.map((c) => c.id) },
    remainingSeconds: { control: { type: "range", min: 0, max: 5940, step: 1 } },
    totalSeconds: { control: { type: "range", min: 60, max: 5940, step: 60 } },
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

/** Generated per clock so the sidebar lists all 18 by name. */
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

/** Geometry at the three telling instants. */
export const FullHalfEmpty: Story = {
  args: { id: "halo" },
  render: (args) => (
    <div style={{ display: "flex", gap: 16 }}>
      {[1500, 750, 0].map((remaining) => (
        <div key={remaining} style={{ width: 240, height: 320 }}>
          <ClockStage {...args} remainingSeconds={remaining} />
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
    await expect(canvasElement.querySelectorAll("figure")).toHaveLength(18);
  },
};
