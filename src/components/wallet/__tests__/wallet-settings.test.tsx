/**
 * wallet-settings.test.tsx
 *
 * Component tests for <WalletSettings> covering:
 *  - empty state when no wallets are connected
 *  - connected wallet list with balances and status indicator
 *  - nickname rename flow persisted to localStorage
 *  - copy public key interaction
 *  - refresh / switch / disconnect per-wallet actions
 *  - two-step "Disconnect All Wallets" confirmation
 *  - Other Wallets section for non-connected wallets
 */

import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WalletSettings } from "../wallet-settings"

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockDisconnect = vi.fn().mockResolvedValue(undefined)
const mockRefreshBalance = vi.fn()
const mockSwitchWallet = vi.fn()

interface MockWallet {
  status: string
  publicKey: string
  balance?: { xlm?: string; usdc?: string }
}

let mockWallets: Record<string, MockWallet> = {}
let mockDetectedWallets: Array<{ id: string; name: string }> = []
let mockActiveWalletId: string | null = null

vi.mock("@/hooks/use-multi-wallet", () => ({
  useMultiWallet: () => ({
    wallets: mockWallets,
    detectedWallets: mockDetectedWallets,
    disconnect: mockDisconnect,
    refreshBalance: mockRefreshBalance,
    switchWallet: mockSwitchWallet,
    activeWalletId: mockActiveWalletId,
  }),
}))

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}))

import { copyToClipboard } from "@/lib/clipboard"

const CONNECTED: Record<string, MockWallet> = {
  freighter: {
    status: "connected",
    publicKey: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    balance: { xlm: "1250.5", usdc: "300" },
  },
  walletconnect: {
    status: "connected",
    publicKey: "GAOTHERADDRESS1234567890ABCDEFGH1234567890ABCDEFGHIJKLMNOP",
    balance: { xlm: "10" },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockWallets = { ...CONNECTED }
  mockDetectedWallets = [
    { id: "freighter", name: "Freighter" },
    { id: "walletconnect", name: "WalletConnect" },
    { id: "ledger", name: "Ledger" },
  ]
  mockActiveWalletId = "freighter"
})

describe("WalletSettings", () => {
  it("shows an empty state when no wallets are connected", () => {
    mockWallets = {}
    render(<WalletSettings />)
    expect(screen.getByText("No wallets connected")).toBeInTheDocument()
    expect(screen.getByText("0 connected")).toBeInTheDocument()
    expect(screen.queryByText("Other Wallets")).not.toBeInTheDocument()
  })

  it("lists connected wallets with name fallback and balances", () => {
    render(<WalletSettings />)
    expect(screen.getByText("2 connected")).toBeInTheDocument()
    expect(screen.getByText("Freighter")).toBeInTheDocument()
    expect(screen.getByText("WalletConnect")).toBeInTheDocument()
    expect(screen.getByText("1250.5")).toBeInTheDocument()
    expect(screen.getByText("300")).toBeInTheDocument()
    // Wallet with no USDC balance renders an em dash
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("renames a wallet and persists the alias to localStorage", async () => {
    const user = userEvent.setup()
    render(<WalletSettings />)

    const editButtons = screen.getAllByRole("button", { name: /edit wallet nickname/i })
    await user.click(editButtons[0])

    const input = screen.getByLabelText("Wallet nickname")
    expect(input).toHaveValue("Freighter")

    await user.clear(input)
    await user.type(input, "Main Wallet{Enter}")

    expect(screen.getByText("Main Wallet")).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem("moistello_wallet_aliases") ?? "{}")).toEqual({
      freighter: "Main Wallet",
    })
  })

  it("cancels renaming without saving when Escape is pressed", async () => {
    const user = userEvent.setup()
    render(<WalletSettings />)

    await user.click(screen.getAllByRole("button", { name: /edit wallet nickname/i })[0])
    await user.clear(screen.getByLabelText("Wallet nickname"))
    await user.type(screen.getByLabelText("Wallet nickname"), "Scratch{Escape}")

    expect(screen.getByText("Freighter")).toBeInTheDocument()
    expect(localStorage.getItem("moistello_wallet_aliases")).toBeNull()
  })

  it("copies the public key and shows a confirmation icon", async () => {
    const user = userEvent.setup()
    render(<WalletSettings />)

    const copyButton = screen.getByRole("button", { name: /copy public key for freighter/i })
    expect(copyButton).toHaveTextContent("GBRPYH...OX2H")
    await user.click(copyButton)
    expect(copyToClipboard).toHaveBeenCalledWith(CONNECTED.freighter.publicKey)

    // After a successful copy the Copy icon is swapped for a checkmark
    await waitFor(() => expect(copyButton.querySelector(".text-emerald-400")).not.toBeNull())
  })

  it("calls refreshBalance, switchWallet and disconnect for the right wallet", async () => {
    const user = userEvent.setup()
    render(<WalletSettings />)

    await user.click(screen.getByRole("button", { name: /refresh balance for walletconnect/i }))
    expect(mockRefreshBalance).toHaveBeenCalledWith("walletconnect")

    // Active wallet has no Switch button; the inactive one does
    expect(screen.queryByRole("button", { name: "Switch" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Switch" }))
    expect(mockSwitchWallet).toHaveBeenCalledWith("walletconnect")

    await user.click(screen.getByRole("button", { name: /disconnect walletconnect/i }))
    expect(mockDisconnect).toHaveBeenCalledWith("walletconnect")
  })

  it("requires two confirmations before disconnecting all wallets", async () => {
    const user = userEvent.setup()
    render(<WalletSettings />)

    await user.click(screen.getByRole("button", { name: /disconnect all wallets/i }))
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: /yes, disconnect all/i }))
    await user.click(screen.getByRole("button", { name: /confirm disconnect all/i }))

    await waitFor(() => expect(mockDisconnect).toHaveBeenCalledTimes(2))
    expect(mockDisconnect).toHaveBeenCalledWith("freighter")
    expect(mockDisconnect).toHaveBeenCalledWith("walletconnect")
  })

  it("cancels the disconnect-all flow", async () => {
    const user = userEvent.setup()
    render(<WalletSettings />)

    await user.click(screen.getByRole("button", { name: /disconnect all wallets/i }))
    await user.click(screen.getByRole("button", { name: /^cancel$/i }))

    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it("lists non-connected wallets in the Other Wallets section", async () => {
    const user = userEvent.setup()
    mockWallets = {
      ...CONNECTED,
      ledger: { status: "error", publicKey: "GLEDGERPUBKEY1234567890ABCDEFG1234567890ABCDEFGHIJKLMN" },
    }
    render(<WalletSettings />)

    expect(screen.getByText("Other Wallets")).toBeInTheDocument()
    expect(screen.getByText("error")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Remove" }))
    expect(mockDisconnect).toHaveBeenCalledWith("ledger")
  })
})
