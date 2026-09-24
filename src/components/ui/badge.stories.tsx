import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    docs: {
      description: {
        component:
          "Compact pill label with a leading status dot. Used for statuses (active / pending / failed) and category tags. Variants map to semantic tokens so badges stay legible in both themes.",
      },
    },
  },
  args: { children: "Active", variant: "success", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "success", "warning", "destructive", "info", "outline", "premium"],
    },
    size: { control: "select", options: ["sm", "md"] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Success: Story = { args: { variant: "success", children: "Payout Sent" } };

export const Warning: Story = { args: { variant: "warning", children: "Pending" } };

export const Destructive: Story = { args: { variant: "destructive", children: "Missed Round" } };

export const Primary: Story = { args: { variant: "primary", children: "Organizer" } };

export const Premium: Story = { args: { variant: "premium", children: "Premium Circle" } };

export const Info: Story = { args: { variant: "info", children: "New" } };

export const Outline: Story = { args: { variant: "outline", children: "Filter" } };

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <Badge {...args} size="sm">
        Small
      </Badge>
      <Badge {...args} size="md">
        Medium
      </Badge>
    </div>
  ),
};