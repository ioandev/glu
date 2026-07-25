import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import type { TodoistListState } from "./useTodoistList";
import { TaskList } from "./TaskList";
import type { TodoistSection, TodoistSource, UiTask } from "./types";

const project: TodoistSource = { type: "project", id: "p1", name: "GLU" };

const task = (
  id: string,
  title: string,
  uiPriority: 1 | 2 | 3 | 4,
  sectionId: string | null = null,
  description = "",
): UiTask => ({ id, title, description, uiPriority, sectionId, order: Number(id) });

const sections: TodoistSection[] = [
  { id: "s1", name: "Today", order: 1 },
  { id: "s2", name: "Later", order: 2 },
];

const list = (patch: Partial<TodoistListState> = {}): TodoistListState => ({
  phase: "ready",
  tasks: [],
  sections: [],
  truncated: false,
  cap: 200,
  errorMessage: null,
  gone: false,
  refreshing: false,
  reload: () => {},
  ...patch,
});

const meta = {
  title: "Todoist/TaskList",
  component: TaskList,
  args: { source: project, list: list() },
  render: (args) => (
    <div style={{ width: 420, height: 420, display: "flex", flexDirection: "column" }}>
      <TaskList {...args} />
    </div>
  ),
} satisfies Meta<typeof TaskList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSourcePicked: Story = {
  args: { source: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("task-hint")).toBeVisible();
  },
};

export const Loading: Story = {
  args: { list: list({ phase: "loading" }) },
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("task-empty")).toBeVisible();
  },
};

/** All four priorities, a long title, and a description line only where present. */
export const CardVariants: Story = {
  args: {
    list: list({
      tasks: [
        task("1", "Fix the palette flash on load", 1, null, "Scheme applies before first paint."),
        task("2", "Write the ADR 20 undo path", 2),
        task("3", "Check the maskable icon safe zone", 3, null, "Nothing may be clipped."),
        task(
          "4",
          "A title long enough to wrap across more than one line inside a narrow sidebar column",
          4,
        ),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = canvas.getAllByTestId("task-card");
    await expect(cards).toHaveLength(4);
    for (const [index, expected] of ["1", "2", "3", "4"].entries()) {
      await expect(cards[index].querySelector("[data-priority]")).toHaveAttribute(
        "data-priority",
        expected,
      );
      await expect(within(cards[index]).getByRole("img")).toHaveAttribute(
        "aria-label",
        `Priority ${expected}`,
      );
    }
    // A description row exists only where there is a description.
    await expect(canvas.getAllByText(/^Scheme applies/)).toHaveLength(1);
  },
};

export const GroupedBySection: Story = {
  args: {
    list: list({
      sections,
      tasks: [
        task("3", "Someday task", 4, "s2"),
        task("2", "Today task", 1, "s1"),
        task("1", "No section", 3, null),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rendered = canvas.getAllByTestId("task-card").map((el) => el.textContent);
    await expect(rendered[0]).toContain("No section");
    await expect(rendered[1]).toContain("Today task");
    await expect(rendered[2]).toContain("Someday task");
    await expect(canvas.getByText("Today")).toBeVisible();
  },
};

export const Truncated: Story = {
  args: {
    list: list({
      truncated: true,
      tasks: Array.from({ length: 6 }, (_, i) => task(String(i), `Task ${i}`, 4)),
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("task-truncation")).toHaveTextContent(
      "Showing first 200",
    );
  },
};

/** Filters are user-authored code — Todoist's own words, not "went wrong". */
export const FilterError: Story = {
  args: {
    source: { type: "filter", id: "f1", name: "Broken", query: "nonsense!!" },
    list: list({ phase: "error", errorMessage: "Invalid query: unexpected token '!!'" }),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("task-error")).toHaveTextContent(
      "Invalid query",
    );
  },
};

/** A source deleted upstream degrades to the hint, never an error screen. */
export const SourceGoneUpstream: Story = {
  args: { list: list({ gone: true, phase: "idle" }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("task-hint")).toBeVisible();
  },
};
