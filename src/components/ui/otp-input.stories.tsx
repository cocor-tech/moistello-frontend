import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { OTPInput } from "./otp-input";

const meta: Meta<typeof OTPInput> = {
  title: "UI/OTPInput",
  component: OTPInput,
  parameters: {
    docs: {
      description: {
        component:
          "One-time-password entry. A single hidden numeric input drives a row of visual slots for a native mobile keyboard and reliable autofill, with an optional validation error below.",
      },
    },
  },
  args: { label: "Verification Code", length: 6 },
};

export default meta;
type Story = StoryObj<typeof OTPInput>;

export const Empty: Story = {
  render: (args) => {
    const [value, setValue] = useState("");
    return <OTPInput {...args} value={value} onChange={setValue} />;
  },
};

export const PartiallyFilled: Story = {
  render: (args) => {
    const [value, setValue] = useState("12");
    return <OTPInput {...args} value={value} onChange={setValue} />;
  },
};

export const WithError: Story = {
  args: { error: "Code is incorrect" },
  render: (args) => {
    const [value, setValue] = useState("112233");
    return <OTPInput {...args} value={value} onChange={setValue} />;
  },
};