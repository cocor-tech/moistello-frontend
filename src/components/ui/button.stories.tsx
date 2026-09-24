import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Primary action button. Variants range from the holographic primary CTA used across the app to quiet ghost and destructive actions. `isLoading` swaps the label for a spinner while disabling the button.",
      },
    },
  },
  args: {
    children: "Save Circle",
    variant: "primary",
    size: "md",
    disabled: false,
    isLoading: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "premium", "destructive"],
    },
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    isLoading: { control: "boolean" },
    leftIcon: { control: false },
    rightIcon: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: "primary" },
  parameters: {
    docs: { description: { story: "The default gradient CTA with a holographic glow." } },
  },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Add Member" },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Withdraw" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Cancel" },
};

export const Premium: Story = {
  args: { variant: "premium", children: "Upgrade Circle" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Leave Circle" },
};

export const Loading: Story = {
  args: { isLoading: true, children: "Submitting..." },
};

export const Disabled: Story = {
  args: { disabled: true, children: "Disabled" },
};

export const WithIcon: Story = {
  args: {
    children: "Create Circle",
    leftIcon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
  args: { children: "Size" },
};