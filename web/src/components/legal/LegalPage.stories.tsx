import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { LegalPage } from "./LegalPage";
import privacyEn from "./content/privacy/en";
import termsEn from "./content/terms/en";

/*
 * The two documents are rendered through the shell directly rather than through
 * `PrivacyContent` / `TermsContent` (ADR 44): those are now `async` server
 * components that resolve the reader's language, and Storybook renders in the
 * browser. Pinning English here is also the honest thing — these stories assert
 * English headings, and the a11y gate they exist for is about the *treatment*,
 * which every language shares.
 */
const PrivacyDocument = () => <LegalPage {...privacyEn} />;
const TermsDocument = () => <LegalPage {...termsEn} />;

/**
 * ADR 26. The real check here is the a11y addon's contrast gate, run in both
 * schemes by `test:stories` / `test:stories:dark`: these pages are prose on
 * `--glu-surface` and `--glu-page-bg`, and ADR 15's resolver already guarantees
 * `--glu-muted` clears 4.5:1 on both — so a failure means the CSS reached for
 * something that is not a token.
 */
const meta = {
  title: "Legal/LegalPage",
  component: PrivacyDocument,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PrivacyDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Privacy: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeVisible();
    // The claim list is the deliverable — a section going missing is a defect,
    // not a copy tweak.
    await expect(canvas.getByRole("heading", { name: /What is stored on your device/ })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: /Cookies/ })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: /Todoist/ })).toBeVisible();
    await expect(canvas.getByText(/Last updated:/)).toBeVisible();

    const terms = canvas.getAllByRole("link", { name: "Terms of Service" })[0];
    await expect(terms).toHaveAttribute("href", "/terms");
  },
};

export const PrivacyPhone: Story = {
  globals: { viewport: { value: "halfTablet" } },
};

export const Terms: Story = {
  globals: { viewport: { value: "tablet" } },
  render: () => <TermsDocument />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { name: /Your Todoist account/ })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: /Governing law/ })).toBeVisible();

    const privacy = canvas.getAllByRole("link", { name: "Privacy Policy" })[0];
    await expect(privacy).toHaveAttribute("href", "/privacy");

    // ≥44 px, boilerplate or not.
    const back = canvas.getByRole("link", { name: /Back to GLU/ });
    await expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

export const TermsPhone: Story = {
  globals: { viewport: { value: "halfTablet" } },
  render: () => <TermsDocument />,
};
