import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { MINUTE } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { TransportControls } from "./TransportControls";

const meta = {
  title: "Timer/TransportControls",
  component: TransportControls,
  decorators: [withStoreState()],
} satisfies Meta<typeof TransportControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Running: Story = {
  decorators: [
    withStoreState({
      status: "running",
      endAt: Date.now() + 10 * MINUTE,
      remaining: 10 * MINUTE,
      runId: "story-run",
      runningSince: Date.now(),
    }),
  ],
};

export const Paused: Story = {
  decorators: [
    withStoreState({ status: "paused", remaining: 10 * MINUTE, runId: "story-run" }),
  ],
};

export const StartPauseStop: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Start" }));
    await expect(useGluStore.getState().status).toBe("running");

    await userEvent.click(canvas.getByRole("button", { name: "Pause" }));
    await expect(useGluStore.getState().status).toBe("paused");

    await userEvent.click(canvas.getByRole("button", { name: "Stop" }));
    await expect(useGluStore.getState().status).toBe("idle");
    await expect(useGluStore.getState().remaining).toBe(20 * MINUTE);
  },
};
