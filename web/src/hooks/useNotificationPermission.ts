"use client";

import { useSyncExternalStore } from "react";

/**
 * The four states GLU's Settings row can be in (ADR 41) — the browser's three,
 * plus the one the API's absence puts you in. `pending` is the SSR/hydration
 * answer only: `Notification` does not exist on the server, so the first paint
 * cannot claim anything.
 */
export type NotificationSupport = "pending" | "unsupported" | NotificationPermission;

/**
 * `Notification.permission` is a global with no React binding, so it is read as
 * an external store rather than copied into state. That is not a style
 * preference: reading it in an effect means a setState in an effect body on
 * every mount, and it also means the hydration render has to guess.
 * `useSyncExternalStore` has a server snapshot for exactly this.
 *
 * The snapshot is a string, so it is referentially stable by construction —
 * this hook must never return an object, or React will re-render forever.
 */
const getSnapshot = (): NotificationSupport =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

/**
 * The same read, for a handler that must not trust the rendered snapshot: on an
 * engine with no `permissions.query`, a permission changed in the browser's own
 * settings while Settings is open is invisible until the modal remounts, and a
 * tap is exactly the moment that stale value would produce a wrong answer.
 */
export const readNotificationPermission = getSnapshot;

const getServerSnapshot = (): NotificationSupport => "pending";

/** Subscribers, so a row that asks for permission can repaint on the answer. */
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Best effort on top of the mount read, never load-bearing: this permission
  // name is unknown to some engines, and `query` *rejects* there rather than
  // returning undefined. The realistic path — change it in the browser's site
  // settings, reopen Settings — is covered by the remount alone.
  let status: PermissionStatus | null = null;
  let disposed = false;
  try {
    navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((result) => {
        // The flag exists for one race: unsubscribe *before* this resolves.
        // Teardown would run with `status` still null, and this late resolve
        // would then attach a listener nobody ever removes — the exact leak
        // the teardown is for, arriving through the back door.
        if (disposed) return;
        status = result;
        result.addEventListener("change", emit);
      })
      .catch(() => {});
  } catch {
    // `navigator.permissions` present but throwing on use — same answer.
  }

  return () => {
    disposed = true;
    listeners.delete(listener);
    // Without this the modal leaks one listener per open.
    status?.removeEventListener("change", emit);
  };
}

/**
 * Returns the current permission and a way to re-read it — the third path,
 * used after the row's own `requestPermission()` resolves, which is the one
 * change the component itself causes.
 */
export function useNotificationPermission(): [NotificationSupport, () => void] {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // `emit` is module-level and therefore already stable — no memo needed.
  return [permission, emit];
}
