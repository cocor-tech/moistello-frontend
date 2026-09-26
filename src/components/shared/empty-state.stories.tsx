import type { Meta, StoryObj } from "@storybook/react";
import {
  EmptyState,
  CircleListEmptyState,
  SavedCirclesEmptyState,
  MemberTabsEmptyState,
} from "./empty-state";
import { Sparkles } from "lucide-react";

const meta: Meta<typeof EmptyState> = {
  title: "Shared/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Nothing here yet",
    description: "There are no records to display at the moment.",
    action: {
      label: "Get Started",
      onClick: () => alert("Action clicked"),
    },
  },
};

export const CircleList: Story = {
  render: () => <CircleListEmptyState onAction={() => alert("Create circle clicked")} />,
};

export const SavedCircles: Story = {
  render: () => <SavedCirclesEmptyState onAction={() => alert("Browse circles clicked")} />,
};

export const MemberTabs: Story = {
  render: () => <MemberTabsEmptyState onAction={() => alert("Invite members clicked")} />,
};
