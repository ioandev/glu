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

    // Four action rows (ADR 29 added Docs), plus ADR 26's legal footer below.
    const github = panel.getByRole("link", { name: /GitHub/ });
    await expect(github).toHaveAttribute("href", GITHUB_URL);
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", "noopener noreferrer");

    await expect(panel.getByText("Appearance")).toBeVisible();
    await expect(panel.getByText("Docs")).toBeVisible();
    await expect(panel.getByText("Settings")).toBeVisible();

    for (const row of [
      github,
      panel.getByText("Appearance").closest("button")!,
      panel.getByText("Docs").closest("button")!,
      panel.getByText("Settings").closest("button")!,
    ]) {
      await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }

    // Docs is an action row, not a legal-footer link: it opens an overlay, so a
    // footer where one link opens a tab and its neighbour opens a modal would
    // teach nothing (ADR 29).
    await expect(panel.queryByRole("link", { name: "Docs" })).toBeNull();

    // ADR 26: references, in their own nav, opening in a new tab. The hrefs are
    // unprefixed here because Storybook does not run `next.config.ts` — the
    // basePath is applied by the build, so `/glu/…` is asserted in the ADR 09
    // E2E block, which is the only place that can see it.
    const legal = within(within(dialog).getByRole("navigation", { name: "Legal" }));
    for (const [name, href] of [
      ["Privacy Policy", "/privacy"],
      ["Terms of Service", "/terms"],
    ] as const) {
      const link = legal.getByRole("link", { name });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
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

/**
 * ADR 29: the Docs row opens the manual as a modal. The body arrives through
 * `next/dynamic`, so every query here is a `findBy*` — asserting synchronously
 * would be testing the loading state.
 *
 * Tablet only, matching the Settings-modal story above. A **full-screen** modal
 * over the open drawer puts two Mantine headers in the document, which axe reads
 * as two `banner` landmarks — pre-existing (Settings does exactly this below
 * 48em today; it simply has no phone story) and out of this ADR's scope. It is
 * recorded as a deviation in ADR 29 rather than hidden behind a story that
 * asserts around it.
 */
export const DocsModalOpen: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const body = await openDrawer(canvasElement);
    const drawer = await body.findByRole("dialog");
    await userEvent.click(within(drawer).getByText("Docs"));

    await expect(await body.findByTestId("docs-modal-body")).toBeVisible();
    await expect(await body.findByRole("heading", { name: /The timer/ })).toBeVisible();
    await expect(
      await body.findByRole("heading", { name: /Todoist \(optional\)/ }),
    ).toBeVisible();

    // The brief's closing navigation, and the reason it opens a new tab: the app
    // behind this overlay has a wake lock, a primed audio context and possibly a
    // running timer, and none of them survive a navigation.
    const nav = within(await body.findByRole("navigation", { name: "Docs navigation" }));
    for (const name of ["Privacy Policy", "Terms of Service"] as const) {
      const link = nav.getByRole("link", { name });
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    await expect(nav.getByRole("link", { name: "Open as a page" })).toHaveAttribute(
      "href",
      "/docs",
    );

    await userEvent.keyboard("{Escape}");
    await expect(body.queryByRole("button", { name: "Close docs" })).toBeNull();
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
