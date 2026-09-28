import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useInviteGeneration } from "./use-invite-generation"

const postMock = vi.fn()
vi.mock("@/lib/api-client", () => ({ post: (...args: unknown[]) => postMock(...args) }))

describe("useInviteGeneration", () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it("opens the modal and stores the generated code", async () => {
    postMock.mockResolvedValueOnce({ data: { invite: { code: "ABC123" } } })
    const { result } = renderHook(() => useInviteGeneration("circle-1"))

    await act(async () => {
      await result.current.generate()
    })

    expect(postMock).toHaveBeenCalledWith(
      "/circles/circle-1/invites",
      { maxUses: 10, ttlHours: 24 },
    )
    expect(result.current.isOpen).toBe(true)
    expect(result.current.code).toBe("ABC123")
    expect(result.current.isError).toBe(false)
  })

  it("records an error state when generation fails", async () => {
    postMock.mockRejectedValueOnce(new Error("boom"))
    const { result } = renderHook(() => useInviteGeneration("circle-1"))

    await act(async () => {
      await result.current.generate()
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.error).toBe("boom")
  })

  it("resets code and closes on close()", async () => {
    postMock.mockResolvedValueOnce({ data: { invite: { code: "ABC123" } } })
    const { result } = renderHook(() => useInviteGeneration("circle-1"))

    await act(async () => {
      await result.current.generate()
    })
    act(() => result.current.close())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.code).toBe("")
  })

  it("sends a caller-chosen expiry instead of a hardcoded 24h", async () => {
    postMock.mockResolvedValueOnce({ data: { invite: { code: "ABC123" } } })
    const { result } = renderHook(() => useInviteGeneration("circle-1", { ttlHours: 72 }))

    await act(async () => {
      await result.current.generate()
    })

    // The TTL used to be fixed at 24h with no way to choose.
    expect(postMock).toHaveBeenCalledWith("/circles/circle-1/invites", {
      maxUses: 10,
      ttlHours: 72,
    })
    expect(result.current.ttlHours).toBe(72)
  })

  it("surfaces the server expiry and builds a resolvable link", async () => {
    const expiresAt = new Date(Date.now() + 48 * 3_600_000).toISOString()
    postMock.mockResolvedValueOnce({ data: { invite: { code: "ABC123", expiresAt } } })
    const { result } = renderHook(() => useInviteGeneration("circle-1", { ttlHours: 48 }))

    await act(async () => {
      await result.current.generate()
    })

    // The server value wins, so the countdown cannot drift from the real deadline.
    expect(result.current.expiresAt).toBe(expiresAt)
    expect(result.current.inviteUrl).toMatch(/\/invite\/ABC123$/)
  })

  it("falls back to the requested TTL when the server sends no expiry", async () => {
    postMock.mockResolvedValueOnce({ data: { invite: { code: "ABC123" } } })
    const { result } = renderHook(() => useInviteGeneration("circle-1", { ttlHours: 1 }))

    await act(async () => {
      await result.current.generate()
    })

    // No expiry would leave the creator with no countdown at all.
    expect(result.current.expiresAt).not.toBeNull()
  })

  it("produces no link when generation failed", async () => {
    postMock.mockRejectedValueOnce(new Error("boom"))
    const { result } = renderHook(() => useInviteGeneration("circle-1"))

    await act(async () => {
      await result.current.generate()
    })

    // Copying the sentinel error code would hand out a broken link.
    expect(result.current.inviteUrl).toBe("")
  })
})
