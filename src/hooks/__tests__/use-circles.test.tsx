import { renderHook, waitFor, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  useCircles,
  useCircle,
  useCircleMembers,
  useCircleRounds,
  useStartCircle,
  useCreateCircle,
  useJoinCircle,
  useContribute,
} from "../use-circles"
import { createQueryWrapper } from "./test-utils"
import { get, post } from "@/lib/api-client"

const { addToast, loggerError } = vi.hoisted(() => ({
  addToast: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof addToast }) => unknown) =>
    selector({ addToast }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: loggerError },
}))

const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)

const circlePayload = {
  name: "Savings",
  circleType: "public",
  payoutType: "random",
  contributionAmount: 100,
  currency: "USDC",
  frequency: "monthly",
  maxMembers: 10,
  lateFeePercent: 5,
  gracePeriodHours: 24,
  maxStrikes: 3,
  startDate: "2026-01-01",
}

describe("use-circles queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("serializes every filter into the circles query string", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { circles: [] },
      meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
    })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(
      () =>
        useCircles({
          search: "savings",
          status: "active",
          type: "public",
          currency: "USDC",
          page: 2,
          limit: 10,
          organizerId: "u1",
          sort: "newest",
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      { wrapper: QueryWrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedGet).toHaveBeenCalledWith(
      "/circles?search=savings&status=active&type=public&currency=USDC&page=2&limit=10&organizerId=u1&sort=newest&sortBy=createdAt&sortOrder=desc",
    )
    expect(result.current.data?.meta).toEqual({
      page: 2,
      limit: 10,
      total: 0,
      totalPages: 0,
    })
  })

  it("uses an unfiltered URL and default meta when no filters are given", async () => {
    mockedGet.mockResolvedValueOnce({ data: { circles: [] } })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCircles(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedGet).toHaveBeenCalledWith("/circles")
    expect(result.current.data).toEqual({
      circles: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })
  })

  it("normalizes Soroban option envelopes ({ Valid, String/Time }) on circle lists", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        circles: [
          {
            id: "c1",
            name: { Valid: true, String: "Neighborhood" },
            startDate: { Valid: true, Time: "2026-05-01T00:00:00Z" },
            description: { Valid: false, String: "" },
          },
        ],
      },
    })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCircles(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const circle = result.current.data?.circles[0] as unknown as Record<string, unknown>
    expect(circle.name).toBe("Neighborhood")
    expect(circle.startDate).toBe("2026-05-01T00:00:00Z")
    expect(circle.description).toBeNull()
  })

  it("loads and normalizes a single circle", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { circle: { id: "c1", name: { Valid: true, String: "Detail" } } },
    })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCircle("c1"), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedGet).toHaveBeenCalledWith("/circles/c1")
    expect((result.current.data as unknown as Record<string, unknown>)?.name).toBe("Detail")
  })

  it("returns null when a circle detail payload is missing", async () => {
    mockedGet.mockResolvedValueOnce({ data: {} })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCircle("c2"), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })

  it("does not fetch a circle detail without an id", () => {
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCircle(""), { wrapper: QueryWrapper })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockedGet).not.toHaveBeenCalled()
  })

  it("loads circle members and falls back to an empty list", async () => {
    mockedGet.mockResolvedValueOnce({ data: { members: [{ id: "m1" }] } })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCircleMembers("c1"), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/circles/c1/members")
    expect(result.current.data).toEqual([{ id: "m1" }])

    mockedGet.mockResolvedValueOnce({ data: {} })
    const second = renderHook(() => useCircleMembers("c2"), {
      wrapper: createQueryWrapper().QueryWrapper,
    })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(second.result.current.data).toEqual([])
  })

  it("loads circle rounds and falls back to an empty list", async () => {
    mockedGet.mockResolvedValueOnce({ data: { rounds: [{ id: "r1" }] } })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCircleRounds("c1"), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/circles/c1/rounds")
    expect(result.current.data).toEqual([{ id: "r1" }])

    mockedGet.mockResolvedValueOnce({ data: {} })
    const second = renderHook(() => useCircleRounds("c2"), {
      wrapper: createQueryWrapper().QueryWrapper,
    })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(second.result.current.data).toEqual([])
  })
})

describe("use-circles mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts a circle and invalidates its detail plus the list", async () => {
    mockedPost.mockResolvedValueOnce({ data: { success: true } } as never)
    const { queryClient, QueryWrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useStartCircle(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.mutateAsync("c1")
    })

    expect(mockedPost).toHaveBeenCalledWith("/circles/c1/start")
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["circle", "c1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["circles"] })
  })

  it("toasts the API error message when starting a circle fails", async () => {
    mockedPost.mockRejectedValueOnce(new Error("Circle not ready"))

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useStartCircle(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync("c1")
      } catch {
        // expected
      }
    })

    expect(loggerError).toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        title: "Failed to start circle",
        description: "Circle not ready",
      }),
    )
  })

  it("creates a circle with the retry flag and invalidates the list", async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: "new-circle" } } as never)
    const { queryClient, QueryWrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useCreateCircle(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.mutateAsync(circlePayload)
    })

    expect(mockedPost).toHaveBeenCalledWith("/circles", circlePayload, {
      _retry: true,
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["circles"] })
  })

  it("prefers the server error string when creating a circle fails", async () => {
    mockedPost.mockRejectedValueOnce({
      response: { data: { error: "Name already taken" } },
    })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useCreateCircle(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync(circlePayload)
      } catch {
        // expected
      }
    })

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        title: "Failed to create circle",
        description: "Name already taken",
      }),
    )
  })

  it("joins a circle with an invite code and invalidates affected caches", async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: "m1" } } as never)
    const { queryClient, QueryWrapper } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useJoinCircle(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({
        circleId: "c1",
        payload: { inviteCode: "SECRET", userId: "u1" },
      })
    })

    expect(mockedPost).toHaveBeenCalledWith("/circles/c1/join", {
      inviteCode: "SECRET",
      userId: "u1",
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["circle", "c1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["circle-members", "c1"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["circles"] })
  })

  it("sends an empty payload when joining without options", async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: "m1" } } as never)

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useJoinCircle(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ circleId: "c1" })
    })

    expect(mockedPost).toHaveBeenCalledWith("/circles/c1/join", {})
  })

  it("toasts the fallback message when joining fails without a server error", async () => {
    mockedPost.mockRejectedValueOnce(new Error("Network Error"))

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useJoinCircle(), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({ circleId: "c1" })
      } catch {
        // expected
      }
    })

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        title: "Failed to join circle",
        description: "Network Error",
      }),
    )
  })

  it("contributes to a circle and reports success", async () => {
    mockedPost.mockResolvedValueOnce({
      data: { id: "contrib-1", amount: 100 },
    } as never)

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useContribute("c1"), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({ amount: 100, roundNumber: 2 })
    })

    expect(mockedPost).toHaveBeenCalledWith("/circles/c1/contribute", {
      amount: 100,
      roundNumber: 2,
    })
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        title: "Contribution successful",
      }),
    )
  })

  it("toasts a contribution error with the server-provided description", async () => {
    mockedPost.mockRejectedValueOnce({
      response: { data: { error: "Insufficient balance" } },
    })

    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useContribute("c1"), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({ amount: 100 })
      } catch {
        // expected
      }
    })

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        title: "Contribution failed",
        description: "Insufficient balance",
      }),
    )
  })
})
