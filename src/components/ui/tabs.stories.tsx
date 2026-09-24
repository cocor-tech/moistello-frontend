import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          "Uncontrolled/controlled tab navigation with a gradient active-pill indicator. Pairs a TabsList of TabsTrigger with TabsContent panels.",
      },
    },
  },
  args: { defaultValue: "accounts" },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="payment">Payment</TabsTrigger>
        <TabsTrigger value="privacy">Privacy</TabsTrigger>
      </TabsList>
      <TabsContent value="accounts">Account settings panel.</TabsContent>
      <TabsContent value="payment">Payment methods panel.</TabsContent>
      <TabsContent value="privacy">Privacy controls panel.</TabsContent>
    </Tabs>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState("overview");
    return (
      <Tabs value={value} onValueChange={setValue} defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Circle overview.</TabsContent>
        <TabsContent value="activity">Recent activity.</TabsContent>
        <TabsContent value="members">Member roster.</TabsContent>
      </Tabs>
    );
  },
};