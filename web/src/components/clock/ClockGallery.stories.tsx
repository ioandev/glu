import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { CLOCKS } from "@/clocks/registry";
import { MINUTE } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { ClockGallery } from "./ClockGallery";

const running = {
  status: "running" as const,
  endAt: Date.now() + 12 * MINUTE,
  remaining: 12 * MINUTE,
  total: 20 * MINUTE,
  runId: "story-run",
  runningSince: Date.now(),
};

const meta = {
  title: "Clocks/Gallery",
  component: ClockGallery,
  parameters: { layout: "centered" },
  decorators: [withStoreState({ ...running })],
  render: () => (
    <div style={{ width: "min(80vw, 520px)", height: "min(70vh, 480px)" }}>
      <ClockGallery />
    </div>
  ),
} satisfies Meta<typeof ClockGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Halo: Story = {};

export const Terminal: Story = {
  decorators: [withStoreState({ ...running, activeClockId: "terminal" })],
};

export const Pill: Story = {
  decorators: [withStoreState({ ...running, activeClockId: "pill" })],
};

export const Idle: Story = {
  decorators: [withStoreState({ status: "idle" })],
};

export const Paused: Story = {
  decorators: [
    withStoreState({ status: "paused", remaining: 7 * MINUTE, total: 20 * MINUTE, runId: "r" }),
  ],
};

export const Finished: Story = {
  decorators: [
    withStoreState({ status: "finished", remaining: 0, total: 20 * MINUTE, runId: "r" }),
  ],
};

export const ChevronsFlipAndWrap: Story = {
  // The chevrons are tablet-and-above chrome (ADR 08 amendment) — pin the
  // viewport rather than letting the runner's default decide.
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole("button", { name: "Next clock design" });
    const previous = canvas.getByRole("button", { name: "Previous clock design" });

    await expect(useGluStore.getState().activeClockId).toBe("halo");
    await userEvent.click(next);
    await expect(useGluStore.getState().activeClockId).toBe(CLOCKS[1].id);

    // Wrap backwards off the front.
    await userEvent.click(previous);
    await userEvent.click(previous);
    await expect(useGluStore.getState().activeClockId).toBe(CLOCKS.at(-1)!.id);

    // …and forwards off the back.
    await userEvent.click(next);
    await expect(useGluStore.getState().activeClockId).toBe(CLOCKS[0].id);
  },
};

/**
 * ADR 25: the flip slides. Two layers for the length of the animation, one
 * before and after, and the direction follows the way the roster is moving.
 */
export const FlipSlidesDirectionally: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slot = canvas.getByTestId("clock-slot");
    const layers = () => slot.querySelectorAll("[data-role]");

    await expect(layers()).toHaveLength(1);

    await userEvent.click(canvas.getByRole("button", { name: "Next clock design" }));
    await expect(layers()).toHaveLength(2);
    await expect(slot.querySelector('[data-role="leaving"]')).toHaveAttribute(
      "data-direction",
      "forward",
    );
    await expect(slot.querySelector('[data-role="entering"]')).toHaveAttribute(
      "data-direction",
      "forward",
    );
    // The departing clock is the one that was on screen, not the arrival.
    await expect(slot).toHaveAttribute("data-clock-id", CLOCKS[1].id);

    // …and it lands on exactly one clock.
    await waitFor(async () => expect(layers()).toHaveLength(1), { timeout: 2_000 });

    await userEvent.click(canvas.getByRole("button", { name: "Previous clock design" }));
    await expect(slot.querySelector('[data-role="leaving"]')).toHaveAttribute(
      "data-direction",
      "back",
    );
  },
};

export const ChevronsAreTouchSized: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ["Previous clock design", "Next clock design"]) {
      const chevron = canvas.getByRole("button", { name });
      const box = chevron.getBoundingClientRect();
      await expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      // Quiet, not gone: 10% is the resting state above `sm` (ADR 08 amendment).
      await expect(getComputedStyle(chevron).opacity).toBe("0.1");
    }
  },
};

/**
 * Below `sm` the chevrons are not rendered at all — the clock is the whole
 * first viewport and the swipe is the only flip, which is what the one-time
 * hint exists to say (ADR 08 amendment).
 */
export const NoChevronsOnThePhone: Story = {
  globals: { viewport: { value: "halfTablet" } },
  render: () => (
    <div style={{ width: "100%", height: "60vh" }}>
      <ClockGallery />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ["Previous clock design", "Next clock design"]) {
      // Out of the accessibility tree…
      await expect(canvas.queryByRole("button", { name })).toBeNull();
      // …because it is not painted at all.
      await expect(getComputedStyle(canvas.getByLabelText(name)).display).toBe("none");
    }
  },
};

export const SessionDisplayCanBeHidden: Story = {
  decorators: [withStoreState({ ...running, showSessionOnClock: false })],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("clock-session")).toBeNull();
  },
};
