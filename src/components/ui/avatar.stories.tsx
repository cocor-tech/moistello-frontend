import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component:
          "Circular identity chip that renders an image when `src` is provided and falls back to initials from `fallback`. The optional `online` flag overlays a presence dot (pulsing when online).",
      },
    },
  },
  args: { fallback: "Nkechi Uche", size: "md", online: undefined },
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    online: { control: "select", options: [undefined, true, false] },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Initials: Story = {};

export const WithImage: Story = {
  args: {
    src: "https://avatars.githubusercontent.com/u/583231",
    alt: "GitHub avatar",
  },
};

export const Online: Story = {
  args: { online: true },
};

export const Offline: Story = {
  args: { online: false },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <Avatar key={size} {...args} size={size} />
      ))}
    </div>
  ),
};