import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { SourceOptionList } from "./SourcePicker";
import type { NamedItem } from "./types";

/**
 * The half-tablet half of the picker (ADR 12 amendment): below `sm` the popover
 * becomes a modal and the list gets the screen. The stories render the list at
 * the modal's own size, so what they check is what the modal shows.
 */
const projects: NamedItem[] = [
  { id: "p1", name: "GLU" },
  { id: "p2", name: "Inbox" },
  { id: "p3", name: "Home" },
  { id: "p4", name: "Reading list" },
  { id: "p5", name: "Deep work — long project name that has to wrap somewhere" },
];

const meta = {
  title: "Todoist/SourcePicker",
  component: SourceOptionList,
  args: {
    type: "project" as const,
    items: projects,
    loading: false,
    failed: false,
    selectedId: "p1",
    onPick: () => {},
  },
  render: (args) => (
    <div style={{ width: 520, height: 520, display: "flex", flexDirection: "column" }}>
      <SourceOptionList {...args} />
    </div>
  ),
} satisfies Meta<typeof SourceOptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Projects: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("option")).toHaveLength(5);
    // The source in use is the one marked, not merely the one at the top.
    await expect(canvas.getByRole("option", { name: "GLU" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};

/** Typing filters the list in place — the whole point of giving it the screen. */
export const Searching: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText("Choose a project"), "read");
    await expect(canvas.getAllByRole("option")).toHaveLength(1);
    await expect(canvas.getByRole("option", { name: "Reading list" })).toBeVisible();
  },
};

export const NoMatches: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText("Choose a project"), "zzz");
    await expect(canvas.queryAllByRole("option")).toHaveLength(0);
    await expect(canvas.getByText("Nothing here.")).toBeVisible();
  },
};

export const Loading: Story = {
  args: { items: [], loading: true, selectedId: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByPlaceholderText("Loading…")).toBeVisible();
  },
};

/** Failure is stated, never a blank list (ADR 12's first-class failure states). */
export const Unreachable: Story = {
  args: { items: [], failed: true, selectedId: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Could not reach Todoist.")).toBeVisible();
  },
};

export const Filters: Story = {
  args: {
    type: "filter" as const,
    selectedId: "f2",
    items: [
      { id: "f1", name: "Today", query: "today" },
      { id: "f2", name: "Overdue & p1", query: "overdue & p1" },
      { id: "f3", name: "No date", query: "no date" },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByPlaceholderText("Choose a filter"),
    ).toBeInTheDocument();
  },
};
