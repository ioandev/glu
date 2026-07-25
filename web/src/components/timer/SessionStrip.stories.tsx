import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { MINUTE } from "@/lib/time";
import { emptyEnvironment, useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { SessionStrip } from "./SessionStrip";

const day = (n: number) => ({
  startedAt: 1_700_000_000_000,
  sessions: Array.from({ length: n }, (_, i) => ({
    endedAt: 1_700_000_000_000 + i * MINUTE,
    durationMs: 20 * MINUTE,
    environment: emptyEnvironment(),
  })),
});

const meta = {
  title: "Timer/SessionStrip",
  component: SessionStrip,
  decorators: [withStoreState({ day: day(0) })],
} satisfies Meta<typeof SessionStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const ThreeSessions: Story = {
  decorators: [withStoreState({ day: day(3) })],
};

/** The dot cap. */
export const TwelveSessions: Story = {
  decorators: [withStoreState({ day: day(12) })],
};

/** Past the cap: dots stop at 12 and a "+N" carries the rest (ADR 05). */
export const TwentySessions: Story = {
  decorators: [withStoreState({ day: day(20) })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("session-count")).toHaveTextContent("20 today");
    await expect(canvas.getByText("+8")).toBeInTheDocument();
  },
};

export const ConfirmPopoverOpen: Story = {
  decorators: [withStoreState({ day: day(3) })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "New day" }));
    const dropdown = await canvas.findByRole("dialog", { name: "Confirm new day" });
    await expect(within(dropdown).getByText("Start a new day?")).toBeVisible();
    await expect(within(dropdown).getByText(/3 sessions reset to zero/)).toBeVisible();
  },
};

export const CancelChangesNothing: Story = {
  decorators: [withStoreState({ day: day(3) })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "New day" }));
    const dropdown = await canvas.findByRole("dialog", { name: "Confirm new day" });
    await userEvent.click(within(dropdown).getByRole("button", { name: "Cancel" }));
    await expect(useGluStore.getState().day.sessions).toHaveLength(3);
    await expect(useGluStore.getState().archive).toHaveLength(0);
  },
};

export const ConfirmResetsAndArchives: Story = {
  decorators: [withStoreState({ day: day(3) })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "New day" }));
    const dropdown = await canvas.findByRole("dialog", { name: "Confirm new day" });
    await userEvent.click(within(dropdown).getByRole("button", { name: "Reset" }));
    await expect(useGluStore.getState().day.sessions).toHaveLength(0);
    await expect(useGluStore.getState().archive[0].sessions).toHaveLength(3);
    await expect(canvas.getByTestId("session-count")).toHaveTextContent("0 today");
  },
};
