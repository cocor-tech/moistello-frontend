import { renderHook, waitFor, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useWalletBalance, POLL_INTERVAL_MS } from "@/hooks/use-wallet-balance"
import * as balanceCache from "@/lib/wallet/balance-cache"

// ── Mock the balance-cache module ─────────────────────────────────────────────
vi.mock("@/lib/wallet/balance-cache", () => ({
  fetchBalanceWithBackoff: vi.fn(),
  clearBalanceCache: vi.fn(),
}))

const mockedFetch = vi.mocked(balanceCache.fetchBalanceWithBackoff)

const MOCK_ADDRESS = "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE"
const MOCK_BALANCE = { xlm: "100.0000", usdc: "50.0000" }

describe("useWalletBalance", () => {
  beforeEach(() => {
    mockedFetch.mockResolvedValue(MOCK_BALANCE)
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Basic fetch behaviour ────────────────────────────────────────────────

  it("starts with isLoading=true and null balance when fetch never resolves", () => {
    mockedFetch.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useWalletBalance(MOCK_ADDRESS))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.balance).toBeNull()
  })

  it("sets balance and clears loading after successful fetch", async () => {
    const { result } = renderHook(() => useWalletBalance(MOCK_ADDRESS))
    await waitFor(() => expect(result.current.balance).toEqual(MOCK_BALANCE))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.lastUpdatedAt).not.toBeNull()
  })

  it("sets error string when fetch rejects with an Error", async () => {
    mockedFetch.mockRejectedValue(new Error("Network error"))
    const { result } = renderHook(() => useWalletBalance(MOCK_ADDRESS))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe("Network error")
    expect(result.current.balance).toBeNull()
  })

  // ── No-op when no address ────────────────────────────────────────────────

  it("does nothing when address is null", () => {
    const { result } = renderHook(() => useWalletBalance(null))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.balance).toBeNull()
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it("does nothing when address is undefined", () => {
    const { result } = renderHook(() => useWalletBalance(undefined))
    expect(result.current.balance).toBeNull()
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  // ── Address change behaviour ─────────────────────────────────────────────

  it("resets balance/error/lastUpdatedAt when address becomes null", async () => {
    const { result, rerender } = renderHook(
      ({ addr }: { addr: string | null }) => useWalletBalance(addr),
      { initialProps: { addr: MOCK_ADDRESS as string | null } },
    )
    await waitFor(() => expect(result.current.balance).toEqual(MOCK_BALANCE))

    act(() => rerender({ addr: null }))
    expect(result.current.balance).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.lastUpdatedAt).toBeNull()
  })

  it("re-fetches with new address when address changes", async () => {
    const ADDR2 = "GBBB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE"
    const balance2 = { xlm: "999.0000", usdc: "888.0000" }
    mockedFetch
      .mockResolvedValueOnce(MOCK_BALANCE)
      .mockResolvedValueOnce(balance2)

    const { result, rerender } = renderHook(
      ({ addr }: { addr: string }) => useWalletBalance(addr),
      { initialProps: { addr: MOCK_ADDRESS } },
    )
    await waitFor(() => expect(result.current.balance).toEqual(MOCK_BALANCE))

    act(() => rerender({ addr: ADDR2 }))
    await waitFor(() => expect(result.current.balance).toEqual(balance2))
    expect(mockedFetch).toHaveBeenCalledWith(ADDR2, expect.anything())
  })

  // ── refresh() ────────────────────────────────────────────────────────────

  it("refresh() triggers a new fetch with forceRefresh:true", async () => {
    const { result } = renderHook(() => useWalletBalance(MOCK_ADDRESS))
    await waitFor(() => expect(result.current.balance).toEqual(MOCK_BALANCE))

    const callsBefore = mockedFetch.mock.calls.length
    act(() => result.current.refresh())
    await waitFor(() => expect(mockedFetch.mock.calls.length).toBeGreaterThan(callsBefore))

    const lastCall = mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1]
    expect(lastCall[1]?.forceRefresh).toBe(true)
  })

  // ── Polling with fake timers ───────────────────────────────────────────────

  it("polls again after POLL_INTERVAL_MS", async () => {
    vi.useFakeTimers()
    try {
      mockedFetch.mockResolvedValue(MOCK_BALANCE)
      const { result, unmount } = renderHook(() => useWalletBalance(MOCK_ADDRESS))

      // Let the initial fetch settle without running timers
      await act(async () => {
        // Drain microtasks (promises) without advancing fake timers
        await new Promise<void>((resolve) => queueMicrotask(resolve))
      })
      await act(async () => {
        await new Promise<void>((resolve) => queueMicrotask(resolve))
      })

      const callsBefore = mockedFetch.mock.calls.length

      // Advance past one poll interval
      act(() => { vi.advanceTimersByTime(POLL_INTERVAL_MS + 50) })
      await act(async () => {
        await new Promise<void>((resolve) => queueMicrotask(resolve))
      })

      expect(mockedFetch.mock.calls.length).toBeGreaterThan(callsBefore)
      expect(result.current.balance).toEqual(MOCK_BALANCE)
      unmount()
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })

  it("skips fetch inside poll tick when tab is hidden", async () => {
    vi.useFakeTimers()
    try {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      })
      mockedFetch.mockResolvedValue(MOCK_BALANCE)
      const { unmount } = renderHook(() => useWalletBalance(MOCK_ADDRESS))

      // Drain initial fetch
      await act(async () => {
        await new Promise<void>((resolve) => queueMicrotask(resolve))
      })
      await act(async () => {
        await new Promise<void>((resolve) => queueMicrotask(resolve))
      })

      const callsBefore = mockedFetch.mock.calls.length

      // Advance through multiple poll intervals — should NOT call fetch
      act(() => { vi.advanceTimersByTime(POLL_INTERVAL_MS * 3 + 100) })
      await act(async () => {
        await new Promise<void>((resolve) => queueMicrotask(resolve))
      })

      expect(mockedFetch.mock.calls.length).toBe(callsBefore)
      unmount()
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })

  // ── Cleanup ───────────────────────────────────────────────────────────────

  it("removes visibilitychange listener on unmount", async () => {
    const removeSpy = vi.spyOn(document, "removeEventListener")
    const { unmount } = renderHook(() => useWalletBalance(MOCK_ADDRESS))
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
  })

  it("fetchBalanceWithBackoff is called with the given address", async () => {
    renderHook(() => useWalletBalance(MOCK_ADDRESS))
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled())
    expect(mockedFetch).toHaveBeenCalledWith(
      MOCK_ADDRESS,
      expect.objectContaining({ forceRefresh: false }),
    )
  })
})
