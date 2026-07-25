"use client";

import { useEffect, useRef } from "react";
import { chime } from "@/lib/chime";
import { formatRemaining } from "@/lib/time";
import type { TimerStatus } from "@/store/types";

/** One tag, so repeated finishes replace rather than stack (ADR 18). */
export const ALERT_NOTIFICATION_TAG = "glu-session-end";

/**
 * Fires the session-end alert (ADR 18).
 *
 * Only a **live** tick crossing zero alerts. Manual Stop / `s` / `Ctrl+C` / `n`
 * do not (the user is touching the app), and neither does the restored-expired
 * path — a chime hours late, at the exact moment the user is already looking at
 * the screen, is noise wearing a feature's clothes. That path is structurally
 * unable to reach here because it never passes through `running`, which is
 * exactly why the previous status is the guard.
 *
 * Like ADR 17's hook this is a **read-only consumer**: no transitions, no
 * auto-restart, no auto-anything.
 */
export function useSessionAlerts(status: TimerStatus, totalMs: number) {
  const previous = useRef<TimerStatus | null>(null);
  const totalRef = useRef(totalMs);

  // Declared first so it lands before the alert effect in the same commit.
  useEffect(() => {
    totalRef.current = totalMs;
  }, [totalMs]);

  useEffect(() => {
    const before = previous.current;
    previous.current = status;

    // First render after hydration: adopt the status without alerting. A
    // restored `finished` blob must be silent.
    if (before === null) return;
    if (!(before === "running" && status === "finished")) return;

    chime();

    if (typeof document === "undefined" || document.visibilityState === "visible") return;
    notifyQuietly(totalRef.current);
  }, [status]);
}

function notifyQuietly(totalMs: number) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    // Page-context construction throws `TypeError` on Android Chrome and is
    // unavailable in iPadOS Safari — both degrade to chime-only, which is what
    // those wake-locked foreground devices needed anyway (ADR 18).
    const notification = new Notification("GLU — time's up", {
      body: `${formatRemaining(totalMs)} session finished.`,
      tag: ALERT_NOTIFICATION_TAG,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    const closeOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      notification.close();
      document.removeEventListener("visibilitychange", closeOnReturn);
    };
    document.addEventListener("visibilitychange", closeOnReturn);
  } catch {
    // Chime-only. No console noise: this is an expected platform outcome.
  }
}

/**
 * Called from the Start gesture, after `primeAudio()`. Asked once, lazily —
 * denied means never again (the browser remembers; we don't nag). Deliberately
 * not awaited: the timer starts instantly, the prompt resolves whenever the
 * user gets to it.
 */
export function requestAlertPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;
  try {
    void Notification.requestPermission();
  } catch {
    // Older callback-style implementations; nothing to do.
  }
}
