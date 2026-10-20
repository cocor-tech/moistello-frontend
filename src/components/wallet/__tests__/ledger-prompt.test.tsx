/**
 * wallet-ledger-prompt.test.tsx
 *
 * Component tests for <LedgerPrompt> covering:
 *  - render when open/closed
 *  - onClose callback on Cancel
 *  - onSign callback on Connect
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LedgerPrompt } from "../ledger-prompt";

// Mock window.matchMedia for jsdom environment
const mockMatchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  query,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

vi.mock("@/hooks/use-multi-wallet", () => ({
  useMultiWallet: () => ({
    activeWallet: null,
    detectedWallets: [],
  }),
}));

vi.mock("@/stores/multi-wallet-store", () => ({
  useMultiWalletStore: () => ({
    setActiveWallet: vi.fn(),
  }),
}));

vi.mock("@/stores/ledger-store", () => ({
  useLedgerStore: () => ({
    deviceState: "initial",
    setDeviceState: vi.fn(),
  }),
}));

describe("LedgerPrompt", () => {
  it("renders the prompt when open", () => {
    const onClose = vi.fn();
    render(
      <LedgerPrompt isOpen onClose={onClose} title="Select Ledger" />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Connect your Ledger" })).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", async () => {
    const onClose = vi.fn();
    const onSign = vi.fn();
    render(
      <LedgerPrompt isOpen onClose={onClose} onSign={onSign} title="Select Ledger" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("submits when connect is clicked", async () => {
    const onClose = vi.fn();
    const onSign = vi.fn();
    render(
      <LedgerPrompt isOpen onClose={onClose} onSign={onSign} title="Select Ledger" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(onSign).toHaveBeenCalledTimes(1));
  });
});