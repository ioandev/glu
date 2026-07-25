import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { SwipeHint } from "./SwipeHint";

const meta = {
  title: "Chrome/SwipeHint",
  component: SwipeHint,
  parameters: { layout: "fullscreen" },
  decorators: [withStoreState()],
  render: () => (
    // Stands in for the clock slot: the hint's containing block.
    <div style={{ position: "relative", height: "240px", background: "var(--glu-surface)" }}>
      <SwipeHint />
    </div>
  ),
} satisfies Meta<typeof SwipeHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Swipe the clock to switch designs"),
    ).toBeVisible();
  },
};

/** Closing it is permanent — the answer goes into the blob, not into a render. */
export const DismissIsForever: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss tip" }));

    await expect(useGluStore.getState().swipeHintDismissed).toBe(true);
    await expect(canvas.queryByTestId("swipe-hint")).toBeNull();
  },
};

export const AlreadyDismissed: Story = {
  decorators: [withStoreState({ swipeHintDismissed: true })],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("swipe-hint")).toBeNull();
  },
};

/** A hint that ate the gesture it teaches would be its own bug. */
export const SwipesPassStraightThrough: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hint = canvas.getByTestId("swipe-hint");
    const close = canvas.getByRole("button", { name: "Dismiss tip" });

    await expect(getComputedStyle(hint).pointerEvents).toBe("none");
    await expect(getComputedStyle(close).pointerEvents).toBe("auto");
    // The close button is still a real touch target (UI.md's 44 px floor).
    const box = close.getBoundingClientRect();
    await expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  },
};
