import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          "Text input with an underline border, floating label, focus glow, inline hint and per-field validation error. Pass `error` (from react-hook-form or your form state) to switch the border to the destructive token and surface the message below the field while preserving layout height (no jumps).",
      },
    },
  },
  args: {
    label: "Email Address",
    placeholder: "you@example.com",
    type: "email",
    error: "",
    hint: "",
  },
  argTypes: {
    type: { control: "select", options: ["text", "email", "password", "number"] },
    error: { control: "text" },
    hint: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: "We never share your email." },
};

export const WithError: Story = {
  args: { error: "Enter a valid email address" },
  parameters: {
    docs: { description: { story: "Error state rendered with a `role=alert` message and destructive underline." } },
  },
};

export const Password: Story = {
  args: { type: "password", label: "Password", placeholder: "••••••••" },
};

export const WithLeftIcon: Story = {
  args: {
    leftIcon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
};