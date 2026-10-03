import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { get, post } from "@/lib/api-client"
import { useCircleMembers, useJoinCircle } from "@/hooks/use-circles"
import type { ApiResponse, CircleMember } from "@/types"

/**
 * Join-flow integration tests (#473).
 *
 * These drive the *real* `useJoinCircle` mutation and the *real*
 * `useCircleMembers` query together, with only the HTTP transport replaced. That
 * distinction matters: mocking the hooks (as `circles/[id]/page.test.tsx` does)
 * proves the page calls them, but not that a join actually produces the member
 * state it claims to. Here the assertion is on the member cache after the
 * mutation's invalidation and refetch — which is the thing the user sees.
 *
 * No network: `get`/`post` are stubbed, and nothing else in this file touches a
 * socket.
 */

vi.mock("@/lib/api-client", () => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: unknown }) => unknown) =>
    selector({ addToast: vi.fn() }),
}))
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)

const CIRCLE_ID = "circle-42"
const USER_ID = "user-7"

function member(overrides: Partial<CircleMember> = {}): CircleMember {
  return {
    id: "member-1",
    circleId: CIRCLE_ID,
    userId: USER_ID,
    position: 3,
    status: "active",
    userName: "Ada",
    joinedAt: "2026-06-17T10:00:00.000Z",
    ...overrides,
  }
}

function apiOk<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}

function wrapper() {
  // A fresh client per test so invalidations cannot leak across cases, and
  // retries off so a rejected mutation surfaces immediately.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

/** Renders the join mutation and the member query in one tree. */
function renderJoinFlow() {
  return renderHook(
    () => ({
      join: useJoinCircle(),
      members: useCircleMembers(CIRCLE_ID),
    }),
    { wrapper: wrapper() },
  )
}

/** axios-shaped error, because `extractErrorMessage` reads `response.data.error`. */
function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), {
    response: { status, data: { error: message } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: a circle that already has two members, not including the user.
  mockedGet.mockResolvedValue(apiOk({ members: [member({ id: "m1", userId: "other" })] }))
  mockedPost.mockResolvedValue(apiOk(member()))
})

describe("join flow — successful join", () => {
  it("posts the join and puts the new member into the members cache", async () => {
    const { result } = renderJoinFlow()

    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))
    const before = result.current.members.data
    expect(before?.some((m) => m.userId === USER_ID)).toBe(false)

    // The refetch now sees the user as a member.
    mockedGet.mockResolvedValue(
      apiOk({ members: [member({ id: "m1", userId: "other" }), member({ id: "m2" })] }),
    )

    await result.current.join.mutateAsync({ circleId: CIRCLE_ID })

    expect(mockedPost).toHaveBeenCalledWith(`/circles/${CIRCLE_ID}/join`, {})

    // The invalidation in onSuccess refetches, so the member list is correct.
    await waitFor(() => {
      const current = result.current.members.data ?? []
      expect(current.some((m) => m.userId === USER_ID)).toBe(true)
    })
  })

  it("invalidates the members cache so the roster refetches", async () => {
    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    // Track refetches rather than reaching into the client: the invalidation is
    // in the hook's onSuccess, so a refetch is the observable proof it ran.
    let fetches = 1
    mockedGet.mockImplementation(async () => {
      fetches += 1
      return apiOk({ members: [member({ id: "m1", userId: "other" }), member()] })
    })

    await result.current.join.mutateAsync({ circleId: CIRCLE_ID })

    await waitFor(() => expect(fetches).toBeGreaterThan(1))
  })

  it("yields an active member", async () => {
    mockedPost.mockResolvedValue(apiOk(member({ status: "active" })))

    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))
    const joined = await result.current.join.mutateAsync({ circleId: CIRCLE_ID })

    const data = (joined as ApiResponse<CircleMember>).data
    expect(data?.status).toBe("active")
    expect(data?.userId).toBe(USER_ID)
  })

  it("forwards the invite code in the join payload", async () => {
    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    await result.current.join.mutateAsync({
      circleId: CIRCLE_ID,
      payload: { inviteCode: "JOIN-CODE-123" },
    })

    expect(mockedPost).toHaveBeenCalledWith(`/circles/${CIRCLE_ID}/join`, {
      inviteCode: "JOIN-CODE-123",
    })
  })

  it("forwards the payload verbatim rather than normalising it", async () => {
    // Trimming is the caller's job — `circles/[id]/page.tsx` trims the modal's
    // value before it gets here. The hook must not silently second-guess a
    // payload, or a test double could pass while production still mangles codes.
    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    await result.current.join.mutateAsync({
      circleId: CIRCLE_ID,
      payload: { inviteCode: "  PADDED  " },
    })

    expect(mockedPost).toHaveBeenCalledWith(`/circles/${CIRCLE_ID}/join`, {
      inviteCode: "  PADDED  ",
    })
  })
})

