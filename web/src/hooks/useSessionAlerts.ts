"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { playAlertSound } from "@/lib/alertSounds";
import { formatRemaining } from "@/lib/time";
import { useGluStore } from "@/store/gluStore";
import { ALERT_PROMPT_LIMIT, resolveAlertPromptsUsed, type TimerStatus } from "@/store/types";

/** One tag, so repeated finishes replace rather than stack (ADR 18). */
export const ALERT_NOTIFICATION_TAG = "glu-session-end";

/**
 * Static assets are not Next pages, so nothing applies the basePath for us —
 * the prefix is hand-written, same rule as `lib/api.ts`. The scope is the
 * script's directory, which deliberately excludes the page at `/glu`:
 * `showNotification` needs a registration handle, not a controlled page. It
 * also means `navigator.serviceWorker.ready` would never resolve here — always
 * `getRegistration(ALERT_WORKER_SCOPE)` (ADR 33).
 */
const ALERT_WORKER_URL = "/glu/sw.js";
const ALERT_WORKER_SCOPE = "/glu/";

let workerRequested = false;

/**
 * Registers the notification-only worker (ADR 33). Best-effort and silent:
 * no worker means the page-context Notification path, then chime-only —
 * exactly the pre-ADR-33 behaviour. The module-level guard, not the calling
 * effect, is what survives StrictMode's double-mount.
 */
export function registerAlertWorker() {
  if (workerRequested) return;
  workerRequested = true;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    navigator.serviceWorker.register(ALERT_WORKER_URL).catch(() => {
      // Expected on browsers that refuse (or a 429 mid-deploy): degrade quietly.
    });
  } catch {
    // Insecure contexts can expose the property and still throw on use.
  }
}

/** Test-only, like `resetAlertAudio`. */
export function resetAlertWorker() {
  workerRequested = false;
}

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
/** The two strings a finish puts in front of someone looking elsewhere. */
export interface AlertText {
  title: string;
  body: string;
}

export function useSessionAlerts(status: TimerStatus, totalMs: number) {
  const previous = useRef<TimerStatus | null>(null);
  const totalRef = useRef(totalMs);

  /*
   * The notification text is *composed here and passed down* (ADR 44), because
   * `notifyQuietly` and `notifyViaWorker` are module-scope async functions —
   * outside React, where `useTranslations` cannot be called.
   *
   * Held in a ref and rewritten on every render for the same reason the sound
   * is read through `getState()`: the alert effect depends only on `status`, so
   * a language changed mid-run has to be picked up at *fire* time rather than
   * captured when the run started.
   */
  const t = useTranslations("notifications");
  const textRef = useRef<(ms: number) => AlertText>(() => ({ title: "", body: "" }));

  // Declared first so it lands before the alert effect in the same commit.
  useEffect(() => {
    totalRef.current = totalMs;
  }, [totalMs]);

  // Same ordering rule, and no dependency array on purpose: the alert effect
  // depends only on `status`, so this has to be refreshed on every commit or a
  // language changed mid-run would fire the previous one's wording.
  useEffect(() => {
    textRef.current = (ms) => ({
      title: t("sessionEndTitle"),
      body: t("sessionEndBody", { duration: formatRemaining(ms) }),
    });
  });

  useEffect(() => {
    registerAlertWorker();
  }, []);

  useEffect(() => {
    const before = previous.current;
    previous.current = status;

    // First render after hydration: adopt the status without alerting. A
    // restored `finished` blob must be silent.
    if (before === null) return;
    if (!(before === "running" && status === "finished")) return;

    // ADR 40: which sound, and for how long, is read at fire time — through
    // `getState()` rather than a selector, because a settings change must not
    // re-render an alert coordinator that renders nothing.
    const { alertSoundId, alertDurationSeconds } = useGluStore.getState();
    playAlertSound(alertSoundId, alertDurationSeconds);

    if (typeof document === "undefined" || document.visibilityState === "visible") return;
    void notifyQuietly(totalRef.current, textRef.current(totalRef.current));
  }, [status]);
}

