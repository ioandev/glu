import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { WelcomeContent } from "./WelcomeContent";
import { EnterAppButton } from "./EnterAppButton";
import { WELCOME_CTA, WELCOME_HEADLINE, welcomeFeatures } from "./WelcomeSections";

/**
 * ADR 31. As with the legal pages (ADR 26) and the manual (ADR 29), the real
 * gate here is the a11y addon's contrast check, run in both schemes by
 * `test:stories` / `test:stories:dark`. This page is prose on `--glu-page-bg`
 * and `--glu-surface` plus one `--glu-accent` button — so a failure means the
 * CSS reached for something that is not a token, and on the one page a
 * stranger sees first.
 *
 * The feature assertion is not decoration: the four cards *are* the pitch, and
 * one quietly disappearing is a defect rather than a copy tweak.
 */
const meta = {
  title: "Welcome/WelcomeContent",
  component: WelcomeContent,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof WelcomeContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {
  args: { action: <EnterAppButton /> },
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: WELCOME_HEADLINE }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: WELCOME_CTA })).toBeVisible();

    for (const feature of welcomeFeatures) {
      await expect(canvas.getByRole("heading", { level: 2, name: feature.title })).toBeVisible();
    }
  },
};

/**
 * The `/glu/welcome` frame, where the CTA is an `<a>` rather than a `<button>`
 * (see `EnterAppButton`). Worth its own story: the two elements are styled by
 * one class, and the anchor is the one that inherits UA defaults — it shipped
 * a underline through the middle of the pill until the class said otherwise.
 */
export const AsRoute: Story = {
  args: { action: <EnterAppButton navigateTo="/" /> },
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cta = canvas.getByRole("link", { name: WELCOME_CTA });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveStyle({ textDecorationLine: "none" });
  },
};

/** Half a tablet — the cards stack and the hero has to stay readable. */
export const Phone: Story = {
  args: { action: <EnterAppButton /> },
  globals: { viewport: { value: "halfTablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: WELCOME_CTA })).toBeVisible();
  },
};
