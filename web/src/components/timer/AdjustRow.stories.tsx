import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { MINUTE } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { AdjustRow } from "./AdjustRow";

const meta = {
  title: "Timer/AdjustRow",
  component: AdjustRow,
  decorators: [withStoreState()],
} satisfies Meta<typeof AdjustRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AdjustmentsKeepTotalHonest: Story = {
  decorators: [withStoreState({ remaining: 5 * MINUTE, total: 5 * MINUTE })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Add 5 minutes/ }));
    await expect(useGluStore.getState().remaining).toBe(10 * MINUTE);
    await expect(useGluStore.getState().total).toBe(10 * MINUTE);

    await userEvent.click(canvas.getByRole("button", { name: /Subtract 2 minutes/ }));
    // `total` never shrinks below the remaining time, so the ring cannot lie.
    await expect(useGluStore.getState().remaining).toBe(8 * MINUTE);
    await expect(useGluStore.getState().total).toBe(8 * MINUTE);
  },
};

export const SubtractingPastZeroFinishes: Story = {
  decorators: [withStoreState({ remaining: 2 * MINUTE, total: 5 * MINUTE })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Subtract 5 minutes/ }));
    await expect(useGluStore.getState().status).toBe("finished");
    await expect(useGluStore.getState().remaining).toBe(0);
  },
};
