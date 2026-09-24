import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  parameters: {
    docs: {
      description: {
        component:
          "Animated progress bar with semantic colour variants. Exposes role=progressbar with proper ARIA value attributes and an optional inline `NN%` label.",
      },
    },
  },
  args: { value: 62, size: "md", variant: "primary", showLabel: true },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100 } },
    variant: { control: "select", options: ["primary", "success", "warning", "premium"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    showLabel: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Primary: Story = {};

export const Empty: Story = { args: { value: 0 } };

export const Complete: Story = { args: { value: 100 } };

export const Success: Story = { args: { value: 78, variant: "success" } };

export const Warning: Story = { args: { value: 41, variant: "warning" } };

export const Premium: Story = { args: { value: 55, variant: "premium" } };