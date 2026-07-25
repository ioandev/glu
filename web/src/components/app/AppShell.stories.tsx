import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { MINUTE } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { AppShell } from "./AppShell";

const meta = {
  title: "App/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  decorators: [withStoreState()],
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ADR 02 layout contract: timer left half, toggles bottom-right, reserved top-right. */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timer = canvas.getByLabelText("Timer").getBoundingClientRect();
    const reserved = canvas.getByLabelText("Todoist area").getBoundingClientRect();
    const toggles = canvas.getByLabelText("Environment toggles").getBoundingClientRect();

    // Left vertical half.
    await expect(timer.left).toBe(0);
    await expect(Math.round(timer.width)).toBe(Math.round(window.innerWidth / 2));
    // Reserved top-right, toggles bottom-right.
    await expect(reserved.left).toBeGreaterThanOrEqual(timer.right);
    await expect(toggles.left).toBeGreaterThanOrEqual(timer.right);
    await expect(reserved.top).toBeLessThan(toggles.top);
    // No page scroll.
    await expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(
      window.innerHeight,
    );
  },
};

/** Below `sm` the reserved area is not rendered and everything stacks. */
export const HalfTablet: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timer = canvas.getByLabelText("Timer").getBoundingClientRect();
    const toggles = canvas.getByLabelText("Environment toggles").getBoundingClientRect();

    await expect(Math.round(timer.width)).toBe(window.innerWidth);
    await expect(toggles.top).toBeGreaterThanOrEqual(timer.bottom);
    // No horizontal scroll at half-tablet width.
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};

/**
 * ADR 08 amendment: below `sm` the clock is the first viewport *full-bleed* —
 * the whole width and the whole height, no padding, no chevrons — and the
 * one-time swipe hint rides at the top of it, which there is the top of the page.
 */
export const PhoneClockIsFullBleed: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slot = canvas.getByTestId("clock-slot").getBoundingClientRect();

    await expect(Math.round(slot.width)).toBe(window.innerWidth);
    await expect(Math.round(slot.height)).toBe(window.innerHeight);
    await expect(Math.round(slot.top)).toBe(0);

    // No chevrons down here — the hint is what teaches the flip instead.
    await expect(canvas.queryByRole("button", { name: "Next clock design" })).toBeNull();
    const hint = canvas.getByTestId("swipe-hint").getBoundingClientRect();
    await expect(hint.top).toBeLessThan(60);
  },
};

/** Dismissing the hint is permanent — and it is the only thing that removes it. */
export const SwipeHintDismissal: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("swipe-hint")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Dismiss tip" }));
    await expect(canvas.queryByTestId("swipe-hint")).toBeNull();
    await expect(useGluStore.getState().swipeHintDismissed).toBe(true);
  },
};

/**
 * ADR 08 amendment: the full-bleed phone clock reads as the whole page, so an
 * arrow at its bottom edge says the rest is one scroll down.
 */
export const PhoneScrollHint: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hint = canvas.getByTestId("scroll-hint").getBoundingClientRect();
    const slot = canvas.getByTestId("clock-slot").getBoundingClientRect();

    // On the fold: inside the first viewport, hard against its bottom edge.
    await expect(hint.bottom).toBeLessThanOrEqual(slot.bottom);
    await expect(slot.bottom - hint.bottom).toBeLessThan(60);
    // And there really is more below it to point at.
    await expect(document.documentElement.scrollHeight).toBeGreaterThan(
      window.innerHeight,
    );
  },
};

/** Starting a run answers the question for good — including across a reload. */
export const ScrollHintRetiresOnFirstRun: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("scroll-hint")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Start" }));
    await expect(canvas.queryByTestId("scroll-hint")).toBeNull();
    await expect(useGluStore.getState().hasStartedRun).toBe(true);

    // Stopping does not bring it back.
    await userEvent.click(canvas.getByRole("button", { name: "Stop" }));
    await expect(useGluStore.getState().status).toBe("idle");
    await expect(canvas.queryByTestId("scroll-hint")).toBeNull();
  },
};

/** Above `sm` there is no page scroll, so the arrow does not render at all. */
export const TabletHasNoScrollHint: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const hint = within(canvasElement).getByTestId("scroll-hint");
    await expect(getComputedStyle(hint).display).toBe("none");
  },
};

/**
 * ADR 06's bindings, driven at the shell where they are mounted. The keys are
 * sent to the document, which is exactly where a user's keystrokes land.
 */
export const KeyboardShortcuts: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Start" }));
    await expect(useGluStore.getState().status).toBe("running");

    await userEvent.keyboard("p");
    await expect(useGluStore.getState().status).toBe("paused");
    await userEvent.keyboard("p");
    await expect(useGluStore.getState().status).toBe("running");

    // `n` abandons the run: fresh runId, no session recorded.
    const runId = useGluStore.getState().runId;
    await userEvent.keyboard("n");
    await expect(useGluStore.getState().runId).not.toBe(runId);
    await expect(useGluStore.getState().day.sessions).toHaveLength(0);

    await userEvent.keyboard("s");
    await expect(useGluStore.getState().status).toBe("idle");
    await expect(useGluStore.getState().remaining).toBe(20 * MINUTE);

    // The buttons advertise their keys.
    await expect(canvas.getByRole("button", { name: "Stop" })).toHaveAttribute(
      "aria-keyshortcuts",
      "s Control+C",
    );
    await expect(canvas.getByRole("button", { name: "Pause" })).toHaveAttribute(
      "aria-keyshortcuts",
      "p",
    );
  },
};
