"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { IconRefresh } from "@tabler/icons-react";
import classes from "./todoist.module.css";

/** Downward travel before a press becomes a pull rather than a tap. */
export const PULL_ENGAGE = 8;
/** Indicator travel at which a release will actually refresh. */
export const PULL_THRESHOLD = 64;
/** Where the indicator sits while the request is in flight. */
export const PULL_REST = 56;
/** The ceiling — past this the finger keeps moving and the indicator does not. */
export const PULL_MAX = 96;
/**
 * The spinner's floor. A 200 ms response would otherwise flash once and read as
 * "nothing happened", which is the exact doubt the gesture exists to answer.
 */
export const PULL_MIN_SPIN_MS = 400;
/**
 * Safety valve: if `refreshing` never goes true — a `reload()` that no-ops
 * because the source vanished, say — the indicator retracts anyway rather than
 * spinning forever.
 */
export const PULL_STALL_MS = 1200;

/**
 * Indicator travel for a finger that has moved `dy` down (ADR 43). Half
 * distance, clamped: a 1:1 indicator on a container that cannot scroll up reads
 * as a bug, and the clamp is what tells the finger the gesture has a ceiling.
 */
export function pull(dy: number): number {
  return Math.min(Math.max(dy, 0) * 0.5, PULL_MAX);
}

type Phase = "idle" | "pulling" | "refreshing";

/**
 * Capture, so a finger that wanders off the panel still ends its gesture here.
 * `setPointerCapture` throws on a pointer the browser does not consider active —
 * a synthetic one, or a real one already lifted — and losing capture is a worse
 * gesture, never a broken one.
 */
function capture(element: Element, pointerId: number) {
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    /* no capture: the drag still tracks, it just ends if the finger leaves */
  }
}

export interface PullToRefreshProps {
  /** ADR 12's in-flight-over-a-rendered-list flag, straight from `useTodoistList`. */
  refreshing: boolean;
  onRefresh: () => void;
  /** No source, no refresh — same condition the header button is disabled on. */
  enabled?: boolean;
  /** The list's own scroll container, when one is rendered. */
  scrollRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * Pull-to-refresh over the task list (ADR 43). Touch only, from the top of the
 * list only, resolving to the same `reload()` the header's refresh button
 * calls — no new fetch machinery and no new store state.
 *
 * The gesture is an **enhancement, not an affordance**: the indicator is
 * `aria-hidden` and the header button remains the accessible path, because a
 * pull has no keyboard or screen-reader equivalent.
 */
export function PullToRefresh({
  refreshing,
  onRefresh,
  enabled = true,
  scrollRef,
  children,
}: PullToRefreshProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [travel, setTravel] = useState(0);

  const pointerId = useRef<number | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const engaged = useRef(false);
  /** A drag past the engage threshold still fires `click` on whatever is under
   *  the finger — without this, pulling from a task card opens that task. */
  const swallow = useRef(false);
  const startedAt = useRef(0);
  /** `reload()` bumps a nonce, so `refreshing` only goes true on the *next*
   *  render: retracting before having seen it would end the spin immediately. */
  const sawFlight = useRef(false);

  const release = (element: Element | null) => {
    const id = pointerId.current;
    if (id !== null && element?.hasPointerCapture?.(id)) element.releasePointerCapture(id);
    pointerId.current = null;
    engaged.current = false;
  };

  useEffect(() => {
    if (phase !== "refreshing") return;
    if (refreshing) {
      sawFlight.current = true;
      return;
    }
    const retract = () => {
      setPhase("idle");
      setTravel(0);
    };
    if (!sawFlight.current) {
      const stall = setTimeout(() => {
        if (!sawFlight.current) retract();
      }, PULL_STALL_MS);
      return () => clearTimeout(stall);
    }
    const wait = Math.max(0, PULL_MIN_SPIN_MS - (Date.now() - startedAt.current));
    const timer = setTimeout(retract, wait);
    return () => clearTimeout(timer);
  }, [phase, refreshing]);

  // A source change (or a logout) while the indicator is out drops it — React's
  // adjust-state-during-render pattern, not an effect: an effect here would be
  // a second render's worth of a spinner belonging to a list that is gone.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled);
    setPhase("idle");
    setTravel(0);
  }

  const armed = phase === "pulling" && travel >= PULL_THRESHOLD;
  const spinning = phase === "refreshing";

  return (
    <div
      className={classes.pullHost}
      data-testid="pull-host"
      onPointerDown={(event) => {
        swallow.current = false;
        if (!enabled || phase === "refreshing") return;
        // Multi-touch is not a pull: a second finger or a palm would otherwise
        // overwrite the start point (ADR 08's rule, same reason).
        if (!event.isPrimary || pointerId.current !== null) return;
        if (event.pointerType === "mouse") return;
        // Only from the top: anywhere else the finger is scrolling.
        if ((scrollRef?.current?.scrollTop ?? 0) > 0) return;
        pointerId.current = event.pointerId;
        start.current = { x: event.clientX, y: event.clientY };
        engaged.current = false;
      }}
      onPointerMove={(event) => {
        if (event.pointerId !== pointerId.current) return;
        const dy = event.clientY - start.current.y;
        const dx = event.clientX - start.current.x;
        if (!engaged.current) {
          // Horizontal intent, or an upward drag, is somebody else's gesture.
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > PULL_ENGAGE) {
            release(event.currentTarget);
            return;
          }
          if (dy < -PULL_ENGAGE) {
            release(event.currentTarget);
            return;
          }
          if (dy < PULL_ENGAGE) return;
          engaged.current = true;
          setPhase("pulling");
          capture(event.currentTarget, event.pointerId);
        }
        setTravel(pull(dy));
      }}
      onPointerUp={(event) => {
        if (event.pointerId !== pointerId.current) return;
        const wasEngaged = engaged.current;
        release(event.currentTarget);
        if (!wasEngaged) return;
        swallow.current = true;
        if (travel < PULL_THRESHOLD) {
          setPhase("idle");
          setTravel(0);
          return;
        }
        startedAt.current = Date.now();
        sawFlight.current = false;
        setPhase("refreshing");
        setTravel(PULL_REST);
        onRefresh();
      }}
      onPointerCancel={(event) => {
        if (event.pointerId !== pointerId.current) return;
        release(event.currentTarget);
        setPhase("idle");
        setTravel(0);
      }}
      onClickCapture={(event) => {
        if (!swallow.current) return;
        swallow.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {enabled ? (
        <div
          className={classes.pullIndicator}
          data-testid="pull-indicator"
          data-tracking={phase === "pulling" || undefined}
          data-armed={armed || undefined}
          data-spinning={spinning || undefined}
          aria-hidden="true"
          style={
            {
              "--pull": `${travel}px`,
              "--pull-opacity": Math.min(1, travel / PULL_THRESHOLD),
            } as CSSProperties
          }
        >
          <IconRefresh size={20} />
        </div>
      ) : null}
      {children}
    </div>
  );
}
