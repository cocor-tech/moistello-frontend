import { renderHook, waitFor, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useContributions, useCreateContribution } from "../use-contributions"
import { createQueryWrapper } from "./test-utils"
import { get, post } from "@/lib/api-client"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

describe("useCreateContribution optimistic updates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("optimistically updates contributions cache on mutate, then settles", async () => {
    const initialData = {
      contributions: [
        {
          id: "contrib-1",
          circleId: "circle-1",
          userId: "user-1",
          roundNumber: 1,
          amount: 50,
          status: "completed",
          onTime: true,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      summary: null,
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }

    let resolvePost: (val: unknown) => void
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve
    })

    vi.mocked(post).mockImplementation(() => postPromise as Promise<never>)

    const { queryClient, QueryWrapper } = createQueryWrapper()
    queryClient.setQueryData(["contributions"], initialData)

    const { result } = renderHook(() => useCreateContribution(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      result.current.mutate({ circleId: "circle-1", amount: 100, roundNumber: 2 })
    })

    const updated = queryClient.getQueryData<typeof initialData>(["contributions"])
    expect(updated?.contributions.length).toBe(2)
    expect(updated?.contributions[0].amount).toBe(100)
    expect(updated?.contributions[0].id).toMatch(/^optimistic-/)

    await act(async () => {
      resolvePost!({ data: { id: "contrib-2", amount: 100 } })
    })
  })

  it("rolls back optimistic update on API error", async () => {
    const initialData = {
      contributions: [
        {
          id: "contrib-1",
          circleId: "circle-1",
          userId: "user-1",
          roundNumber: 1,
          amount: 50,
          status: "completed",
          onTime: true,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    }

    vi.mocked(post).mockRejectedValueOnce(new Error("Failed"))

    const { queryClient, QueryWrapper } = createQueryWrapper()
    queryClient.setQueryData(["contributions"], initialData)

    const { result } = renderHook(() => useCreateContribution(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({ circleId: "circle-1", amount: 100 })
      } catch {
        // Expected error
      }
    })

    const rolledBack = queryClient.getQueryData<typeof initialData>(["contributions"])
    expect(rolledBack?.contributions.length).toBe(1)
    expect(rolledBack?.contributions[0].amount).toBe(50)
  })
})
