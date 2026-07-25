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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ["Previous clock design", "Next clock design"]) {
      const box = canvas.getByRole("button", { name }).getBoundingClientRect();
      await expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
  },
};

export const SessionDisplayCanBeHidden: Story = {
  decorators: [withStoreState({ ...running, showSessionOnClock: false })],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("clock-session")).toBeNull();
  },
};
