import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { TaskDetailBody } from "./TaskDetail";
import type { TaskDetailState, UiComment } from "./useTaskDetail";

/** A 1×1 PNG, so the story needs no network at all. */
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const comment = (patch: Partial<UiComment> = {}): UiComment => ({
  id: "c1",
  text: "Scheme applies before first paint.",
  postedAt: "2026-07-24T09:12:00.000Z",
  postedByUid: "42",
  attachment: null,
  ...patch,
});

const detail = (patch: Partial<TaskDetailState> = {}): TaskDetailState => ({
  phase: "ready",
  task: {
    id: "t1",
    title: "Fix the palette flash on load",
    description:
      "Scheme applies before first paint.\nCheck the bootstrap script order — the token map must resolve synchronously.",
    uiPriority: 1,
    sectionId: null,
    order: 0,
  },
  comments: [comment()],
  truncated: false,
  cap: 100,
  refreshing: false,
  errorMessage: null,
  refresh: () => {},
  ...patch,
});

const meta = {
  title: "Todoist/TaskDetail",
  component: TaskDetailBody,
  args: { detail: detail(), onClose: () => {} },
  render: (args) => (
    <div style={{ width: 420, padding: 16 }}>
      <TaskDetailBody {...args} />
    </div>
  ),
} satisfies Meta<typeof TaskDetailBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithComments: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("task-detail")).toBeVisible();
    // Line breaks are preserved, not collapsed.
    await expect(canvas.getByTestId("detail-description")).toHaveStyle({
      whiteSpace: "pre-wrap",
    });
    await expect(canvas.getAllByTestId("comment")).toHaveLength(1);
  },
};

export const Loading: Story = { args: { detail: detail({ phase: "loading" }) } };

export const LongDescription: Story = {
  args: {
    detail: detail({
      task: {
        id: "t2",
        title: "A task whose title runs long enough to wrap inside a 420px drawer column",
        description: Array.from({ length: 8 }, (_, i) => `Line ${i + 1} of the description.`).join(
          "\n",
        ),
        uiPriority: 3,
        sectionId: null,
        order: 0,
      },
    }),
  },
};

/** Image, non-image file, and text-only — the three comment shapes. */
export const CommentShapes: Story = {
  args: {
    detail: detail({
      comments: [
        comment({ id: "c1", text: "Text only." }),
        comment({
          id: "c2",
          text: "Screenshot:",
          attachment: {
            kind: "image",
            fileName: "shot.png",
            fileType: "image/png",
            src: PIXEL,
            width: 800,
            height: 500,
          },
        }),
        comment({
          id: "c3",
          text: "Spec attached.",
          attachment: { kind: "file", fileName: "spec.pdf", fileType: "application/pdf" },
        }),
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const image = canvas.getByTestId("comment-image");
    await expect(image).toHaveAttribute("loading", "lazy");
    // Space is reserved from the attachment's own metadata, so a late image
    // cannot shove the thread around.
    await expect(image.parentElement).toHaveStyle({ aspectRatio: "800 / 500" });

    const file = canvas.getByTestId("comment-file");
    await expect(file).toHaveTextContent("spec.pdf");
    // A non-image attachment is inert: no link, nothing to click.
    await expect(within(file).queryByRole("link")).toBeNull();
  },
};

export const Truncated: Story = {
  args: {
    detail: detail({
      truncated: true,
      comments: Array.from({ length: 4 }, (_, i) =>
        comment({ id: `c${i}`, text: `Comment ${i}` }),
      ),
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("detail-truncation")).toHaveTextContent(
      "Showing first 100",
    );
  },
};

export const GoneUpstream: Story = {
  args: { detail: detail({ phase: "gone", task: null, comments: [] }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("detail-gone")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Close" })).toBeVisible();
  },
};

export const Refreshing: Story = { args: { detail: detail({ refreshing: true }) } };
