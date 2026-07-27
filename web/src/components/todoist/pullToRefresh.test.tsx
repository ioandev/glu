import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { useRef, useState } from "react";
import {
  PULL_MAX,
  PULL_MIN_SPIN_MS,
  PULL_STALL_MS,
  PULL_THRESHOLD,
  PullToRefresh,
  pull,
} from "./PullToRefresh";

/**
 * ADR 43. The claims worth holding: the resistance curve, what arms the gesture
 * and what refuses to, that a sub-threshold release costs nothing, and that the
 * indicator outlives a fast response by the spinner floor.
 */

/**
 * jsdom ships no `PointerEvent` and no capture API. A `MouseEvent` subclass is
 * enough — `clientX`/`clientY` already come from `MouseEvent`, and the three
 * pointer fields are the only others the component reads.
 */
class PointerEventStub extends MouseEvent {
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  constructor(type: string, init: MouseEventInit & Record<string, unknown> = {}) {
    super(type, init);
    this.pointerId = (init.pointerId as number) ?? 1;
    this.pointerType = (init.pointerType as string) ?? "touch";
    this.isPrimary = (init.isPrimary as boolean) ?? true;
  }
}

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", {
    writable: true,
    configurable: true,
    value: PointerEventStub,
  });
  for (const name of ["setPointerCapture", "releasePointerCapture"] as const) {
    Object.defineProperty(Element.prototype, name, { writable: true, value: () => {} });
  }
  Object.defineProperty(Element.prototype, "hasPointerCapture", {
    writable: true,
    value: () => false,
  });
});

interface HarnessProps {
  onRefresh?: () => void;
  enabled?: boolean;
  onChildClick?: () => void;
}

/**
 * The panel in miniature: `refreshing` is owned outside the component, exactly
 * as `useTodoistList` owns it, and `flight()` is what a request landing looks
 * like from in here.
 */
function Harness({ onRefresh, enabled = true, onChildClick }: HarnessProps) {
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  return (
    <MantineProvider>
      <button type="button" data-testid="flight-on" onClick={() => setRefreshing(true)}>
        on
      </button>
      <button type="button" data-testid="flight-off" onClick={() => setRefreshing(false)}>
        off
      </button>
      <PullToRefresh
        refreshing={refreshing}
        onRefresh={() => onRefresh?.()}
        enabled={enabled}
        scrollRef={scrollRef}
      >
        <div ref={scrollRef} data-testid="scroller" onScroll={() => {}}>
          <button type="button" data-testid="child" onClick={() => onChildClick?.()}>
            a task
          </button>
        </div>
      </PullToRefresh>
    </MantineProvider>
  );
}

const host = () => screen.getByTestId("pull-host");
const indicator = () => screen.getByTestId("pull-indicator");
const travel = () => indicator().style.getPropertyValue("--pull");

const down = (y = 0, init: Record<string, unknown> = {}) =>
  fireEvent.pointerDown(host(), { pointerId: 1, isPrimary: true, pointerType: "touch", clientX: 0, clientY: y, ...init });
const move = (y: number, x = 0) =>
  fireEvent.pointerMove(host(), {
    pointerId: 1,
    isPrimary: true,
    pointerType: "touch",
    clientX: x,
    clientY: y,
  });
const up = (y: number, x = 0) =>
  fireEvent.pointerUp(host(), {
    pointerId: 1,
    isPrimary: true,
    pointerType: "touch",
    clientX: x,
    clientY: y,
  });

/** Past the threshold with room to spare — 200 px of finger is 96 px of travel. */
const ARMING_DRAG = 200;

const setScrollTop = (value: number) => {
  Object.defineProperty(screen.getByTestId("scroller"), "scrollTop", {
    writable: true,
    configurable: true,
    value,
  });
};

describe("pull() resistance (ADR 43)", () => {
  it("ignores upward travel entirely", () => {
    expect(pull(0)).toBe(0);
    expect(pull(-200)).toBe(0);
  });

  it("moves at half the finger's distance", () => {
    expect(pull(40)).toBe(20);
    expect(pull(2 * PULL_THRESHOLD)).toBe(PULL_THRESHOLD);
  });

  it("clamps at the ceiling, so the finger can keep going and the icon cannot", () => {
    expect(pull(2 * PULL_MAX)).toBe(PULL_MAX);
    expect(pull(10_000)).toBe(PULL_MAX);
  });
});

