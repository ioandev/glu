import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { withAuth } from "@/components/todoist/TodoistButton.stories";
import { TodoistButton } from "@/components/todoist/TodoistButton";
import { withStoreState } from "@/stories/storeDecorator";
import { useGluStore } from "@/store/gluStore";
import { useTodoistAuth } from "@/store/todoistAuth";
import { SettingsContent } from "./SettingsContent";

const meta = {
  title: "Settings/SettingsContent",
  component: SettingsContent,
  decorators: [withStoreState()],
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
 * The Screen section (ADR 17 amendment): the wider toggle first, the run policy
 * — which ships on — second.
 */
export const ScreenSection: Story = {
  decorators: [withAuth("out")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const always = canvas.getByRole("switch", { name: "Stay awake on the website" });
    const whileRunning = canvas.getByRole("switch", {
      name: "Stay awake when the timer is running",
    });

    // Defaults are the shipped ADR 17 policy.
    await expect(always).not.toBeChecked();
    await expect(whileRunning).toBeChecked();

    await userEvent.click(always);
    await expect(useGluStore.getState().stayAwakeAlways).toBe(true);
    await userEvent.click(whileRunning);
    await expect(useGluStore.getState().stayAwakeWhileRunning).toBe(false);

    // ≥44 px rows, like every other control in the modal.
    for (const control of [always, whileRunning]) {
      const row = control.closest("div");
      await expect(row!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
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

/**
 * The Alerts section (ADR 40): nine sounds and a length. The one section you
 * are meant to *hear* — every tap previews, so the play spies below stand in
 * for ears.
 */
export const AlertsSection: Story = {
  decorators: [withAuth("out")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const grid = canvas.getByRole("radiogroup", { name: "Sound" });
    const ladder = canvas.getByRole("radiogroup", { name: "How long it plays" });

    // Nine sounds, and the defaults are ADR 18's shipped behaviour.
    await expect(within(grid).getAllByRole("radio")).toHaveLength(9);
    await expect(canvas.getByRole("radio", { name: "Chime" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Once" })).toBeChecked();

    // Choosing writes the blob…
    await userEvent.click(canvas.getByRole("radio", { name: "Bell" }));
    await expect(useGluStore.getState().alertSoundId).toBe("bell");
    // …and marks the button as playing, because choosing is also hearing.
    await expect(canvas.getByTestId("alert-sound-bell")).toHaveAttribute("data-playing", "true");

    // Tapping the playing sound stops it rather than replaying it.
    await userEvent.click(canvas.getByRole("radio", { name: "Bell" }));
    await expect(canvas.getByTestId("alert-sound-bell")).toHaveAttribute("data-playing", "false");
    await expect(useGluStore.getState().alertSoundId).toBe("bell");

    await userEvent.click(canvas.getByRole("radio", { name: "10 s" }));
    await expect(useGluStore.getState().alertDurationSeconds).toBe(10);

    // Every control in the modal is a touch target (ADR 19's 44 px floor).
    for (const button of within(grid).getAllByRole("radio")) {
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    for (const radio of within(ladder).getAllByRole("radio")) {
      const target = (radio as HTMLInputElement).labels![0];
      await expect(target.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

/**
 * The Time comments section (ADR 27): one switch, and the two sample sentences
 * that make it self-explanatory. The previews are composed from the live
 * environment toggles, so this story seeds them.
 */
export const TimeCommentsSection: Story = {
  decorators: [
    withAuth("out"),
    withStoreState({
      environment: {
        music: true,
        podcast: false,
        tv: false,
        silence: false,
        noisy: false,
        headphones: true,
      },
      selectedDuration: 25 * 60_000,
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("switch", { name: "Say how you worked" });
    await expect(toggle).toBeChecked();

    // The preview is the artifact, not a description of it.
    const on = canvas.getByTestId("comment-preview-on");
    const off = canvas.getByTestId("comment-preview-off");
    await expect(on).toHaveTextContent(
      "[25m] You spent 25 minutes on this — with music, on headphones",
    );
    await expect(off).toHaveTextContent("[25m] You spent 25 minutes on this");
    await expect(on).toHaveAttribute("data-active", "true");
    await expect(off).toHaveAttribute("data-active", "false");
    // Real toggles, so the sentence is claimed as the next comment, not offered
    // as an example.
    await expect(on).toHaveAttribute("data-sampled", "false");
    await expect(on).toHaveTextContent("On · Now");
    await expect(canvas.queryByTestId("comment-preview-note")).toBeNull();

    // Flipping the switch moves the marker, and writes the blob field.
    await userEvent.click(toggle);
    await expect(useGluStore.getState().commentEnvironment).toBe(false);
    await expect(off).toHaveAttribute("data-active", "true");

    // ≥44 px, like every other control in the modal.
    await expect(
      toggle.closest("div")!.getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);
  },
};

/**
 * The minimum-run ladder (ADR 28): the row that decides whether a comment
 * happens at all, above the switch that decides what it says.
 */
export const CommentThresholdLadder: Story = {
  decorators: [withAuth("out")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ladder = canvas.getByRole("radiogroup", { name: "Minimum time to log" });

    // The default is ADR 14's minute — the row exists to move off it.
    await expect(canvas.getByRole("radio", { name: "1 min" })).toBeChecked();

    await userEvent.click(canvas.getByRole("radio", { name: "5 min" }));
    await expect(useGluStore.getState().commentThresholdMinutes).toBe(5);
    await expect(canvas.getByRole("radio", { name: "5 min" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "1 min" })).not.toBeChecked();

    // Every rung is its own touch target, like every other control in the modal.
    // The measured element is the `<label>` each radio points at — the tappable
    // surface, not the text node inside it.
    for (const radio of within(ladder).getAllByRole("radio")) {
      const target = (radio as HTMLInputElement).labels![0];
      await expect(target.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

/**
 * Nothing toggled: the preview borrows a sample rather than repeating the plain
 * sentence, and labels it `Example` (ADR 27 amendment). A switch that
 * demonstrates nothing until you have already used the feature is no preview.
 */
export const TimeCommentsWithNoEnvironment: Story = {
  decorators: [withAuth("out"), withStoreState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const on = canvas.getByTestId("comment-preview-on");

    await expect(canvas.getByTestId("comment-preview-on-text")).toHaveTextContent(
      "[20m] You spent 20 minutes on this — with music, on headphones",
    );
    await expect(canvas.getByTestId("comment-preview-off-text")).toHaveTextContent(
      "[20m] You spent 20 minutes on this",
    );
    // The two now differ, which is the whole point of showing both.
    await expect(canvas.getByTestId("comment-preview-on-text").textContent).not.toBe(
      canvas.getByTestId("comment-preview-off-text").textContent,
    );

    // Borrowed words are labelled as borrowed: `Example`, never `Now`.
    await expect(on).toHaveAttribute("data-sampled", "true");
    await expect(on).toHaveTextContent("On · Example");
    await expect(on).not.toHaveTextContent("Now");
    await expect(canvas.getByTestId("comment-preview-note")).toBeVisible();
  },
};

/** A long environment wraps inside the modal at half-tablet width. */
export const TimeCommentsAtHalfTablet: Story = {
  globals: { viewport: { value: "halfTablet" } },
  decorators: [
    withAuth("out"),
    withStoreState({
      environment: {
        music: true,
        podcast: true,
        tv: true,
        silence: false,
        noisy: true,
        headphones: true,
      },
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const on = canvas.getByTestId("comment-preview-on");
    await expect(on).toHaveTextContent(
      "with music, a podcast, the TV on and background noise, on headphones",
    );
    // It wraps; it does not push the modal sideways.
    await expect(on.scrollWidth).toBeLessThanOrEqual(on.clientWidth + 1);
  },
};

/** ADR 39: the ceiling ladder — five rungs, All by default, All is not "0". */
export const SectionItemLimitLadder: Story = {
  decorators: [withAuth("out")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ladder = canvas.getByRole("radiogroup", { name: "Limit the items in a section to" });

    // Default is All: nobody who never opens the row loses a row from a list.
    await expect(canvas.getByRole("radio", { name: "All" })).toBeChecked();

    // Anchored regexes: "10" is a substring of "100".
    await userEvent.click(within(ladder).getByRole("radio", { name: /^10$/ }));
    await expect(useGluStore.getState().sectionItemLimit).toBe(10);
    await expect(canvas.getByRole("radio", { name: "All" })).not.toBeChecked();

    await userEvent.click(within(ladder).getByRole("radio", { name: /^100$/ }));
    await expect(useGluStore.getState().sectionItemLimit).toBe(100);

    for (const radio of within(ladder).getAllByRole("radio")) {
      const target = (radio as HTMLInputElement).labels![0];
      await expect(target.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};
