import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { intlWrapper } from "@/test/intl";
import { act, render } from "@testing-library/react";
import { MINUTE } from "@/lib/time";
import { resetAlertAudio } from "@/lib/alertSounds";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import { ALERT_PROMPT_LIMIT, type TimerStatus } from "@/store/types";
import {
  ALERT_NOTIFICATION_TAG,
  requestAlertPermission,
  requestAlertPermissionFromSettings,
  resetAlertWorker,
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

/* -- Service worker double (ADR 33) ---------------------------------------- */

type ShownRecord = { title: string; options?: NotificationOptions };
let shown: ShownRecord[];

function installServiceWorker({ active = true, showThrows = false } = {}) {
  shown = [];
  const openNotifications: { close: ReturnType<typeof vi.fn> }[] = [];
  const registration = {
    active: active ? {} : null,
    showNotification: vi.fn(async (title: string, options?: NotificationOptions) => {
      if (showThrows) throw new Error("showNotification refused");
      shown.push({ title, options });
      openNotifications.push({ close: vi.fn() });
    }),
    getNotifications: vi.fn(async () => openNotifications),
  };
  const serviceWorker = {
    register: vi.fn(async () => registration),
    getRegistration: vi.fn(async () => registration),
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });
  return { registration, serviceWorker, openNotifications };
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
  const view = render(<Harness status={initial} />, { wrapper: intlWrapper });
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
  resetAlertAudio();
  resetAlertWorker();
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
  Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "serviceWorker");
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
    expect(notifications[0].title).toBe("GLU — time’s up");
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
    resetAlertAudio();
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

describe("service worker path (ADR 33)", () => {
  it("registers the worker once on mount, however many times the hook mounts", async () => {
    const { serviceWorker } = installServiceWorker();
    const first = renderAlerts("idle");
    await first.setStatus("idle");
    render(<Harness status="idle" />, { wrapper: intlWrapper });
    expect(serviceWorker.register).toHaveBeenCalledTimes(1);
    expect(serviceWorker.register).toHaveBeenCalledWith("/glu/sw.js");
  });

  it("prefers the worker for a hidden finish and never touches the page constructor", async () => {
    installServiceWorker();
    setVisibility("hidden");
    const view = renderAlerts("running");
    await view.setStatus("finished");

    expect(shown).toHaveLength(1);
    expect(shown[0].title).toBe("GLU — time’s up");
    expect(shown[0].options?.tag).toBe(ALERT_NOTIFICATION_TAG);
    expect(notifications).toHaveLength(0);
    expect(startedOscillators).toBe(2);
  });

  it("closes worker notifications when the page becomes visible again", async () => {
    const { registration, openNotifications } = installServiceWorker();
    setVisibility("hidden");
    const view = renderAlerts("running");
    await view.setStatus("finished");
    expect(shown).toHaveLength(1);

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(registration.getNotifications).toHaveBeenCalledWith({ tag: ALERT_NOTIFICATION_TAG });
    for (const notification of openNotifications) {
      expect(notification.close).toHaveBeenCalled();
    }
  });

  it("falls back to the page constructor while the worker is not yet active", async () => {
    installServiceWorker({ active: false });
    setVisibility("hidden");
    const view = renderAlerts("running");
    await view.setStatus("finished");

    expect(shown).toHaveLength(0);
    expect(notifications).toHaveLength(1);
  });

  it("falls back to the page constructor when showNotification rejects", async () => {
    installServiceWorker({ showThrows: true });
    setVisibility("hidden");
    const view = renderAlerts("running");
    await view.setStatus("finished");

    expect(shown).toHaveLength(0);
    expect(notifications).toHaveLength(1);
    expect(startedOscillators).toBe(2);
  });

  it("stays chime-only when both paths fail", async () => {
    installServiceWorker({ showThrows: true });
    notificationThrows = true;
    setVisibility("hidden");
    const view = renderAlerts("running");
    await expect(view.setStatus("finished")).resolves.not.toThrow();

    expect(shown).toHaveLength(0);
    expect(notifications).toHaveLength(0);
    expect(startedOscillators).toBe(2);
  });

  it("never asks the worker on a visible finish", async () => {
    const { registration } = installServiceWorker();
    const view = renderAlerts("running");
    await view.setStatus("finished");

    expect(registration.showNotification).not.toHaveBeenCalled();
    expect(notifications).toHaveLength(0);
  });
});

