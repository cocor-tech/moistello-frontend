import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"
import { ChooseWalletStep } from "../choose-wallet-step"

const mockMulti: Record<string, unknown> = {
  detectedWallets: [],
  isScanning: false,
  connectingWalletId: null,
  connect: vi.fn().mockResolvedValue(undefined),
}

vi.mock("@/stores/multi-wallet-store", () => ({
  useMultiWalletStore: (selector: (s: typeof mockMulti) => unknown) => selector(mockMulti),
}))

const mockWc: Record<string, unknown> = {
  pairingUri: null,
  pairingState: "idle",
  pairingError: null,
  qrExpiresAt: null,
  reset: vi.fn(),
}

vi.mock("@/stores/walletconnect-store", () => ({
  useWalletConnectStore: (selector: (s: typeof mockWc) => unknown) => selector(mockWc),
}))

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockAuthConnectionState(props: { pairingState: string; pairingUri: string | null }) {
      return (
        <div data-testid="auth-connection-state">
          wc2:{props.pairingState}:{props.pairingUri}
        </div>
      )
    },
}))

const extensionWallet = {
  id: "freighter",
  name: "Freighter",
  category: "extension",
  icon: null,
  description: "Browser extension",
  installUrl: "https://freighter.app",
  status: "detected",
}

const hardwareWallet = {
  id: "ledger",
  name: "Ledger",
  category: "hardware",
  icon: null,
  description: "Hardware wallet",
  installUrl: "",
  status: "detected",
}

const passkeyWallet = {
  id: "passkey",
  name: "Passkey",
  category: "passkey",
  icon: null,
  description: "Fast, secure, no password needed",
  installUrl: "",
  status: "detected",
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(mockMulti, {
    detectedWallets: [],
    isScanning: false,
    connectingWalletId: null,
    connect: vi.fn().mockResolvedValue(undefined),
  })
  Object.assign(mockWc, {
    pairingUri: null,
    pairingState: "idle",
    pairingError: null,
    qrExpiresAt: null,
    reset: vi.fn(),
  })
})

describe("ChooseWalletStep", () => {
  it("shows scanning state while wallets are being detected", () => {
    mockMulti.isScanning = true
    render(<ChooseWalletStep mode="login" />)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText("Detecting wallets...")).toBeInTheDocument()
  })

  it("renders wallet grid when extension wallets are detected", () => {
    mockMulti.detectedWallets = [extensionWallet]
    render(<ChooseWalletStep mode="login" />)

    expect(screen.getByText("Freighter")).toBeInTheDocument()
    expect(screen.getByText("Or connect with a wallet")).toBeInTheDocument()
  })

  it("calls connect when a wallet is selected", () => {
    mockMulti.detectedWallets = [extensionWallet]
    render(<ChooseWalletStep mode="login" />)

    fireEvent.click(screen.getByText("Freighter"))
    expect(mockMulti.connect).toHaveBeenCalledWith("freighter")
  })

  it("shows empty state when no wallets are detected", () => {
    render(<ChooseWalletStep mode="login" />)

    expect(screen.getByText(/No wallets detected/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Freighter" })).toHaveAttribute(
      "href",
      "https://freighter.app"
    )
  })

  it("disables wallet buttons while a connection is in progress", () => {
    mockMulti.detectedWallets = [hardwareWallet]
    mockMulti.connectingWalletId = "ledger"
    render(<ChooseWalletStep mode="login" />)

    expect(screen.getByRole("button", { name: /Ledger/ })).toBeDisabled()
  })

  it("shows passkey sign-in button in login mode and invokes onPasskeyLogin", () => {
    mockMulti.detectedWallets = [passkeyWallet]
    const onPasskeyLogin = vi.fn().mockResolvedValue(undefined)
    render(<ChooseWalletStep mode="login" onPasskeyLogin={onPasskeyLogin} />)

    fireEvent.click(screen.getByText("Sign in with Passkey"))
    expect(onPasskeyLogin).toHaveBeenCalledTimes(1)
  })

  it("shows passkey button in register mode and connects via store", () => {
    mockMulti.detectedWallets = [passkeyWallet]
    render(<ChooseWalletStep mode="register" />)

    fireEvent.click(screen.getByText("Passkey"))
    expect(mockMulti.connect).toHaveBeenCalledWith("passkey")
  })

  it("classifies a passkey login error and retries from the banner", async () => {
    mockMulti.detectedWallets = [passkeyWallet]
    const cancelled = Object.assign(new Error("cancelled"), { name: "NotAllowedError" })
    const onPasskeyLogin = vi.fn().mockRejectedValueOnce(cancelled).mockResolvedValue(undefined)
    render(<ChooseWalletStep mode="login" onPasskeyLogin={onPasskeyLogin} />)

    fireEvent.click(screen.getByText("Sign in with Passkey"))
    expect(await screen.findByText("Passkey prompt cancelled")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }))
    await waitFor(() => expect(onPasskeyLogin).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByText("Passkey prompt cancelled")).toBeNull())
  })

  it("shows classified error banner when register-mode passkey connect fails", async () => {
    mockMulti.detectedWallets = [passkeyWallet]
    const cancelled = Object.assign(new Error("cancelled"), { name: "NotAllowedError" })
    mockMulti.connect = vi.fn().mockRejectedValue(cancelled)
    render(<ChooseWalletStep mode="register" />)

    fireEvent.click(screen.getByText("Passkey"))
    expect(await screen.findByText("Passkey prompt cancelled")).toBeInTheDocument()
    expect(screen.getByText("Use a different method")).toBeInTheDocument()
  })

  it("renders WalletConnect state when pairing is active", () => {
    mockWc.pairingState = "pairing"
    mockWc.pairingUri = "wc:abc@2?relay-protocol=irn"
    render(<ChooseWalletStep mode="login" />)

    const wc = screen.getByTestId("auth-connection-state")
    expect(wc).toHaveTextContent("wc2:pairing")
    expect(wc).toHaveTextContent("wc:abc@2?relay-protocol=irn")
    expect(mockMulti.isScanning).toBe(false)
  })
})
