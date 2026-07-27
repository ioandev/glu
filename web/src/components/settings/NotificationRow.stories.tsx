import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { withStoreState } from "@/stories/storeDecorator";
import { useGluStore } from "@/store/gluStore";
import { NotificationRow } from "./NotificationRow";

/**
 * ADR 41's row on its own, rather than inside `SettingsContent`: the four states
 * need a stubbed `Notification` global, and the row is the only thing in the
 * modal that cares about one. Rendering it alone also keeps these states out of
 * reach of whatever else the settings list grows.
 */
const meta = {
  title: "Settings/NotificationRow",
  component: NotificationRow,
  decorators: [withStoreState()],
} satisfies Meta<typeof NotificationRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The stub is installed during the first render — before the row's subscription
 * reads the global — and torn down on unmount, so no story leaks a permission
 * into the next one. `null` deletes the API entirely: iPadOS Safari in a tab.
 */
const withNotificationPermission = (value: NotificationPermission | null) => {
  return function NotificationDecorator(Story: React.ComponentType) {
    const [original] = useState(() => {
      const previous = Reflect.getOwnPropertyDescriptor(window, "Notification");
      if (value === null) {
        Reflect.deleteProperty(window as unknown as Record<string, unknown>, "Notification");
      } else {
        Object.defineProperty(window, "Notification", {
          configurable: true,
          value: { permission: value, requestPermission: async () => value },
        });
      }
      return previous;
    });

    useEffect(
      () => () => {
        // Stories share one browser origin, so a stub left behind would be the
        // next story's browser (the `storeDecorator` lesson, applied to a global).
        if (original) Object.defineProperty(window, "Notification", original);
        else Reflect.deleteProperty(window as unknown as Record<string, unknown>, "Notification");
      },
      [original],
    );

    return <Story />;
  };
};

const control = (canvas: ReturnType<typeof within>) =>
  canvas.findByRole("switch", { name: "Notify me when a session ends" });

/** Before anyone has answered: off, and switching it on is what asks. */
export const Askable: Story = {
  decorators: [withNotificationPermission("default")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await control(canvas);
    // Off, because a notification needs the browser's permission too — a
    // switch that read "on" here would be claiming something untrue.
    await expect(toggle).not.toBeChecked();
    await expect(canvas.queryByTestId("notifications-message")).toBeNull();
    await expect(
      toggle.closest("div")!.getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);
  },
};

/** Granted: on, and — the half that was missing — genuinely turn-off-able. */
export const On: Story = {
  decorators: [withNotificationPermission("granted")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await control(canvas);
    await expect(toggle).toBeChecked();

    await userEvent.click(toggle);
    await expect(useGluStore.getState().notifyOnSessionEnd).toBe(false);
    await expect(toggle).not.toBeChecked();
  },
};

/**
 * Denied: the switch will not move, and the row says where the setting that
 * would move it lives. "Blocked" on its own was the dead end the owner hit.
 */
export const Blocked: Story = {
  decorators: [withNotificationPermission("denied")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await control(canvas);
    await userEvent.click(toggle);

    const message = await canvas.findByTestId("notifications-message");
    await expect(message).toHaveTextContent(/site settings/i);
    await expect(message).toHaveTextContent(/set Notifications to Allow/i);
    await expect(toggle).not.toBeChecked();
  },
};

/** No Notification API at all: the switch is disabled and says why. */
export const Unsupported: Story = {
  decorators: [withNotificationPermission(null)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await control(canvas)).toBeDisabled();
    await expect(await canvas.findByTestId("notifications-message")).toHaveTextContent(
      /does not offer notifications/i,
    );
  },
};
