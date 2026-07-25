import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { withAuth } from "@/components/todoist/TodoistButton.stories";
import { TodoistButton } from "@/components/todoist/TodoistButton";
import { useTodoistAuth } from "@/store/todoistAuth";
import { SettingsContent } from "./SettingsContent";

const meta = {
  title: "Settings/SettingsContent",
  component: SettingsContent,
} satisfies Meta<typeof SettingsContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  decorators: [withAuth("in", "Ioan")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("settings-account-name")).toHaveTextContent(
      "Signed in as Ioan",
    );
    const logout = canvas.getByRole("button", { name: "Log out" });
    await expect(logout.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

export const LoggedOut: Story = {
  decorators: [withAuth("out")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The same branded component the top-right area renders.
    await expect(canvas.getByRole("link", { name: /Log in with Todoist/ })).toHaveAttribute(
      "href",
      "/glu/api/auth/todoist/login",
    );
  },
};

/** No logged-in-only chrome may appear while the status fetch is in flight. */
export const Unknown: Story = {
  decorators: [withAuth("unknown")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("settings-todoist-unknown")).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Log out" })).toBeNull();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

/**
 * The load-bearing sentence from the brief: logging out in Settings flips every
 * Todoist surface, in the same render pass.
 */
export const LogOutSyncsEverySurface: Story = {
  decorators: [withAuth("in", "Ioan")],
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div data-testid="top-right">
        <TodoistButton />
      </div>
      <SettingsContent />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const topRight = within(canvas.getByTestId("top-right"));
    await expect(topRight.getByRole("button", { name: "Todoist account: Ioan" })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Log out" }));

    // `findBy*` waits out the logout POST; the store assertion then reads a
    // settled state rather than racing it.
    await expect(
      await topRight.findByRole("link", { name: /Log in with Todoist/ }),
    ).toBeVisible();
    await expect(useTodoistAuth.getState().status).toBe("out");
    // The section itself now offers the branded login, still open.
    await expect(canvas.getAllByRole("link", { name: /Log in with Todoist/ })).toHaveLength(2);
  },
};
