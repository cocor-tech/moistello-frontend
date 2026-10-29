/**
 * wallet-selector-shared.test.tsx
 *
 * Component tests for <WalletSelectorShared> covering:
 *  - rendering with detected wallets
 *  - rendering with no detected wallets (empty state)
 *  - wallet icon and name display
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WalletSelectorShared } from "../wallet-selector-shared";

vi.mock("@/hooks/use-multi-wallet", () => ({
  useMultiWallet: () => ({
    activeWallet: null,
    detectedWallets: [],
  }),
}));

describe("WalletSelectorShared", () => {
  it("renders with no detected wallets", () => {
    const { container } = render(<WalletSelectorShared />);
    const noWalletsText = container.querySelector(
      /no detected wallets/i,
    );
    expect(noWalletsText).toBeInTheDocument();
  });

  it("renders wallet icons and names when detected", () => {
    const { container } = render(
      <WalletSelectorShared
        detectedWallets={[
          { id: "walletconnect", name: "WalletConnect", status: "detected", category: "mobile" },
        ]}
      />,
    );
    expect(container.querySelector(".wc")).toBeInTheDocument();
    expect(container.querySelector(".wc + .name")).toBeInTheDocument();
  });
});