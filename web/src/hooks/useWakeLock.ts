"use client";

import { useEffect, useRef } from "react";
import { useDocumentVisibility } from "@mantine/hooks";
import type { TimerStatus } from "@/store/types";

/** ADR 17: `paused` and `finished` keep the screen alive for this long. */
export const WAKE_LOCK_GRACE_MS = 5 * 60 * 1000;

type MinimalSentinel = {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock: { request: (type: "screen") => Promise<MinimalSentinel> };
};

/**
 * Holds a screen wake lock while a run is on the clock.
 *
 * Policy (ADR 17): held while `running`; held through `paused` and `finished`
 * for a five-minute grace — those are "the user is probably still here, the
 * glanceable state matters" moments — and released immediately on `idle`.
 *
 * The grace is a **deadline timestamp, not a bare timeout**: the browser
 * auto-releases the lock whenever the page is hidden, so on the way back to
 * visible the hook re-evaluates *policy* and re-acquires only if the policy
 * still wants the lock. A timeout-based grace dies with the hidden tab.
 *
 * This hook is a **read-only consumer of timer status**: it never transitions
 * the state machine, never touches `runId` or `ranMs` (ADR 14's mandatory
 * question, answered on the record). Every failure path is silent — ADR 02's
 * timestamp engine already survives the screen sleeping, so correctness never
 * depended on the lock.
 */
export function useWakeLock(status: TimerStatus) {
  const visibility = useDocumentVisibility();
  const sentinel = useRef<MinimalSentinel | null>(null);
  /** Epoch ms the grace expires; `null` when no grace is running. */
  const deadline = useRef<number | null>(null);
  /** Distinguishes our own release from the browser's hidden-release. */
  const releasingOurselves = useRef(false);
  const inFlight = useRef(false);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

    const wantsLock = () =>
      status === "running" || (deadline.current !== null && Date.now() < deadline.current);

    const release = () => {
      const current = sentinel.current;
      sentinel.current = null;
      if (!current) return;
      releasingOurselves.current = true;
      void Promise.resolve(current.release())
        .catch(() => {})
        .finally(() => {
          releasingOurselves.current = false;
        });
    };

    const acquire = () => {
      if (!supported || sentinel.current || inFlight.current) return;
      inFlight.current = true;
      void (navigator as WakeLockNavigator).wakeLock
        .request("screen")
        .then((lock) => {
          if (!wantsLock()) {
            void lock.release().catch(() => {});
            return;
          }
          sentinel.current = lock;
          lock.addEventListener("release", () => {
            // The browser dropped it (page hidden). Forget the sentinel only —
            // the policy state stays, and the visible pass re-acquires from it.
            if (releasingOurselves.current) return;
            sentinel.current = null;
          });
        })
        .catch(() => {
          // Battery saver, platform policy, insecure context — degrade silently.
        })
        .finally(() => {
          inFlight.current = false;
        });
    };

    // 1. Update the policy state for this status.
    if (status === "running" || status === "idle") {
      deadline.current = null;
    } else if (deadline.current === null) {
      deadline.current = Date.now() + WAKE_LOCK_GRACE_MS;
    }

    // 2. Apply it. Hidden pages get neither an acquire (pointless) nor a
    //    release (the browser already did it, and the policy still holds).
    if (!wantsLock()) release();
    else if (visibility === "visible") acquire();

    // 3. Arm the grace expiry, re-checking the clock when it fires.
    if (graceTimer.current !== null) {
      clearTimeout(graceTimer.current);
      graceTimer.current = null;
    }
    if (deadline.current !== null) {
      graceTimer.current = setTimeout(
        () => {
          graceTimer.current = null;
          if (!wantsLock()) release();
        },
        Math.max(0, deadline.current - Date.now()),
      );
    }
  }, [status, visibility]);

  // Release on unmount so a navigation cannot leave the screen pinned.
  useEffect(
    () => () => {
      if (graceTimer.current !== null) clearTimeout(graceTimer.current);
      const current = sentinel.current;
      sentinel.current = null;
      if (current) void current.release().catch(() => {});
    },
    [],
  );
}
