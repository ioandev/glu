import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { UNDO_GRACE_MS } from "@/store/types";
import { FocusedTaskCard } from "./FocusedTaskCard";
import { UndoBar } from "./UndoBar";

const task = { id: "t1", title: "Write ADR 15 — palette crossfade", priority: 2 as const };

const meta = {
  title: "Todoist/FocusedTask",
  component: FocusedTaskCard,
  args: {
    task,
    totalMinutes: 42,
    pendingCount: 0,
    onUnfocus: () => {},
  },
  render: (args) => (
    <div style={{ width: 420 }}>
      <FocusedTaskCard {...args} />
    </div>
  ),
} satisfies Meta<typeof FocusedTaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTotal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("focused-total")).toHaveTextContent("[42m]");
    const unfocus = canvas.getByRole("button", { name: /Unfocus/ });
    await expect(unfocus.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

/** Minutes up to 119, then hours; storage and parsing stay minutes. */
export const HoursTotal: Story = {
  args: { totalMinutes: 125 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("focused-total")).toHaveTextContent("[2h 5m]");
  },
};

/** The sum clamps at 28 days, and the badge says so. */
export const ClampedTotal: Story = {
  args: { totalMinutes: 40_320 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("focused-total")).toHaveTextContent("[28d]");
  },
};

export const NoTotalYet: Story = { args: { totalMinutes: null } };

export const PendingUpload: Story = {
  args: { pendingCount: 2 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("focused-pending")).toHaveTextContent(
      "2 comments pending",
    );
  },
};

export const GoneUpstream: Story = {
  args: { gone: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("focused-gone")).toBeVisible();
    // The unfocus affordance is exactly what makes it a state and not an error.
    await expect(canvas.getByRole("button", { name: /Unfocus/ })).toBeVisible();
  },
};

/** The undo bar, and Undo cancelling before anything is sent. */
export const UndoBarPending: Story = {
  parameters: { layout: "fullscreen" },
  render: function Render() {
    return (
      <div style={{ height: 220 }}>
        <UndoBar
          message={{
            key: "comment:r1",
            badge: "[5m]",
            text: "comment will be added",
            until: Date.now() + UNDO_GRACE_MS,
            onUndo: () => {},
          }}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement.ownerDocument.body).getByTestId("undo-bar");
    await expect(bar).toHaveTextContent("[5m]");
    await expect(bar).toHaveTextContent("comment will be added");
    const undo = within(bar).getByRole("button", { name: "Undo" });
    await expect(undo.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    // Compact enough not to cover the transport controls even at 590px.
    await expect(bar.getBoundingClientRect().width).toBeLessThanOrEqual(420);
    await userEvent.click(undo);
  },
};

/** ADR 20's message on the same host: completion, undone by a real reopen. */
export const UndoBarCompletion: Story = {
  parameters: { layout: "fullscreen" },
  render: function Render() {
    return (
      <div style={{ height: 220 }}>
        <UndoBar
          message={{
            key: "complete:t1",
            text: "Completed · Write ADR 15 — palette crossfade",
            until: Date.now() + UNDO_GRACE_MS,
            onUndo: () => {},
          }}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement.ownerDocument.body).getByTestId("undo-bar");
    await expect(bar).toHaveTextContent("Completed ·");
    await expect(within(bar).getByRole("button", { name: "Undo" })).toBeVisible();
  },
};

/** Undo failure says so on the bar rather than opening an error screen. */
export const UndoBarError: Story = {
  parameters: { layout: "fullscreen" },
  render: function Render() {
    return (
      <div style={{ height: 220 }}>
        <UndoBar
          message={{
            key: "complete:t2",
            text: "Completed · Something",
            until: Date.now() + UNDO_GRACE_MS,
            error: "Could not undo",
            onUndo: () => {},
          }}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement.ownerDocument.body).getByTestId("undo-bar");
    await expect(bar).toHaveTextContent("Could not undo");
  },
};
