import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  parameters: {
    docs: {
      description: {
        component:
          "Accessible combobox-style select (WAI-ARIA listbox). Supports keyboard navigation, typeahead and inline validation errors.",
      },
    },
  },
  args: {
    label: "Frequency",
    placeholder: "Choose frequency",
    options: [
      { label: "Daily", value: "daily" },
      { label: "Weekly", value: "weekly" },
      { label: "Bi-weekly", value: "biweekly" },
      { label: "Monthly", value: "monthly" },
      { label: "Archived types (disabled)", value: "disabled", disabled: true },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { value: "weekly" },
};

export const WithError: Story = {
  args: { value: "", error: "Select a frequency" },
};

export const WithHint: Story = {
  args: { hint: "Payout frequency for new members." },
};

export const Disabled: Story = {
  args: { disabled: true, value: "monthly" },
};