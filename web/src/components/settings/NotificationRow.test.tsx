import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { IntlWrapper } from "@/test/intl";
import { resetGluStore, useGluStore } from "@/store/gluStore";
import { ALERT_PROMPT_LIMIT } from "@/store/types";
import { NotificationRow } from "./NotificationRow";

/**
 * ADR 41 (amended) — the Settings switch. Half of what is proved here no
 * browser test can reach: `denied` and `unsupported` need a `Notification`
 * global bent into a shape Playwright cannot ask a real browser for.
 */

let permission: NotificationPermission;
let answer: NotificationPermission;
let requestPermission: ReturnType<typeof vi.fn<() => Promise<NotificationPermission>>>;

/** `answer` is what the user tells the prompt; the global follows it. */
function installNotification(initial: NotificationPermission) {
  permission = initial;
  answer = initial;
  requestPermission = vi.fn(async () => {
    permission = answer;
    return answer;
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: {
      get permission() {
        return permission;
      },
      requestPermission: () => requestPermission(),
    },
  });
}

const renderRow = () =>
  render(
    <IntlWrapper>
      <MantineProvider>
        <NotificationRow />
      </MantineProvider>
    </IntlWrapper>,
  );

const toggle = () => screen.getByTestId("setting-notify-on-end") as HTMLInputElement;
const message = () => screen.queryByTestId("notifications-message")?.textContent ?? null;

beforeEach(() => {
  resetGluStore();
  window.localStorage.clear();
  installNotification("default");
});

afterEach(() => {
  Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, "Notification");
});

describe("the Alerts section's notification switch (ADR 41)", () => {
  it("reads off until the browser has actually granted the permission", async () => {
    renderRow();
    await waitFor(() => expect(toggle()).not.toBeChecked());
    // GLU's own half is on by default; the switch still says off, because a
    // notification needs both halves and a switch must not claim otherwise.
    expect(useGluStore.getState().notifyOnSessionEnd).toBe(true);
  });

  it("asks on the way on, and lands on once granted", async () => {
    renderRow();
    answer = "granted";
    await userEvent.click(toggle());

    expect(requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toggle()).toBeChecked());
    expect(message()).toBeNull();
  });

  it("does not spend the automatic budget — it is the door, not a nag", async () => {
    useGluStore.setState({ alertPromptsUsed: ALERT_PROMPT_LIMIT });
    renderRow();
    answer = "granted";
    await userEvent.click(toggle());

    // Still asks with the budget gone, and still costs nothing.
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(useGluStore.getState().alertPromptsUsed).toBe(ALERT_PROMPT_LIMIT);
  });

  it("turns off for real — GLU's own mute, whatever the browser granted", async () => {
    installNotification("granted");
    renderRow();
    await waitFor(() => expect(toggle()).toBeChecked());

    await userEvent.click(toggle());
    expect(useGluStore.getState().notifyOnSessionEnd).toBe(false);
    await waitFor(() => expect(toggle()).not.toBeChecked());

    // And back on without asking: the permission is already granted.
    await userEvent.click(toggle());
    expect(requestPermission).not.toHaveBeenCalled();
    await waitFor(() => expect(toggle()).toBeChecked());
  });

  it("explains what to do when the browser is blocking it", async () => {
    installNotification("denied");
    renderRow();
    await userEvent.click(toggle());

    // No dead-end "blocked": the sentence has to say *where* the setting
    // lives, in every language (ADR 41's amendment, kept by ADR 44).
    await waitFor(() => expect(message()).toMatch(/site settings/i));
    expect(message()).toMatch(/set Notifications to Allow/i);
    expect(toggle()).not.toBeChecked();
    // Asking a denied origin would resolve instantly and show nothing.
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.getByTestId("notifications-message")).toHaveAttribute("role", "alert");
  });

  it("says the prompt went unanswered when it is dismissed", async () => {
    renderRow();
    answer = "default"; // dismissal: the permission never moves
    await userEvent.click(toggle());

    await waitFor(() => expect(message()).toMatch(/closed without an answer/i));
    expect(toggle()).not.toBeChecked();
  });

  it("keeps the error until the switch is used again", async () => {
    installNotification("denied");
    renderRow();
    await userEvent.click(toggle());
    await waitFor(() => expect(message()).toMatch(/site settings/i));

    // A grant arriving from the browser's own settings clears it on the next tap.
    permission = "granted";
    await userEvent.click(toggle());
    await waitFor(() => expect(message()).toBeNull());
  });

  it("disables itself where the browser has no notifications, and says so", async () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, "Notification");
    renderRow();

    await waitFor(() => expect(toggle()).toBeDisabled());
    expect(message()).toMatch(/does not offer notifications/i);
    // Not an error — nothing the user did, and nothing they can do.
    expect(screen.getByTestId("notifications-message")).not.toHaveAttribute("role", "alert");
  });

  it("names itself with its visible label alone", async () => {
    renderRow();
    expect(
      await screen.findByRole("switch", { name: "Notify me when a session ends" }),
    ).toBeTruthy();
  });
});
