import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useNotificationPermission } from "./useNotificationPermission";

/**
 * The subscription half of the hook (ADR 41). The row's own tests run without
 * `navigator.permissions` — jsdom's honest shape, and the floor the hook must
 * be correct against. These are the other half: an engine where `query`
 * exists, resolves, and fires `change` events.
 */

let permission: NotificationPermission;

function installNotification() {
  class FakeNotification {
    static get permission() {
      return permission;
    }
    static requestPermission = async () => permission;
  }
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    writable: true,
    value: FakeNotification,
  });
}

class FakeStatus {
  listeners = new Set<() => void>();
  addEventListener(_type: string, fn: () => void) {
    this.listeners.add(fn);
  }
  removeEventListener(_type: string, fn: () => void) {
    this.listeners.delete(fn);
  }
  fire() {
    this.listeners.forEach((fn) => fn());
  }
}

let pendingQueries: ((status: FakeStatus) => void)[];

/** `query` resolution is manual, because the unmount race is about *when*. */
function installPermissionsQuery() {
  pendingQueries = [];
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: () =>
        new Promise<FakeStatus>((resolve) => {
          pendingQueries.push(resolve);
        }),
    },
  });
}

async function resolveQuery(): Promise<FakeStatus> {
  const status = new FakeStatus();
  const resolve = pendingQueries.shift();
  if (!resolve) throw new Error("no query in flight");
  await act(async () => {
    resolve(status);
  });
  return status;
}

function Probe() {
  const [state] = useNotificationPermission();
  return <span data-testid="probe-permission">{state}</span>;
}

const shown = () => screen.getByTestId("probe-permission").textContent;

beforeEach(() => {
  permission = "default";
  installNotification();
  installPermissionsQuery();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, "Notification");
  Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "permissions");
});

describe("useNotificationPermission's change subscription (ADR 41)", () => {
  it("repaints when the browser flips the permission behind the page's back", async () => {
    render(<Probe />);
    expect(shown()).toBe("default");

    const status = await resolveQuery();
    permission = "granted";
    await act(async () => {
      status.fire();
    });
    expect(shown()).toBe("granted");

    permission = "denied";
    await act(async () => {
      status.fire();
    });
    expect(shown()).toBe("denied");
  });

  it("removes its listener on unmount", async () => {
    const view = render(<Probe />);
    const status = await resolveQuery();
    expect(status.listeners.size).toBe(1);

    view.unmount();
    expect(status.listeners.size).toBe(0);
  });

  it("attaches nothing when the query resolves after unmount — the race", async () => {
    const view = render(<Probe />);
    view.unmount();

    const status = await resolveQuery();
    expect(status.listeners.size).toBe(0);
  });

  it("stands on the mount read when query rejects", async () => {
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: () => Promise.reject(new Error("unknown name")) },
    });
    permission = "granted";
    render(<Probe />);
    await act(async () => {});
    expect(shown()).toBe("granted");
  });

  it("shares one browser change across every mounted consumer", async () => {
    render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    const first = await resolveQuery();
    // Each subscriber runs its own query; either status may fire.
    await resolveQuery();

    permission = "granted";
    await act(async () => {
      first.fire();
    });
    for (const probe of screen.getAllByTestId("probe-permission")) {
      expect(probe.textContent).toBe("granted");
    }
  });
});
