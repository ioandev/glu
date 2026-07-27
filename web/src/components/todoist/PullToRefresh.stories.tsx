import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fireEvent, fn, within } from "storybook/test";
import { useRef, useState } from "react";
import { PULL_MAX, PULL_THRESHOLD, PullToRefresh } from "./PullToRefresh";

/**
 * ADR 43. The four states the gesture actually has: at rest, tracking a finger,
 * armed, and in flight. Every one of them is reached by driving the gesture —
 * there is no prop that fakes a position, because a prop that faked one would
 * be the only way the indicator could ever lie.
 */

interface HarnessProps {
  /** Stays in flight, so the story can sit in the spinning state. */
  slow?: boolean;
  onRefresh?: () => void;
  enabled?: boolean;
}

function Harness({ slow = true, onRefresh, enabled = true }: HarnessProps) {
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  return (
    <div
      style={{
        width: 420,
        height: 360,
        display: "flex",
        flexDirection: "column",
        background: "var(--glu-bg)",
      }}
    >
      <PullToRefresh
        refreshing={refreshing}
        enabled={enabled}
        scrollRef={scrollRef}
        onRefresh={() => {
          onRefresh?.();
          if (slow) setRefreshing(true);
        }}
      >
        <div
          ref={scrollRef}
          data-testid="stand-in-list"
          style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gap: 8 }}
        >
          {/* Buttons, not divs: a scrollable region with nothing focusable in
              it fails the a11y gate — correctly (the real list is cards). */}
          {Array.from({ length: 8 }, (_, i) => (
            <button
              type="button"
              key={i}
              style={{
                textAlign: "left",
                border: "var(--glu-border)",
                borderRadius: "var(--glu-radius-card)",
                background: "var(--glu-surface)",
                padding: 12,
                color: "var(--glu-fg)",
              }}
            >
              Task {i + 1}
            </button>
          ))}
        </div>
      </PullToRefresh>
    </div>
  );
}

const meta = {
  title: "Todoist/PullToRefresh",
  component: Harness,
  args: { slow: true, enabled: true },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

const touch = (y: number, x = 0) => ({
  pointerId: 1,
  isPrimary: true,
  pointerType: "touch",
  clientX: x,
  clientY: y,
});

/** Half the finger's distance, so 200 px of drag pins the icon at its ceiling. */
const ARMING_DRAG = 200;

const drag = async (host: HTMLElement, to: number, release = true) => {
  await fireEvent.pointerDown(host, touch(0));
  await fireEvent.pointerMove(host, touch(to));
  if (release) await fireEvent.pointerUp(host, touch(to));
};

const travelOf = (indicator: HTMLElement) => indicator.style.getPropertyValue("--pull");

export const AtRest: Story = {
  play: async ({ canvasElement }) => {
    const indicator = within(canvasElement).getByTestId("pull-indicator");
    await expect(travelOf(indicator)).toBe("0px");
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    // Above the top edge and invisible until a finger asks for it.
    await expect(Number(getComputedStyle(indicator).opacity)).toBe(0);
  },
};

/** Tracking, but a release here would do nothing — and it has to look like it. */
export const Pulling: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await drag(canvas.getByTestId("pull-host"), 60, false);

    const indicator = canvas.getByTestId("pull-indicator");
    await expect(travelOf(indicator)).toBe("30px");
    await expect(indicator).toHaveAttribute("data-tracking");
    await expect(indicator).not.toHaveAttribute("data-armed");
    // Visible, but partially — the ramp is the "not yet" signal.
    await expect(Number(getComputedStyle(indicator).opacity)).toBeLessThan(1);
  },
};

export const Armed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await drag(canvas.getByTestId("pull-host"), ARMING_DRAG, false);

    const indicator = canvas.getByTestId("pull-indicator");
    await expect(travelOf(indicator)).toBe(`${PULL_MAX}px`);
    await expect(indicator).toHaveAttribute("data-armed");
    await expect(Number(getComputedStyle(indicator).opacity)).toBe(1);
  },
};

export const Refreshing: Story = {
  args: { onRefresh: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await drag(canvas.getByTestId("pull-host"), ARMING_DRAG);

    await expect(args.onRefresh).toHaveBeenCalledTimes(1);
    const indicator = canvas.getByTestId("pull-indicator");
    await expect(indicator).toHaveAttribute("data-spinning");
    await expect(indicator).not.toHaveAttribute("data-tracking");
    await expect(travelOf(indicator)).toBe("56px");
  },
};

/** Released short of the line: it goes back up and nothing is fetched. */
export const ReleasedShort: Story = {
  args: { onRefresh: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await drag(canvas.getByTestId("pull-host"), PULL_THRESHOLD);

    await expect(args.onRefresh).not.toHaveBeenCalled();
    await expect(canvas.getByTestId("pull-indicator")).not.toHaveAttribute("data-spinning");
    await expect(travelOf(canvas.getByTestId("pull-indicator"))).toBe("0px");
  },
};

/** A mouse has the header's refresh button; the gesture is touch only. */
export const MouseDoesNothing: Story = {
  args: { onRefresh: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const host = canvas.getByTestId("pull-host");
    await fireEvent.pointerDown(host, { ...touch(0), pointerType: "mouse" });
    await fireEvent.pointerMove(host, { ...touch(ARMING_DRAG), pointerType: "mouse" });
    await fireEvent.pointerUp(host, { ...touch(ARMING_DRAG), pointerType: "mouse" });

    await expect(args.onRefresh).not.toHaveBeenCalled();
    await expect(travelOf(canvas.getByTestId("pull-indicator"))).toBe("0px");
  },
};

/** No source picked: no gesture, and nothing painted over the hint. */
export const Disabled: Story = {
  args: { enabled: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId("pull-indicator")).toBeNull();
  },
};
