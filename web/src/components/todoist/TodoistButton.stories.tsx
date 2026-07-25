import React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useTodoistAuth, type AuthStatus } from "@/store/todoistAuth";
import { TodoistButton } from "./TodoistButton";

/** Drives the shared auth store directly — no server, no fetch (ADR 19). */
export function withAuth(status: AuthStatus, name: string | null = null) {
  return function AuthDecorator(Story: React.ComponentType) {
    React.useState(() => {
      useTodoistAuth.setState({ status, name, id: name ? "42" : null });
      return true;
    });
    return <Story />;
  };
}

const meta = {
  title: "Todoist/TodoistButton",
  component: TodoistButton,
} satisfies Meta<typeof TodoistButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {
  decorators: [withAuth("out")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = await canvas.findByRole("link", { name: /Log in with Todoist/ });
    await expect(link).toHaveAttribute("href", "/glu/api/auth/todoist/login");
    await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

/** `unknown`: the slot holds its height, and no logged-in chrome flashes. */
export const Loading: Story = {
  decorators: [withAuth("unknown")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slot = canvas.getByTestId("todoist-loading");
    await expect(slot.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await expect(canvas.queryByRole("link")).toBeNull();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const LoggedIn: Story = {
  decorators: [withAuth("in", "Ioan")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chip = await canvas.findByRole("button", { name: "Todoist account: Ioan" });
    await expect(chip).toBeVisible();
    await expect(chip.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);

    await userEvent.click(chip);
    await expect(await canvas.findByRole("button", { name: "Log out" })).toBeVisible();
  },
};

export const LogOutClearsTheChip: Story = {
  decorators: [withAuth("in", "Ioan")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Todoist account: Ioan" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Log out" }));
    await expect(await canvas.findByRole("link", { name: /Log in with Todoist/ })).toBeVisible();
    await expect(useTodoistAuth.getState().status).toBe("out");
  },
};
