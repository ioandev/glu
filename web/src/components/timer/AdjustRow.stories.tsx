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

    await userEvent.click(canvas.getByRole("button", { name: /Subtract 1 minute/ }));
    // `total` never shrinks below the remaining time, so the ring cannot lie.
    await expect(useGluStore.getState().remaining).toBe(9 * MINUTE);
    await expect(useGluStore.getState().total).toBe(9 * MINUTE);
  },
};

export const SubtractingPastZeroFinishes: Story = {
  decorators: [
    withStoreState({ selectedDuration: 2 * MINUTE, remaining: 2 * MINUTE, total: 2 * MINUTE }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // ADR 32: completion is a rule about a *run*, so there has to be one — with
    // nothing in flight, − clamps at the one-minute floor and stays idle.
    useGluStore.getState().start();
    await userEvent.click(canvas.getByRole("button", { name: /Subtract 5 minutes/ }));
    await expect(useGluStore.getState().status).toBe("finished");
    await expect(useGluStore.getState().remaining).toBe(0);
  },
};

/**
 * ADR 32: with nothing running, ± is choosing the next run's length — so it
 * writes the selection (which is what grows the custom rung in `PresetRow`),
 * floors at a minute, and never lights the done state for a run nobody started.
 */
export const IdleAdjustmentSelectsTheNextRun: Story = {
  decorators: [
    withStoreState({ selectedDuration: 5 * MINUTE, remaining: 5 * MINUTE, total: 5 * MINUTE }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Subtract 1 minute/ }));
    await expect(useGluStore.getState().selectedDuration).toBe(4 * MINUTE);
    await expect(useGluStore.getState().remaining).toBe(4 * MINUTE);

    await userEvent.click(canvas.getByRole("button", { name: /Subtract 5 minutes/ }));
    await expect(useGluStore.getState().status).toBe("idle");
    await expect(useGluStore.getState().selectedDuration).toBe(MINUTE);
  },
};
