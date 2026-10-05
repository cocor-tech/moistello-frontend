import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useTransferPoll } from "../hooks/useTransferPoll"

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/constants", () => ({
  STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
}))

const mockGetTransaction = vi.fn()
vi.mock("@/lib/soroban/rpc-client", () => ({
  SorobanRpcClient: vi.fn().mockImplementation(function () {
    return { getTransaction: mockGetTransaction }
  }),
}))

// ── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Drives the hook's recursive poll loop under fake timers.
 *
 * Every poll awaits the mocked RPC, so its follow-up timer is only registered
 * *after* a microtask flush. A single large `vi.advanceTimersByTime` therefore
 * only ever fires the first poll, and `waitFor` cannot be used here because it
 * schedules its own polling with the same faked timers and would deadlock.
 * Advancing in steps with a flush between them walks the whole loop.
 */
async function flushPolls(ticks: number, stepMs = 3_000) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      vi.advanceTimersByTime(stepMs)
      await Promise.resolve()
    })
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("useTransferPoll", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("starts in pending state", () => {
    mockGetTransaction.mockRejectedValue(new Error("NOT_FOUND"))
    const { result } = renderHook(() => useTransferPoll("TX_HASH_1"))
    expect(result.current.status).toBe("pending")
    expect(result.current.attempts).toBe(0)
  })

  it("returns pending when hash is null", () => {
    const { result } = renderHook(() => useTransferPoll(null))
    expect(result.current.status).toBe("pending")
    expect(mockGetTransaction).not.toHaveBeenCalled()
  })

  it("transitions to finalized when RPC returns SUCCESS", async () => {
    mockGetTransaction.mockResolvedValue({ status: "SUCCESS" })
    const { result } = renderHook(() => useTransferPoll("TX_SUCCESS"))

    await flushPolls(1, 2_000)

    expect(result.current.status).toBe("finalized")
  })

  it("transitions to failed when RPC returns FAILED", async () => {
    mockGetTransaction.mockResolvedValue({ status: "FAILED" })
    const { result } = renderHook(() => useTransferPoll("TX_FAIL"))

    await flushPolls(1, 2_000)

    expect(result.current.status).toBe("failed")
  })

  it("increments attempts on NOT_FOUND", async () => {
    mockGetTransaction.mockRejectedValue(new Error("NOT_FOUND"))
    const { result } = renderHook(() => useTransferPoll("TX_PENDING"))

    // First poll at 1.5s, second at 4.5s
    await flushPolls(5)

    expect(result.current.attempts).toBeGreaterThanOrEqual(1)
    expect(result.current.status).toBe("pending")
  })

  it("transitions to timeout after MAX_ATTEMPTS", async () => {
    mockGetTransaction.mockRejectedValue(new Error("NOT_FOUND"))
    const { result } = renderHook(() => useTransferPoll("TX_TIMEOUT"))

    // 20 attempts × 3_000ms + initial 1_500ms
    await flushPolls(30)

    expect(result.current.status).toBe("timeout")
  })

  it("resets state when txnHash changes", async () => {
    mockGetTransaction
      .mockResolvedValueOnce({ status: "SUCCESS" })
      .mockRejectedValue(new Error("NOT_FOUND"))

    const { result, rerender } = renderHook(
      ({ hash }: { hash: string }) => useTransferPoll(hash),
      { initialProps: { hash: "TX_A" } },
    )

    await flushPolls(1, 2_000)
    expect(result.current.status).toBe("finalized")

    // Switch to a new hash
    rerender({ hash: "TX_B" })

    expect(result.current.status).toBe("pending")
    expect(result.current.attempts).toBe(0)
  })
})
