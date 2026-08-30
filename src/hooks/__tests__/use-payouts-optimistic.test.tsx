import { renderHook, waitFor, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePayouts, useCreatePayout } from "../use-payouts"
import { createQueryWrapper } from "./test-utils"
import { get, post } from "@/lib/api-client"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

describe("useCreatePayout optimistic updates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("optimistically updates payouts cache on mutate, then settles", async () => {
    const initialData = {
      payouts: [
        {
          id: "payout-1",
          circleId: "circle-1",
          recipientId: "user-1",
          roundNumber: 1,
          amount: 200,
          payoutType: "fixed" as const,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }

    let resolvePost: (val: unknown) => void
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve
    })

    vi.mocked(post).mockImplementation(() => postPromise as Promise<never>)

    const { queryClient, QueryWrapper } = createQueryWrapper()
    queryClient.setQueryData(["payouts"], initialData)

    const { result } = renderHook(() => useCreatePayout(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      result.current.mutate({ circleId: "circle-1", recipientId: "user-2", amount: 300, roundNumber: 2 })
    })

    const updated = queryClient.getQueryData<typeof initialData>(["payouts"])
    expect(updated?.payouts.length).toBe(2)
    expect(updated?.payouts[0].amount).toBe(300)
    expect(updated?.payouts[0].id).toMatch(/^optimistic-/)

    await act(async () => {
      resolvePost!({ data: { id: "payout-2", amount: 300 } })
    })
  })

  it("rolls back optimistic update on API error", async () => {
    const initialData = {
      payouts: [
        {
          id: "payout-1",
          circleId: "circle-1",
          recipientId: "user-1",
          roundNumber: 1,
          amount: 200,
          payoutType: "fixed" as const,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    }

    vi.mocked(post).mockRejectedValueOnce(new Error("Failed"))

    const { queryClient, QueryWrapper } = createQueryWrapper()
    queryClient.setQueryData(["payouts"], initialData)

    const { result } = renderHook(() => useCreatePayout(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({ circleId: "circle-1", recipientId: "user-2", amount: 300, roundNumber: 2 })
      } catch {
        // Expected error
      }
    })

    const rolledBack = queryClient.getQueryData<typeof initialData>(["payouts"])
    expect(rolledBack?.payouts.length).toBe(1)
    expect(rolledBack?.payouts[0].amount).toBe(200)
  })
})