async function notifyQuietly(totalMs: number, text: AlertText) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  // GLU's own half of the Settings switch (ADR 41 amendment). Read at fire
  // time, like ADR 40's sound: a preference changed mid-run applies to this
  // run's finish. It gates the notification only — the sound is not an alert
  // you can walk away from, and silencing it is still the ADR 18 pencil.
  if (!useGluStore.getState().notifyOnSessionEnd) return;
  // SW-first, page-context second — the order is load-bearing: Android Chrome
  // throws on the page constructor before the working path would ever run
  // (ADR 33). Any miss below falls through to the constructor untouched.
  if (await notifyViaWorker(totalMs, text)) return;
  try {
    // Page-context construction throws `TypeError` on Android Chrome and is
    // unavailable in iPadOS Safari — both degrade to chime-only, which is what
    // those wake-locked foreground devices needed anyway (ADR 18).
    const notification = new Notification(text.title, {
      body: text.body,
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
 * The path Android Chrome requires (ADR 33). Returns whether the notification
 * was shown; every miss — API absent, registration pending or failed, worker
 * not yet active, `showNotification` rejecting — reports `false` so the caller
 * can try the page constructor.
 */
async function notifyViaWorker(totalMs: number, text: AlertText): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration(ALERT_WORKER_SCOPE);
    if (!registration?.active) return false;
    await registration.showNotification(text.title, {
      body: text.body,
      tag: ALERT_NOTIFICATION_TAG,
    });
    // A worker-shown notification has no page-side handle; close-on-return
    // goes through the registration instead. Click-to-focus lives in sw.js.
    const closeOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", closeOnReturn);
      registration
        .getNotifications({ tag: ALERT_NOTIFICATION_TAG })
        .then((open) => open.forEach((notification) => notification.close()))
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", closeOnReturn);
    return true;
  } catch {
    return false;
  }
}

/**
 * Called from the Start gesture, after `primeAudio()`. Deliberately not
 * awaited: the timer starts instantly, the prompt resolves whenever the user
 * gets to it.
 *
 * **Two guards, and the second one is ADR 41's whole point.** ADR 18 shipped
 * only the first and described it as "asked once" — true for the user who
 * answers, false for the user who *dismisses*: a dismissed prompt leaves
 * `permission` at `default`, so every later Start asked again, forever. The
 * budget is the fix, and it is spent at the moment of asking rather than when
 * the promise settles, because a dismissed prompt resolves at an unpredictable
 * time and — once the browser has quietly stopped rendering the dialog —
 * resolves without anything having been shown. What we can honestly meter is
 * our own attempts.
 *
 * Once the budget is gone, `SettingsContent`'s Alerts row is the only way in,
 * and it deliberately does not spend from here: see
 * `requestAlertPermissionFromSettings`.
 */
export function requestAlertPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;
  const { alertPromptsUsed, noteAlertPrompt } = useGluStore.getState();
  if (resolveAlertPromptsUsed(alertPromptsUsed) >= ALERT_PROMPT_LIMIT) return;
  try {
    // Counted before the call, and only on the path that actually calls: a
    // Start on an already-answered profile must not burn a budget that a later
    // permission reset would need.
    noteAlertPrompt();
    void Notification.requestPermission();
  } catch {
    // Older callback-style implementations; nothing to do.
  }
}

/**
 * The Settings door (ADR 41). Same call, two deliberate differences: it spends
 * nothing from the budget — a tap on a control labelled "Turn on
 * notifications" is a request, not a nag, and charging it would let someone
 * exhaust their own last door — and it reports the answer back so the row can
 * repaint without waiting for a remount.
 *
 * Only ever called from a real tap: browsers want a user gesture for this, and
 * a `denied` origin resolves instantly without showing anything (which is why
 * the row renders no button in that state).
 */
export async function requestAlertPermissionFromSettings(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    // Callback-style implementations reject the promise form; the mount read is
    // still correct, so report what we know rather than guessing at granted.
    return Notification.permission;
  }
}
