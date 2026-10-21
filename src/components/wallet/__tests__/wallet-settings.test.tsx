import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { WalletSettings } from "../wallet-settings"

vi.mock("@/hooks/use-multi-wallet", () => ({
  useMultiWallet: () => ({
    wallets: {
      "wallet-1": { id: "wallet-1", publicKey: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1111", status: "connected", balance: { xlm: "100", usdc: "50" } },
      "wallet-2": { id: "wallet-2", publicKey: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB2222", status: "connected", balance: { xlm: "200", usdc: "100" } },
      "wallet-3": { id: "wallet-3", publicKey: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC3333", status: "disconnected", balance: { xlm: "0", usdc: "0" } },
    },
    detectedWallets: [
      { id: "wallet-1", name: "Freighter", status: "connected", category: "extension" },
      { id: "wallet-2", name: "WalletConnect", status: "connected", category: "mobile" },
      { id: "wallet-3", name: "Ledger", status: "detected", category: "hardware" },
    ],
    disconnect: vi.fn(),
    refreshBalance: vi.fn(),
    switchWallet: vi.fn(),
    activeWalletId: "wallet-1",
  }),
}))

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}))

vi.mock("@/lib/formatters", () => ({
  formatAddress: (addr: string) => addr.slice(0, 6) + "…" + addr.slice(-4),
}))

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))

describe("WalletSettings", () => {
  it("renders the wallet settings section", () => {
    render(<WalletSettings />)

    expect(screen.getByText("Connected Wallets")).toBeInTheDocument()
    expect(screen.getByText("Other Wallets")).toBeInTheDocument()
  })

  it("shows connected wallets count", () => {
    render(<WalletSettings />)

    expect(screen.getByText("2 connected")).toBeInTheDocument()
  })

  it("renders connected wallets with truncated public keys", () => {
    render(<WalletSettings />)

    expect(screen.getByText("GAAAAA…1111")).toBeInTheDocument()
    expect(screen.getByText("GBBBBB…2222")).toBeInTheDocument()
  })

  it("shows refresh balance buttons", () => {
    render(<WalletSettings />)

    expect(screen.getAllByRole("button", { name: /refresh/i })).toHaveLength(2)
  })

  it("exposes disconnect function via disconnect buttons", () => {
    render(<WalletSettings />)

    const disconnectButtons = screen.getAllByRole("button", { name: /disconnect/i })
    expect(disconnectButtons.length).toBeGreaterThanOrEqual(2)
  })

  it("shows 'Disconnect All' button", () => {
    render(<WalletSettings />)

    expect(screen.getByRole("button", { name: /disconnect all/i })).toBeInTheDocument()
  })

  it("shows connected wallets count as 2", () => {
    render(<WalletSettings />)

    expect(screen.getByText("2 connected")).toBeInTheDocument()
  })

  it("renders connected wallets with truncated public keys", () => {
    render(<WalletSettings />)

    expect(screen.getByText("GAAAAA…1111")).toBeInTheDocument()
    expect(screen.getByText("GBBBBB…2222")).toBeInTheDocument()
  })
})