describe("the gesture (ADR 43)", () => {
  it("tracks the finger once past the engage threshold and arms at the line", () => {
    render(<Harness />);
    expect(travel()).toBe("0px");

    down(0);
    move(4);
    // Under the engage threshold this is still a tap, not a pull.
    expect(travel()).toBe("0px");

    move(60);
    expect(travel()).toBe("30px");
    expect(indicator()).not.toHaveAttribute("data-armed");

    move(ARMING_DRAG);
    expect(travel()).toBe(`${PULL_MAX}px`);
    expect(indicator()).toHaveAttribute("data-armed");
  });

  it("refreshes once on an armed release and holds the spinner out", () => {
    const onRefresh = vi.fn();
    render(<Harness onRefresh={onRefresh} />);

    down(0);
    move(ARMING_DRAG);
    up(ARMING_DRAG);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(indicator()).toHaveAttribute("data-spinning");
    expect(travel()).toBe("56px");
  });

  it("costs nothing when released short of the line", () => {
    const onRefresh = vi.fn();
    render(<Harness onRefresh={onRefresh} />);

    down(0);
    move(60); // 30 px of travel — visible, not armed
    up(60);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(indicator()).not.toHaveAttribute("data-spinning");
    expect(travel()).toBe("0px");
  });

  it("never arms for a mouse — the header button is the pointer path", () => {
    const onRefresh = vi.fn();
    render(<Harness onRefresh={onRefresh} />);

    down(0, { pointerType: "mouse" });
    move(ARMING_DRAG);
    up(ARMING_DRAG);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(travel()).toBe("0px");
  });

  it("never arms when the list is scrolled down — that finger is scrolling", () => {
    const onRefresh = vi.fn();
    render(<Harness onRefresh={onRefresh} />);
    setScrollTop(120);

    down(0);
    move(ARMING_DRAG);
    up(ARMING_DRAG);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(travel()).toBe("0px");
  });

  it("yields to a horizontal drag", () => {
    const onRefresh = vi.fn();
    render(<Harness onRefresh={onRefresh} />);

    down(0);
    move(4, 40); // sideways wins before the pull ever engages
    move(ARMING_DRAG, 40);
    up(ARMING_DRAG, 40);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(travel()).toBe("0px");
  });

  it("swallows the click a completed pull would otherwise land on a task", () => {
    const onChildClick = vi.fn();
    render(<Harness onChildClick={onChildClick} />);

    down(0);
    move(ARMING_DRAG);
    up(ARMING_DRAG);
    fireEvent.click(screen.getByTestId("child"));
    expect(onChildClick).not.toHaveBeenCalled();

    // Exactly one — the next tap is a tap again.
    fireEvent.click(screen.getByTestId("child"));
    expect(onChildClick).toHaveBeenCalledTimes(1);
  });

  it("is inert without a source", () => {
    const onRefresh = vi.fn();
    render(<Harness onRefresh={onRefresh} enabled={false} />);
    expect(screen.queryByTestId("pull-indicator")).toBeNull();

    down(0);
    move(ARMING_DRAG);
    up(ARMING_DRAG);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("carries no accessible name — the header button is the a11y path", () => {
    render(<Harness />);
    expect(indicator()).toHaveAttribute("aria-hidden", "true");
  });
});

describe("the spinner floor (ADR 43)", () => {
  it("outlives a response faster than the floor, then retracts", () => {
    vi.useFakeTimers();
    render(<Harness />);

    down(0);
    move(ARMING_DRAG);
    up(ARMING_DRAG);

    // The request lands almost immediately — the flash the floor exists for.
    // Two acts, not one: batched into a single render, `refreshing` would never
    // be observed true, which is a different path (the stall valve below).
    act(() => void fireEvent.click(screen.getByTestId("flight-on")));
    act(() => void fireEvent.click(screen.getByTestId("flight-off")));
    expect(indicator()).toHaveAttribute("data-spinning");

    act(() => void vi.advanceTimersByTime(PULL_MIN_SPIN_MS));
    expect(indicator()).not.toHaveAttribute("data-spinning");
    expect(travel()).toBe("0px");
  });

  it("stays out for a slow response, and retracts when it lands", () => {
    vi.useFakeTimers();
    render(<Harness />);

    down(0);
    move(ARMING_DRAG);
    up(ARMING_DRAG);
    act(() => void fireEvent.click(screen.getByTestId("flight-on")));

    act(() => void vi.advanceTimersByTime(5_000));
    expect(indicator()).toHaveAttribute("data-spinning");

    act(() => void fireEvent.click(screen.getByTestId("flight-off")));
    act(() => void vi.advanceTimersByTime(PULL_MIN_SPIN_MS));
    expect(indicator()).not.toHaveAttribute("data-spinning");
  });

  it("retracts anyway when the refresh never takes flight", () => {
    vi.useFakeTimers();
    render(<Harness />);

    down(0);
    move(ARMING_DRAG);
    up(ARMING_DRAG);
    expect(indicator()).toHaveAttribute("data-spinning");

    act(() => void vi.advanceTimersByTime(PULL_STALL_MS));
    expect(indicator()).not.toHaveAttribute("data-spinning");
  });
});
