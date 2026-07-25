import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useGluStore } from "@/store/gluStore";
import { withStoreState } from "@/stories/storeDecorator";
import { EnvironmentToggles } from "./EnvironmentToggles";

const meta = {
  title: "Environment/EnvironmentToggles",
  component: EnvironmentToggles,
  decorators: [withStoreState()],
} satisfies Meta<typeof EnvironmentToggles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SilenceIsExclusive: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Music"));
    await userEvent.click(canvas.getByText("TV"));
    await userEvent.click(canvas.getByText("Headphones"));
    await expect(useGluStore.getState().environment).toMatchObject({
      music: true,
      tv: true,
      headphones: true,
    });

    await userEvent.click(canvas.getByText("Silence"));
    await expect(useGluStore.getState().environment).toMatchObject({
      silence: true,
      music: false,
      tv: false,
      // Headphones is equipment on your head, not a sound environment.
      headphones: true,
    });

    await userEvent.click(canvas.getByText("Podcast"));
    await expect(useGluStore.getState().environment).toMatchObject({
      silence: false,
      podcast: true,
    });
  },
};
