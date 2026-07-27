import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { LegalPage } from "@/components/legal/LegalPage";
import docsEn from "./content/en";

/*
 * The shell over the English manual rather than `DocsContent` (ADR 44): that is
 * now an `async` server component resolving the reader's language, and these
 * assertions are about English headings and the shared prose treatment.
 */
const DocsContent = () => <LegalPage {...docsEn} />;

/**
 * ADR 29. As with the legal pages (ADR 26), the real gate here is the a11y
 * addon's contrast check, run in both schemes by `test:stories` /
 * `test:stories:dark`: this document is prose on `--glu-page-bg` and
 * `--glu-surface`, and ADR 15's resolver already guarantees `--glu-muted`
 * clears 4.5:1 on both — so a failure means the CSS reached for something that
 * is not a token.
 *
 * The section assertions are not decoration: the claim list *is* the
 * deliverable, and a section quietly disappearing is a defect, not a copy tweak.
 */
const meta = {
  title: "Docs/DocsContent",
  component: DocsContent,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DocsContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "How GLU works" }),
    ).toBeVisible();
    await expect(canvas.getByText(/Last updated:/)).toBeVisible();

    for (const heading of [
      /The timer/,
      /Keyboard shortcuts/,
      /The clock is a gallery/,
      /Environment toggles/,
      /Sessions and/,
      /Alerts at the end of a run/,
      /Keeping the screen awake/,
      /Todoist \(optional\)/,
      /Where everything lives/,
      /Limits, honestly/,
    ]) {
      await expect(canvas.getByRole("heading", { name: heading })).toBeVisible();
    }

    // The brief's closing navigation. Unprefixed here because Storybook does not
    // run `next.config.ts`; the `/glu/…` form is asserted in the ADR 09 block.
    const footer = within(canvas.getByRole("navigation", { name: "Legal" }));
    await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(footer.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/terms",
    );

    const back = canvas.getByRole("link", { name: /Back to GLU/ });
    await expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

export const DocsPhone: Story = {
  globals: { viewport: { value: "halfTablet" } },
};
