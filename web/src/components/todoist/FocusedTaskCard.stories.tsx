import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { COMMENT_GRACE_MS, COMMENT_UNDO_MS, COMPLETION_UNDO_MS } from "@/store/types";
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

/**
 * The description line the list card shows survives focusing (ADR 14 amendment,
 * f) — two clamped lines, and the whole text column opens the detail.
 */
export const WithDescription: Story = {
  args: {
    task: {
      ...task,
      description:
        "Crossfade the palette on flip, not the whole card. Long enough to prove the clamp: this sentence exists only to overflow two lines of a 420px card and be cut off by CSS rather than by JavaScript.",
    },
    onOpen: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const description = canvas.getByTestId("focused-description");
    await expect(description).toHaveTextContent("Crossfade the palette on flip");
    // Clamped, not printed whole: the text overflows the two lines it is given,
    // which is the truncation itself rather than a pixel guess about the font.
    await expect(description.scrollHeight).toBeGreaterThan(description.clientHeight);
    await expect(description.getBoundingClientRect().height).toBeLessThanOrEqual(40);
    // The description is part of the same tap target as the title.
    const open = canvas.getByRole("button", { name: /Open “/ });
    await expect(open).toContainElement(description);
    await expect(open.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

/** No description → no line, exactly as on a list card. */
export const WithoutDescription: Story = {
  args: { onOpen: () => {} },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("focused-description")).toBeNull();
  },
};

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

/** Phase one of the comment bar: 2 s in which Undo cancels an unsent post. */
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
            until: Date.now() + COMMENT_GRACE_MS + COMMENT_UNDO_MS,
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

/**
 * Phase two, on the same bar and the same key: the comment has landed, and for
 * 5 s more Undo is a real DELETE (ADR 14 amendment, c).
 */
export const UndoBarPosted: Story = {
  parameters: { layout: "fullscreen" },
  render: function Render() {
    return (
      <div style={{ height: 220 }}>
        <UndoBar
          message={{
            key: "comment:r1",
            badge: "[5m]",
            text: "comment added",
            until: Date.now() + COMMENT_UNDO_MS,
            onUndo: () => {},
          }}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement.ownerDocument.body).getByTestId("undo-bar");
    await expect(bar).toHaveTextContent("comment added");
    await expect(within(bar).getByRole("button", { name: "Undo" })).toBeVisible();
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
            until: Date.now() + COMPLETION_UNDO_MS,
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
            until: Date.now() + COMPLETION_UNDO_MS,
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
