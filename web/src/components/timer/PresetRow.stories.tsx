import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { MINUTE } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { PresetRow } from "./PresetRow";

const meta = {
  title: "Timer/PresetRow",
  component: PresetRow,
  decorators: [withStoreState()],
} satisfies Meta<typeof PresetRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TapSetsTheTimer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "45m" }));
    await expect(useGluStore.getState().selectedDuration).toBe(45 * MINUTE);
    await expect(useGluStore.getState().remaining).toBe(45 * MINUTE);
    await expect(canvas.getByRole("button", { name: "45m" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const TapWhileRunningPreservesRunState: Story = {
  decorators: [
    withStoreState({
      status: "running",
      endAt: Date.now() + 12 * MINUTE,
      remaining: 12 * MINUTE,
      total: 20 * MINUTE,
      runId: "story-run",
      runningSince: Date.now(),
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "10m" }));
    await expect(useGluStore.getState().status).toBe("running");
    await expect(useGluStore.getState().total).toBe(10 * MINUTE);
  },
};
