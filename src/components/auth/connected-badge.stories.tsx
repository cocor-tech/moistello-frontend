import type { Meta, StoryObj } from "@storybook/react";
import { ConnectedBadge } from "./connected-badge";

const address = "GCJ5K3XQ7M2PLDV6HZNBT4RWYSFAEKXGQ3UTNMCL5Q2ZVJ7RD3X7Q4YB";

const meta: Meta<typeof ConnectedBadge> = {
  title: "Auth/ConnectedBadge",
  component: ConnectedBadge,
  parameters: {
    docs: {
      description: {
        component:
          "Shows the connected wallet and its shortened address. The disconnect control only renders when an onDisconnect handler is passed.",
      },
    },
  },
  args: { walletName: "Freighter", address, onDisconnect: () => {} },
};

export default meta;
type Story = StoryObj<typeof ConnectedBadge>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const shortened = `${address.slice(0, 6)}...${address.slice(-4)}`;
    if (!canvasElement.textContent?.includes(shortened)) {
      throw new Error(`Expected shortened address "${shortened}"`);
    }
    const disconnect = canvasElement.querySelector<HTMLButtonElement>('button[aria-label="Disconnect wallet"]');
    if (!disconnect) throw new Error("Disconnect control should be rendered");
    disconnect.click();
  },
};

export const ReadOnly: Story = {
  args: { onDisconnect: undefined },
  play: async ({ canvasElement }) => {
    if (canvasElement.querySelector('button[aria-label="Disconnect wallet"]')) {
      throw new Error("Read-only badge should not render a disconnect control");
    }
  },
};
