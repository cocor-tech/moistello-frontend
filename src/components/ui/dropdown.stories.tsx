import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { Dropdown, DropdownItem } from "./dropdown";

const meta: Meta<typeof Dropdown> = {
  title: "UI/Dropdown",
  component: Dropdown,
  parameters: {
    docs: {
      description: {
        component:
          "Accessible menu popover. The trigger is cloned with `aria-haspopup`/`aria-expanded` and full roving-focus keyboard support (ArrowUp/ArrowDown/Home/End/Escape/Tab). The menu opens into a `role=menu` container and returns focus to the trigger on close.",
      },
    },
  },
  args: {
    trigger: (
      <button type="button" className="glass rounded-xl px-4 py-2 text-sm text-foreground">
        Account
      </button>
    ),
    align: "left",
  },
  argTypes: {
    align: { control: "select", options: ["left", "right"] },
    trigger: { control: false },
  },
  decorators: [
    (Story) => (
      // The menu is absolutely positioned, so anchor it with a tall block to
      // keep the open panel inside the canvas instead of clipping at the edge.
      <div className="flex min-h-80 items-start justify-center p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {};

export const WithIcons: Story = {
  args: {
    trigger: (
      <button type="button" className="glass rounded-xl px-4 py-2 text-sm text-foreground">
        Account
      </button>
    ),
  },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownItem icon={<User className="h-4 w-4" />}>Profile</DropdownItem>
      <DropdownItem icon={<Settings className="h-4 w-4" />}>Settings</DropdownItem>
      <DropdownItem icon={<Bell className="h-4 w-4" />}>Notifications</DropdownItem>
    </Dropdown>
  ),
};

export const Destructive: Story = {
  render: (args) => (
    <Dropdown {...args}>
      <DropdownItem>Edit circle</DropdownItem>
      <DropdownItem>Export data</DropdownItem>
      <DropdownItem destructive icon={<LogOut className="h-4 w-4" />}>
        Leave circle
      </DropdownItem>
    </Dropdown>
  ),
};

export const AlwaysOpen: Story = {
  render: (args) => {
    const Wrapper = () => {
      const [open, setOpen] = useState(true);
      return (
        <div
          className="relative inline-block"
          data-testid="always-open-dropdown"
          data-open={open ? "true" : "false"}
        >
          <button
            type="button"
            className="glass rounded-xl px-4 py-2 text-sm text-foreground"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Account
          </button>
          {open && (
            <div
              role="menu"
              aria-orientation="vertical"
              className="absolute z-50 mt-1 min-w-[200px] left-0 rounded-2xl glass-strong p-1.5"
            >
              <DropdownItem>Profile</DropdownItem>
              <DropdownItem>Settings</DropdownItem>
              <DropdownItem destructive>Leave circle</DropdownItem>
            </div>
          )}
        </div>
      );
    };
    return <Wrapper />;
  },
};

export const RightAligned: Story = {
  args: { align: "right" },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownItem>Profile</DropdownItem>
      <DropdownItem>Settings</DropdownItem>
    </Dropdown>
  ),
};
