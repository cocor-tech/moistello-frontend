import type { Meta, StoryObj } from "@storybook/react";
import { CircleStatusBadge } from "./circle-status-badge";

const meta: Meta<typeof CircleStatusBadge> = {
  title: "Circles/CircleStatusBadge",
  component: CircleStatusBadge,
  parameters: {
    docs: {
      description: {
        component:
          "Status pill shown on circle cards and detail headers. Each lifecycle status maps to a semantic badge variant.",
      },
    },
  },
  args: { status: "active" },
  argTypes: {
    status: {
      control: "select",
      options: ["pending", "active", "completed", "cancelled", "disputed"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CircleStatusBadge>;

// Play functions use plain DOM checks so the story needs no extra test dependency.
const expectLabel = (canvasElement: HTMLElement, label: string) => {
  if (!canvasElement.textContent?.includes(label)) {
    throw new Error(`Expected badge to render "${label}"`);
  }
};

export const Active: Story = {
  args: { status: "active" },
  play: async ({ canvasElement }) => expectLabel(canvasElement, "Active"),
};

export const Pending: Story = {
  args: { status: "pending" },
  play: async ({ canvasElement }) => expectLabel(canvasElement, "Pending"),
};

export const Disputed: Story = {
  args: { status: "disputed" },
  play: async ({ canvasElement }) => expectLabel(canvasElement, "Disputed"),
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <CircleStatusBadge status="pending" />
      <CircleStatusBadge status="active" />
      <CircleStatusBadge status="completed" />
      <CircleStatusBadge status="cancelled" />
      <CircleStatusBadge status="disputed" />
    </div>
  ),
};
