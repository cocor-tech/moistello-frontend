import type { Meta, StoryObj } from "@storybook/react";
import { Wallet } from "lucide-react";
import { AuthWalletCard } from "./auth-wallet-card";

const detectedWallet = {
  id: "freighter",
  name: "Freighter",
  category: "browser",
  icon: <Wallet className="h-5 w-5" />,
  description: "Browser extension",
  status: "detected" as const,
};

const meta: Meta<typeof AuthWalletCard> = {
  title: "Auth/AuthWalletCard",
  component: AuthWalletCard,
  parameters: {
    docs: {
      description: {
        component:
          "Selectable wallet tile on the sign-in and connect step. Disabled when the wallet extension is not installed or a connection is already in progress.",
      },
    },
  },
  args: { wallet: detectedWallet, state: "idle", onSelect: () => {} },
  argTypes: {
    state: { control: "select", options: ["idle", "connecting", "connected", "error"] },
  },
};

export default meta;
type Story = StoryObj<typeof AuthWalletCard>;

export const Detected: Story = {
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button");
    if (!button || button.disabled) throw new Error("Detected wallet should be selectable");
    button.click();
  },
};

export const Recommended: Story = {
  args: { wallet: { ...detectedWallet, isRecommended: true } },
  play: async ({ canvasElement }) => {
    if (!canvasElement.textContent?.includes("Recommended")) {
      throw new Error('Expected "Recommended" badge');
    }
  },
};

export const NotInstalled: Story = {
  args: { wallet: { ...detectedWallet, status: "not_detected", installUrl: "https://freighter.app" } },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button");
    if (!button?.disabled) throw new Error("Uninstalled wallet should be disabled");
  },
};

export const Connecting: Story = {
  args: { state: "connecting", isConnecting: true },
};
