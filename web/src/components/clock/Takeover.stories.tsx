import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MINUTE } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { AppShell } from "@/components/app/AppShell";

/** A run with 40 s left, so the shell mounts straight into the takeover. */
const finalMinute = (patch: Record<string, unknown> = {}) => ({
  status: "running" as const,
  endAt: Date.now() + 40_000,
  remaining: 40_000,
  total: 20 * MINUTE,
  runId: "story-run",
  runningSince: Date.now() - 19 * MINUTE,
  ...patch,
});

/**
 * Ends the run the way the tick loop does — a play function drives the store
 * rather than sleeping out the real 40 seconds (ADR 03).
 */
const runToZero = async (canvas: ReturnType<typeof within>) => {
  useGluStore.getState().finish();
  await waitFor(() => expect(canvas.getByTestId("clock-slot")).toHaveTextContent("00:00"));
};

const meta = {
  title: "Clocks/Takeover",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "tablet" } },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Mounted inside the final minute: the takeover is present on first paint with
 * no entrance sweep (a page load has no crossing to narrate).
 */
export const InTheFinalMinute: Story = {
  decorators: [withStoreState(finalMinute())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overlay = await canvas.findByTestId("takeover-overlay");
    await expect(overlay).toHaveAttribute("data-phase", "on");
    // Everything except the clock is covered: the overlay outranks the chrome,
    // and the clock's own container outranks the overlay.
    const overlayZ = Number(getComputedStyle(overlay).zIndex);
    const slotZ = Number(getComputedStyle(canvas.getByTestId("clock-slot")).zIndex);
    await expect(slotZ).toBeGreaterThan(overlayZ);
  },
};

/** The overlay is painted in the page background, whatever the palette is. */
export const OnTheTidePalette: Story = {
  globals: { viewport: { value: "tablet" }, chrome: "studio-quiet", clock: "tide" },
  decorators: [withStoreState(finalMinute({ activeClockId: "tide" }))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overlay = await canvas.findByTestId("takeover-overlay");
    const shell = canvas.getByLabelText("Timer").parentElement!;
    await expect(getComputedStyle(overlay).backgroundColor).toBe(
      getComputedStyle(shell).backgroundColor,
    );
  },
};

export const OnThePosterChrome: Story = {
  globals: { viewport: { value: "tablet" }, chrome: "poster", clock: "pill" },
  decorators: [withStoreState(finalMinute({ activeClockId: "pill" }))],
};

/** The three blend-mode clocks must render unchanged while elevated. */
export const BlendModeClocksElevated: Story = {
  decorators: [withStoreState(finalMinute({ activeClockId: "field" }))],
  play: async ({ canvasElement }) => {
    const slot = within(canvasElement).getByTestId("clock-slot");
    await expect(slot).toHaveAttribute("data-clock-id", "field");
    await expect(slot.firstElementChild).toBeVisible();
  },
};

/**
 * Tapping the overlay dissolves it: the chrome comes back, usable, and stays
 * (ADR 21 amendment 2026-07-25 — the tap is a decision about the run, not a
 * five-second peek).
 */
export const DismissedByATap: Story = {
  decorators: [withStoreState(finalMinute())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overlay = await canvas.findByTestId("takeover-overlay");
    await userEvent.click(overlay);
    await expect(canvas.queryByTestId("takeover-overlay")).toBeNull();
    // The controls the dismissal exists for.
    await expect(canvas.getByRole("button", { name: /Add 5 minutes/ })).toBeVisible();
  },
};

/** At 0:00 the takeover *is* the distraction-free display. */
export const FinishedTakeover: Story = {
  decorators: [withStoreState(finalMinute())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId("takeover-overlay")).toBeVisible();

    // The run ends under a takeover that is already up: that cover is the one
    // 00:00 carries through (ADR 21).
    await runToZero(canvas);
    await expect(canvas.getByTestId("takeover-overlay")).toBeVisible();

    // A tap dissolves it permanently — no re-engage, the session is over.
    await userEvent.click(canvas.getByTestId("takeover-overlay"));
    await expect(canvas.queryByTestId("takeover-overlay")).toBeNull();
  },
};

/**
 * The clock rides *above* the overlay, so it is the one surface a tap can land
 * on without the overlay seeing it — it has to honour the tap itself (ADR 21).
 */
export const TappingTheClockDissolvesIt: Story = {
  decorators: [withStoreState(finalMinute())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId("takeover-overlay")).toBeVisible();
    await runToZero(canvas);

    await userEvent.click(canvas.getByTestId("clock-slot"));
    await expect(canvas.queryByTestId("takeover-overlay")).toBeNull();
    // …and the header drawer's button is reachable again (ADR 10).
    await expect(canvas.getByRole("button", { name: /Open header/i })).toBeVisible();
  },
};

/**
 * ADR 21 amendment (2026-07-25): below `sm` there is no takeover at all. ADR 08
 * already hands the clock the entire first viewport there, so the chrome the
 * overlay would hide is below the fold — covering the screen hides nothing and
 * takes the scroll with it.
 */
export const NoTakeoverBelowSm: Story = {
  globals: { viewport: { value: "halfTablet" } },
  decorators: [withStoreState(finalMinute())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("clock-slot")).toBeVisible();
    await expect(canvas.queryByTestId("takeover-overlay")).toBeNull();

    // Nor at 00:00 — and everything stacked below the clock stays reachable.
    await runToZero(canvas);
    await expect(canvas.queryByTestId("takeover-overlay")).toBeNull();
    await expect(canvas.getByRole("button", { name: /Open header/i })).toBeVisible();
  },
};

/**
 * ADR 21 amendment (2026-07-25): a reload at 00:00 restores the app, not the
 * endgame screen — the 00:00 cover persists through a crossing, and a page load
 * has no crossing behind it.
 */
export const FinishedOnReload: Story = {
  decorators: [
    withStoreState({
      status: "finished",
      remaining: 0,
      total: 20 * MINUTE,
      runId: "story-run",
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("clock-slot")).toHaveTextContent("00:00");
    await expect(canvas.queryByTestId("takeover-overlay")).toBeNull();
    await expect(canvas.getByRole("button", { name: /Open header/i })).toBeVisible();
  },
};

/** Above the threshold, and when idle: no takeover at all. */
export const NoTakeoverAboveThreshold: Story = {
  decorators: [
    withStoreState({
      status: "running",
      endAt: Date.now() + 5 * MINUTE,
      remaining: 5 * MINUTE,
      total: 20 * MINUTE,
      runId: "story-run",
      runningSince: Date.now(),
    }),
  ],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("takeover-overlay")).toBeNull();
  },
};
