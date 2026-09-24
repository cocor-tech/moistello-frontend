import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardAccent,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          "Glass surface that contains related content. Compose with CardHeader / CardTitle / CardDescription / CardContent / CardFooter. The `interactive` flag adds a tilt-on-hover, and `premium` applies the holographic border.",
      },
    },
  },
  argTypes: {
    interactive: { control: "boolean" },
    premium: { control: "boolean" },
  },
  args: {
    interactive: false,
    premium: false,
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

const content = (
  <>
    <CardAccent />
    <CardHeader>
      <CardTitle>Savings Circle</CardTitle>
      <CardDescription>12 members · 500 USDC / round</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        A rotating savings circle pays out the pool to one member every week
        until everyone has collected.
      </p>
    </CardContent>
    <CardFooter>
      <span className="text-xs font-mono text-aurora-cyan">Next payout in 3d 4h</span>
    </CardFooter>
  </>
);

export const Default: Story = {
  render: (args) => <Card {...args}>{content}</Card>,
};

export const Interactive: Story = {
  args: { interactive: true },
  render: (args) => <Card {...args}>{content}</Card>,
};

export const Premium: Story = {
  args: { premium: true },
  render: (args) => <Card {...args}>{content}</Card>,
};