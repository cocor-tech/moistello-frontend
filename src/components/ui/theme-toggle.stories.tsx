import type { Meta, StoryObj } from "@storybook/react";
import { ThemeToggle } from "./theme-toggle";

const meta: Meta<typeof ThemeToggle> = {
  title: "UI/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    docs: {
      description: {
        component:
          "Theme toggle with system preference detection, smooth transitions, and multiple variants (button, segmented, dropdown). Reads and writes the persisted `moistello_theme` preference.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};

export const Segmented: Story = {
  args: {
    variant: "segmented",
  },
};

export const Dropdown: Story = {
  args: {
    variant: "dropdown",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const WithLabel: Story = {
  args: {
    showLabel: true,
  },
};