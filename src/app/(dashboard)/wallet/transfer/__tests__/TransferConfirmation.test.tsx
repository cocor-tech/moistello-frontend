import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { TransferConfirmation } from "../components/TransferConfirmation"

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/constants", () => ({
  STELLAR_NETWORK: "testnet",
  STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
}))

vi.mock("@/lib/explorer", () => ({
  getExplorerTxUrl: (_hash: string, network: string) =>
    `https://stellar.expert/explorer/${network === "mainnet" ? "public" : "testnet"}/tx/${_hash}`,
}))

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}))

vi.mock("@/lib/formatters", () => ({
  formatAddress: (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`,
}))

// Mock the Soroban RPC so we control when getTransaction resolves
const mockGetTransaction = vi.fn()
vi.mock("@/lib/soroban/rpc-client", () => ({
  SorobanRpcClient: vi.fn().mockImplementation(() => ({
    getTransaction: mockGetTransaction,
  })),
}))

// ── Test helpers ────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  txnHash: "TXABC1234567890DEF",
  amount: "50",
  currency: "USDC" as const,
  recipient: "GCXYZ1234567890ABCDEFGHIJK",
  networkFee: 0.01,
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("TransferConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Default: transaction not yet found (pending)
    mockGetTransaction.mockRejectedValue(new Error("NOT_FOUND"))
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("renders in pending state initially", async () => {
    render(<TransferConfirmation {...DEFAULT_PROPS} />)

    // Confirmation container is present
    expect(screen.getByTestId("transfer-confirmation")).toBeDefined()

    // Amount and currency visible
    expect(screen.getByText("50")).toBeDefined()
    expect(screen.getByText("USDC")).toBeDefined()

    // Shows pending label
    expect(screen.getByText(/Confirming on Stellar/i)).toBeDefined()
  })

  it("shows destination address in the detail rows", () => {
    render(<TransferConfirmation {...DEFAULT_PROPS} />)
    expect(screen.getByText("Destination")).toBeDefined()
    // formatAddress mock returns first6…last4
    expect(screen.getByText(/GCXYZ1/)).toBeDefined()
  })

  it("shows network fee", () => {
    render(<TransferConfirmation {...DEFAULT_PROPS} />)
    expect(screen.getByText("Network Fee")).toBeDefined()
    expect(screen.getByText("0.01 USDC")).toBeDefined()
  })

  it("shows truncated tx hash with copy button and explorer link", () => {
    render(<TransferConfirmation {...DEFAULT_PROPS} />)

    // Copy button
    const copyBtn = screen.getByRole("button", { name: /copy transaction hash/i })
    expect(copyBtn).toBeDefined()

    // Explorer anchor
    const explorerLink = screen.getByRole("link", {
      name: /view transaction on stellar explorer/i,
    }) as HTMLAnchorElement
    expect(explorerLink.href).toContain("stellar.expert")
    expect(explorerLink.href).toContain("testnet")
    expect(explorerLink.href).toContain(DEFAULT_PROPS.txnHash)
    expect(explorerLink.target).toBe("_blank")
  })

  it("renders the network badge with correct label", () => {
    render(<TransferConfirmation {...DEFAULT_PROPS} />)
    expect(screen.getByText("Testnet")).toBeDefined()
  })

  it("transitions to finalized state when RPC returns SUCCESS", async () => {
    mockGetTransaction.mockResolvedValue({ status: "SUCCESS" })

    render(<TransferConfirmation {...DEFAULT_PROPS} />)

    // Advance past the initial delay
    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    await waitFor(() => {
      expect(screen.getByText("Transfer Confirmed")).toBeDefined()
    })

    // Finalized state should show the detail link to the tx page
    expect(
      screen.getByRole("link", { name: /view full transaction details/i }),
    ).toBeDefined()
  })

  it("transitions to failed state when RPC returns FAILED", async () => {
    mockGetTransaction.mockResolvedValue({ status: "FAILED" })

    render(<TransferConfirmation {...DEFAULT_PROPS} />)

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    await waitFor(() => {
      expect(screen.getByText("Transaction Failed")).toBeDefined()
    })
  })

  it("copies tx hash to clipboard when copy button is clicked", async () => {
    const { copyToClipboard } = await import("@/lib/clipboard")
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })

    render(<TransferConfirmation {...DEFAULT_PROPS} />)

    const copyBtn = screen.getByRole("button", { name: /copy transaction hash/i })
    await user.click(copyBtn)

    expect(copyToClipboard).toHaveBeenCalledWith(DEFAULT_PROPS.txnHash)
  })

  it("shows progress bar with aria attributes while pending", () => {
    render(<TransferConfirmation {...DEFAULT_PROPS} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toBeDefined()
    expect(progressBar.getAttribute("aria-valuemin")).toBe("1")
    expect(progressBar.getAttribute("aria-valuemax")).toBe("20")
  })

  it("has aria-live polite region for screen reader status updates", () => {
    render(<TransferConfirmation {...DEFAULT_PROPS} />)
    const region = screen.getByTestId("transfer-confirmation")
    expect(region.getAttribute("aria-live")).toBe("polite")
  })
})