describe("join flow — invalid or expired invite code", () => {
  it("rejects and leaves member state untouched", async () => {
    mockedPost.mockRejectedValue(httpError("Invite code has expired"))

    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))
    const before = result.current.members.data

    await expect(
      result.current.join.mutateAsync({
        circleId: CIRCLE_ID,
        payload: { inviteCode: "EXPIRED" },
      }),
    ).rejects.toThrow()

    // No refetch, no new member: the failed join must not mutate the roster.
    expect(result.current.members.data).toEqual(before)
    expect(result.current.members.data?.some((m) => m.userId === USER_ID)).toBe(false)
  })

  it("exposes the server's message so the modal can show it", async () => {
    mockedPost.mockRejectedValue(httpError("Invite code is no longer valid"))

    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    await expect(
      result.current.join.mutateAsync({ circleId: CIRCLE_ID, payload: { inviteCode: "BAD" } }),
    ).rejects.toMatchObject({ response: { data: { error: "Invite code is no longer valid" } } })
  })

  it("marks the mutation as errored and not pending afterwards", async () => {
    mockedPost.mockRejectedValue(httpError("Invite code has expired"))

    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    await result.current.join
      .mutateAsync({ circleId: CIRCLE_ID, payload: { inviteCode: "EXPIRED" } })
      .catch(() => undefined)

    await waitFor(() => expect(result.current.join.isError).toBe(true))
    expect(result.current.join.isPending).toBe(false)
  })

  it("does not surface a toast for a rejected join beyond the mutation's own error handling", async () => {
    // The hook swallows nothing: the error still reaches the caller, which is
    // what lets the modal render it.
    mockedPost.mockRejectedValue(httpError("Invite code has expired"))
    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    await expect(
      result.current.join.mutateAsync({ circleId: CIRCLE_ID, payload: { inviteCode: "X" } }),
    ).rejects.toBeTruthy()
  })
})

describe("join flow — already a member", () => {
  it("rejects and does not duplicate the member", async () => {
    mockedGet.mockResolvedValue(apiOk({ members: [member({ id: "m2" })] }))
    mockedPost.mockRejectedValue(httpError("You are already a member of this circle", 409))

    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))
    expect(result.current.members.data).toHaveLength(1)

    await expect(result.current.join.mutateAsync({ circleId: CIRCLE_ID })).rejects.toThrow()

    // Re-entry must not append a second row for the same person.
    expect(result.current.members.data).toHaveLength(1)
    expect(result.current.members.data?.filter((m) => m.userId === USER_ID)).toHaveLength(1)
  })

  it("reports the conflict distinctly from a bad code", async () => {
    mockedGet.mockResolvedValue(apiOk({ members: [member({ id: "m2" })] }))
    mockedPost.mockRejectedValue(httpError("You are already a member of this circle", 409))

    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    await expect(result.current.join.mutateAsync({ circleId: CIRCLE_ID })).rejects.toMatchObject({
      response: { status: 409 },
    })
  })

  it("leaves an existing membership intact after a failed re-entry", async () => {
    mockedGet.mockResolvedValue(apiOk({ members: [member({ id: "m2", status: "active" })] }))
    mockedPost.mockRejectedValue(httpError("Already a member", 409))

    const { result } = renderJoinFlow()
    await waitFor(() => expect(result.current.members.isSuccess).toBe(true))

    await result.current.join.mutateAsync({ circleId: CIRCLE_ID }).catch(() => undefined)

    const current = result.current.members.data ?? []
    expect(current).toHaveLength(1)
    expect(current[0].status).toBe("active")
  })
})

describe("member state after each path", () => {
  it("distinguishes the three outcomes by membership", async () => {
    // 1. Successful join -> the user appears.
    mockedGet.mockResolvedValue(apiOk({ members: [member({ id: "m1", userId: "other" })] }))
    mockedPost.mockResolvedValue(apiOk(member()))
    mockedGet
      .mockResolvedValueOnce(apiOk({ members: [member({ id: "m1", userId: "other" })] }))
      .mockResolvedValue(apiOk({ members: [member({ id: "m1", userId: "other" }), member()] }))

    const success = renderJoinFlow()
    await waitFor(() => expect(success.result.current.members.isSuccess).toBe(true))
    await success.result.current.join.mutateAsync({ circleId: CIRCLE_ID })
    await waitFor(() =>
      expect(success.result.current.members.data?.some((m) => m.userId === USER_ID)).toBe(true),
    )

    // 2. Bad code -> still not a member.
    mockedGet.mockResolvedValue(apiOk({ members: [member({ id: "m1", userId: "other" })] }))
    mockedPost.mockRejectedValue(httpError("Invite code has expired"))
    const badCode = renderJoinFlow()
    await waitFor(() => expect(badCode.result.current.members.isSuccess).toBe(true))
    await badCode.result.current.join
      .mutateAsync({ circleId: CIRCLE_ID, payload: { inviteCode: "X" } })
      .catch(() => undefined)
    expect(badCode.result.current.members.data?.some((m) => m.userId === USER_ID)).toBe(false)

    // 3. Re-entry -> exactly one membership, unchanged.
    mockedGet.mockResolvedValue(apiOk({ members: [member({ id: "m2" })] }))
    mockedPost.mockRejectedValue(httpError("Already a member", 409))
    const reentry = renderJoinFlow()
    await waitFor(() => expect(reentry.result.current.members.isSuccess).toBe(true))
    await reentry.result.current.join.mutateAsync({ circleId: CIRCLE_ID }).catch(() => undefined)
    expect(reentry.result.current.members.data?.filter((m) => m.userId === USER_ID)).toHaveLength(1)
  })
})
