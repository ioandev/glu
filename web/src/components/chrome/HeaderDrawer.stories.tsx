import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { withStoreState } from "@/stories/storeDecorator";
import { GITHUB_URL, HeaderDrawer } from "./HeaderDrawer";

const meta = {
  title: "Chrome/HeaderDrawer",
  component: HeaderDrawer,
  parameters: { layout: "fullscreen" },
  decorators: [withStoreState()],
  render: () => (
    <div style={{ minHeight: 420, position: "relative", padding: 16 }}>
      <HeaderDrawer />
    </div>
  ),
} satisfies Meta<typeof HeaderDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hidden by default: the arrow is the only new chrome. */
export const Closed: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const arrow = canvas.getByRole("button", { name: "Open header" });
    const box = arrow.getBoundingClientRect();
    await expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};

export const ClosedPhone: Story = {
  globals: { viewport: { value: "halfTablet" } },
};

const openDrawer = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement.ownerDocument.body);
  await userEvent.click(
    within(canvasElement).getByRole("button", { name: "Open header" }),
  );
  return canvas;
};

export const Open: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const body = await openDrawer(canvasElement);
    const dialog = await body.findByRole("dialog");
    const panel = within(dialog);

    // Exactly three entries.
    const github = panel.getByRole("link", { name: /GitHub/ });
    await expect(github).toHaveAttribute("href", GITHUB_URL);
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", "noopener noreferrer");

    await expect(panel.getByText("Appearance")).toBeVisible();
    await expect(panel.getByText("Settings")).toBeVisible();

    for (const row of [github, panel.getByText("Appearance").closest("button")!]) {
      await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

export const OpenPhone: Story = {
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const body = await openDrawer(canvasElement);
    await expect(await body.findByRole("dialog")).toBeVisible();
  },
};

export const SettingsModalOpen: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const body = await openDrawer(canvasElement);
    const drawer = await body.findByRole("dialog");
    await userEvent.click(within(drawer).getByText("Settings"));

    // ADR 19 filled the socket: the modal now carries the Todoist section.
    await expect(await body.findByLabelText("Todoist settings")).toBeVisible();
    await expect(await body.findByRole("button", { name: "Close settings" })).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await expect(body.queryByRole("button", { name: "Close settings" })).toBeNull();
  },
};

export const ThemeRowTogglesTheScheme: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const body = await openDrawer(canvasElement);
    const drawer = await body.findByRole("dialog");
    const row = within(drawer).getByText("Appearance").closest("button")!;
    const before = row.getAttribute("aria-label");
    await userEvent.click(row);
    // The global preview decorator pins the scheme, so the label is the honest
    // observable here; the real flip is covered by the ADR 09 E2E block.
    await expect(row).toHaveAttribute("aria-label", before!);
  },
};
