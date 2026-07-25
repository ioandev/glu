import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { withStoreState } from "@/stories/storeDecorator";
import { ScrollHint } from "./ScrollHint";

const meta = {
  title: "Chrome/ScrollHint",
  component: ScrollHint,
  parameters: { layout: "fullscreen" },
  decorators: [withStoreState()],
  render: () => (
    // Stands in for the clock slot: the arrow's containing block.
    <div style={{ position: "relative", height: "240px", background: "var(--glu-surface)" }}>
      <ScrollHint />
    </div>
  ),
} satisfies Meta<typeof ScrollHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hint = canvas.getByTestId("scroll-hint");

    await expect(hint).toBeVisible();
    // Bottom of the slot, which is the fold it is pointing past.
    const slot = hint.parentElement!.getBoundingClientRect();
    const box = hint.getBoundingClientRect();
    await expect(box.bottom).toBeLessThanOrEqual(slot.bottom);
    await expect(box.top).toBeGreaterThan(slot.top + slot.height / 2);
  },
};

/** The clock slot is a swipe surface; the arrow must not claim the gesture. */
export const InertToPointers: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const hint = within(canvasElement).getByTestId("scroll-hint");
    await expect(getComputedStyle(hint).pointerEvents).toBe("none");
    // A visual affordance for a fold the reading order does not have.
    await expect(hint).toHaveAttribute("aria-hidden", "true");
  },
};

/** One run is all it takes, and it never comes back. */
export const AfterAFirstRun: Story = {
  globals: { viewport: { value: "halfTablet" } },
  decorators: [withStoreState({ hasStartedRun: true })],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("scroll-hint")).toBeNull();
  },
};

/** Above `sm` nothing is below the fold, so there is nothing to point at. */
export const HiddenOnTablet: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const hint = within(canvasElement).getByTestId("scroll-hint");
    await expect(getComputedStyle(hint).display).toBe("none");
  },
};
