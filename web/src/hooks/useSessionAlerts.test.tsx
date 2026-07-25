import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MINUTE } from "@/lib/time";
import { resetChime } from "@/lib/chime";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import type { TimerStatus } from "@/store/types";
import {
  ALERT_NOTIFICATION_TAG,
  requestAlertPermission,
  useSessionAlerts,
} from "./useSessionAlerts";

/* -- WebAudio double ------------------------------------------------------- */

let startedOscillators: number;
let contextsCreated: number;
let contextState: AudioContextState;
let resumeImpl: () => Promise<void>;

class FakeAudioContext {
  state: AudioContextState = contextState;
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  constructor() {
    contextsCreated += 1;
  }
  resume = vi.fn(() => resumeImpl());
  createOscillator() {
    const node = {
      type: "sine",
      frequency: { value: 0 },
      connect: (next: unknown) => next,
      start: () => {
        startedOscillators += 1;
      },
      stop: () => {},
    };
    return node as unknown as OscillatorNode;
  }
  createGain() {
    const node = {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: (next: unknown) => next,
    };
    return node as unknown as GainNode;
  }
}

/* -- Notification double --------------------------------------------------- */

type NotificationRecord = { title: string; options?: NotificationOptions };
let notifications: NotificationRecord[];
let notificationThrows: boolean;
let permission: NotificationPermission;
let requestPermission: ReturnType<typeof vi.fn<() => Promise<NotificationPermission>>>;

function installNotification() {
  notifications = [];
  notificationThrows = false;
  requestPermission = vi.fn<() => Promise<NotificationPermission>>(async () => permission);

  class FakeNotification {
    onclick: (() => void) | null = null;
    close = vi.fn();
    constructor(title: string, options?: NotificationOptions) {
      if (notificationThrows) throw new TypeError("Illegal constructor");
      notifications.push({ title, options });
    }
    static get permission() {
      return permission;
    }
    static requestPermission = () => requestPermission();
  }

  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    writable: true,
    value: FakeNotification,
  });
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

/* -- Harness --------------------------------------------------------------- */

function Harness({ status }: { status: TimerStatus }) {
  useSessionAlerts(status, 20 * MINUTE);
  return null;
}

function renderAlerts(initial: TimerStatus) {
  const view = render(<Harness status={initial} />);
  return {
    async setStatus(status: TimerStatus) {
      await act(async () => {
        view.rerender(<Harness status={status} />);
      });
    },
  };
}

beforeEach(() => {
  resetGluStore();
  resetChime();
  startedOscillators = 0;
  contextsCreated = 0;
  contextState = "running";
  resumeImpl = async () => {};
  permission = "granted";
  installNotification();
  setVisibility("visible");
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    writable: true,
    value: FakeAudioContext,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, "Notification");
  Reflect.deleteProperty(window as unknown as Record<string, unknown>, "AudioContext");
});

describe("session-end alerts (ADR 18)", () => {
  it("chimes once when a live tick crosses zero, with no notification while visible", async () => {
    const view = renderAlerts("running");
    await view.setStatus("finished");

    expect(startedOscillators).toBe(2);
    expect(notifications).toHaveLength(0);
  });

  it("chimes and notifies exactly once when the page is hidden", async () => {
    setVisibility("hidden");
    const view = renderAlerts("running");
    await view.setStatus("finished");

    expect(startedOscillators).toBe(2);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("GLU — time's up");
    expect(notifications[0].options?.tag).toBe(ALERT_NOTIFICATION_TAG);
  });

  it("stays silent for Stop, restart and every non-finish transition", async () => {
    const view = renderAlerts("running");
    for (const status of ["idle", "running", "paused", "running", "idle"] as TimerStatus[]) {
      await view.setStatus(status);
    }
    expect(startedOscillators).toBe(0);
    expect(notifications).toHaveLength(0);
  });

  it("stays silent on the restored-expired path", async () => {
    setVisibility("hidden");
    // The restore branch mounts straight into `finished` — it never passes
    // through `running`, which is exactly why it cannot alert.
    const view = renderAlerts("finished");
    await view.setStatus("finished");

    expect(startedOscillators).toBe(0);
    expect(notifications).toHaveLength(0);
  });

  it("degrades to chime-only when the Notification constructor throws", async () => {
    setVisibility("hidden");
    notificationThrows = true;
    const view = renderAlerts("running");
    await expect(view.setStatus("finished")).resolves.not.toThrow();
    expect(startedOscillators).toBe(2);
    expect(notifications).toHaveLength(0);
  });

  it("never notifies without permission", async () => {
    setVisibility("hidden");
    permission = "denied";
    const view = renderAlerts("running");
    await view.setStatus("finished");
    expect(startedOscillators).toBe(2);
    expect(notifications).toHaveLength(0);
  });

  it("survives a context whose resume rejects", async () => {
    contextState = "suspended";
    resumeImpl = async () => {
      throw new Error("no audio");
    };
    const view = renderAlerts("running");
    await expect(view.setStatus("finished")).resolves.not.toThrow();
  });

  it("works with no WebAudio at all", async () => {
    Reflect.deleteProperty(window as unknown as Record<string, unknown>, "AudioContext");
    resetChime();
    const view = renderAlerts("running");
    await expect(view.setStatus("finished")).resolves.not.toThrow();
    expect(startedOscillators).toBe(0);
  });

  it("never calls a timer transition (the ADR 14 lifecycle question)", async () => {
    const spies = (["start", "pause", "stop", "restart", "finish"] as const).map((action) =>
      vi.spyOn(useGluStore.getState(), action),
    );
    const view = renderAlerts("running");
    await view.setStatus("finished");
    await view.setStatus("running");
    await view.setStatus("finished");
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe("permission flow (ADR 18)", () => {
  it("asks once while the permission is default, and never again", () => {
    permission = "default";
    requestAlertPermission();
    expect(requestPermission).toHaveBeenCalledTimes(1);

    permission = "granted";
    requestAlertPermission();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("never asks once denied", () => {
    permission = "denied";
    requestAlertPermission();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("does nothing where Notification does not exist", () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, "Notification");
    expect(() => requestAlertPermission()).not.toThrow();
  });
});

describe("audio priming (ADR 18)", () => {
  it("creates exactly one AudioContext however many chimes fire", async () => {
    const view = renderAlerts("running");
    await view.setStatus("finished");
    await view.setStatus("running");
    await view.setStatus("finished");
    expect(contextsCreated).toBe(1);
    expect(startedOscillators).toBe(4);
  });
});