describe("which sound, and for how long (ADR 40)", () => {
  it("plays ADR 18's chime once with the defaults untouched", async () => {
    const view = renderAlerts("running");
    await view.setStatus("finished");
    // Two tones, one pattern — the shipped behaviour, byte-identical.
    expect(startedOscillators).toBe(2);
  });

  it("plays the selected sound", async () => {
    useGluStore.getState().setAlertSoundId("bell");
    const view = renderAlerts("running");
    await view.setStatus("finished");
    // Bell is four partials.
    expect(startedOscillators).toBe(4);
  });

  it("repeats the selected sound for the selected length", async () => {
    useGluStore.getState().setAlertSoundId("wood");
    useGluStore.getState().setAlertDurationSeconds(5);
    const view = renderAlerts("running");
    await view.setStatus("finished");
    // Wood is two hits and a 1 s period: five repeats inside five seconds.
    expect(startedOscillators).toBe(10);
  });

  it("reads both settings at fire time, not at mount", async () => {
    const view = renderAlerts("running");
    useGluStore.getState().setAlertSoundId("deep");
    await view.setStatus("finished");
    // Deep is three partials; a mount-time read would have played the chime's two.
    expect(startedOscillators).toBe(3);
  });

  it("still sounds when the blob carries values this release does not ship", async () => {
    useGluStore.setState({ alertSoundId: "gong", alertDurationSeconds: 999 });
    const view = renderAlerts("running");
    await view.setStatus("finished");
    expect(startedOscillators).toBe(2);
  });

  it("refuses to store an unknown sound or an off-ladder length", () => {
    useGluStore.getState().setAlertSoundId("gong");
    useGluStore.getState().setAlertDurationSeconds(999);
    expect(useGluStore.getState().alertSoundId).toBe("chime");
    expect(useGluStore.getState().alertDurationSeconds).toBe(0);
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

describe("the ask budget (ADR 41)", () => {
  /** Dismissal, faithfully: the prompt closes and the permission stays default. */
  const dismissedStart = () => {
    permission = "default";
    requestAlertPermission();
  };

  it("asks three times and then never again", () => {
    dismissedStart();
    dismissedStart();
    dismissedStart();
    expect(requestPermission).toHaveBeenCalledTimes(ALERT_PROMPT_LIMIT);

    // The fourth Start — the bug, before this ADR.
    dismissedStart();
    dismissedStart();
    expect(requestPermission).toHaveBeenCalledTimes(ALERT_PROMPT_LIMIT);
  });

  it("spends the budget at the moment of asking", () => {
    dismissedStart();
    expect(useGluStore.getState().alertPromptsUsed).toBe(1);
    dismissedStart();
    expect(useGluStore.getState().alertPromptsUsed).toBe(2);
  });

  it("never spends it on a profile that has already answered", () => {
    permission = "granted";
    requestAlertPermission();
    permission = "denied";
    requestAlertPermission();

    expect(requestPermission).not.toHaveBeenCalled();
    expect(useGluStore.getState().alertPromptsUsed).toBe(0);
  });

  it("reads a corrupt counter as nothing spent, not as a spent budget", () => {
    useGluStore.setState({ alertPromptsUsed: "lots" as unknown as number });
    dismissedStart();

    expect(requestPermission).toHaveBeenCalledTimes(1);
    // Resolved on the way in, so the increment lands on a number.
    expect(useGluStore.getState().alertPromptsUsed).toBe(1);
  });

  it("keeps the Settings door open after the budget is gone, and charges it nothing", async () => {
    useGluStore.setState({ alertPromptsUsed: ALERT_PROMPT_LIMIT });
    permission = "default";

    requestAlertPermission();
    expect(requestPermission).not.toHaveBeenCalled();

    await expect(requestAlertPermissionFromSettings()).resolves.toBe("default");
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(useGluStore.getState().alertPromptsUsed).toBe(ALERT_PROMPT_LIMIT);
  });

  it("sends no notification when GLU's own switch is off (ADR 41 amendment)", async () => {
    permission = "granted";
    setVisibility("hidden");
    useGluStore.getState().setNotifyOnSessionEnd(false);

    const view = renderAlerts("running");
    await view.setStatus("finished");

    expect(notifications).toHaveLength(0);
    // The sound is not what you can walk away from, so it is untouched.
    expect(startedOscillators).toBe(2);
  });

  it("reads the switch at fire time, not at mount", async () => {
    permission = "granted";
    setVisibility("hidden");
    const view = renderAlerts("running");
    useGluStore.getState().setNotifyOnSessionEnd(false);
    await view.setStatus("finished");

    expect(notifications).toHaveLength(0);
  });

  it("reports the answer back from the Settings door", async () => {
    permission = "granted";
    await expect(requestAlertPermissionFromSettings()).resolves.toBe("granted");
  });

  it("answers denied where Notification does not exist", async () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, "Notification");
    await expect(requestAlertPermissionFromSettings()).resolves.toBe("denied");
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
