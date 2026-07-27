import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { AppShell } from "@/components/app/AppShell";
import { withStoreState } from "@/stories/storeDecorator";
import { CHROME_LIST } from "./registry";

/**
 * The per-direction composites (ADR 15). Review these side by side against
 * `docs/design/chrome/glu-concepts.dc.html`: what must match is the *systematic*
 * axes — radius, border weight, elevation, label case/family, dot shape — not
 * pixel positions.
 */
const meta = {
  title: "Chrome/Directions",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  decorators: [withStoreState()],
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const tablet = (chrome: string): Story => ({
  globals: { viewport: { value: "tablet" }, chrome },
});
const phone = (chrome: string): Story => ({
  globals: { viewport: { value: "halfTablet" }, chrome },
});

export const StudioQuietTablet: Story = {
  ...tablet("studio-quiet"),
  play: async ({ canvasElement }) => {
    // Tokens, not component code, carry the direction.
    const shell = within(canvasElement).getByLabelText("Timer").parentElement!;
    const styles = getComputedStyle(shell);
    await expect(styles.getPropertyValue("--glu-control-radius").trim()).toBe("12px");
    await expect(styles.getPropertyValue("--glu-dot-radius").trim()).toBe("50%");
  },
};
export const StudioQuietPhone: Story = phone("studio-quiet");

export const InstrumentTablet: Story = {
  ...tablet("instrument"),
  play: async ({ canvasElement }) => {
    const shell = within(canvasElement).getByLabelText("Timer").parentElement!;
    const styles = getComputedStyle(shell);
    await expect(styles.getPropertyValue("--glu-control-radius").trim()).toBe("0px");
    await expect(styles.getPropertyValue("--glu-dot-radius").trim()).toBe("0px");
    await expect(styles.getPropertyValue("--glu-label-transform").trim()).toBe("uppercase");
    await expect(styles.getPropertyValue("--glu-shadow").trim()).toBe("none");
  },
};
export const InstrumentPhone: Story = phone("instrument");

export const PosterTablet: Story = {
  ...tablet("poster"),
  play: async ({ canvasElement }) => {
    const shell = within(canvasElement).getByLabelText("Timer").parentElement!;
    const styles = getComputedStyle(shell);
    await expect(styles.getPropertyValue("--glu-border-width").trim()).toBe("2px");
    await expect(styles.getPropertyValue("--glu-control-radius").trim()).toBe("27px");
    await expect(styles.getPropertyValue("--glu-shadow").trim()).toContain("4px 4px 0");
  },
};
export const PosterPhone: Story = phone("poster");

/**
 * The three demo pairings from the mockups: the page must read as *both* the
 * clock's colour family and the chrome direction (ADR 15), and every piece of
 * chrome must stay legible on it (ADR 08's chrome-on-palette duty). The a11y
 * addon is the gate; the token-level sweep over every clock palette lives in
 * `src/chrome/chrome.test.ts`.
 */
export const StudioQuietOnTide: Story = {
  globals: { viewport: { value: "tablet" }, chrome: "studio-quiet", clock: "tide" },
  decorators: [withStoreState({ activeClockId: "tide" })],
};

export const InstrumentOnTerminal: Story = {
  globals: { viewport: { value: "tablet" }, chrome: "instrument", clock: "terminal" },
  decorators: [withStoreState({ activeClockId: "terminal" })],
};

export const PosterOnPill: Story = {
  globals: { viewport: { value: "tablet" }, chrome: "poster", clock: "pill" },
  decorators: [withStoreState({ activeClockId: "pill" })],
};

/** The named extremes (ADR 15) against the default chrome. */
export const StudioQuietOnEdge: Story = {
  globals: { viewport: { value: "tablet" }, chrome: "studio-quiet", clock: "edge" },
  decorators: [withStoreState({ activeClockId: "edge" })],
};

export const AllDirections: Story = {
  globals: { viewport: { value: "tablet" } },
  play: async () => {
    await expect(CHROME_LIST).toHaveLength(3);
  },
};
