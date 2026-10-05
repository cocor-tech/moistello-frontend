// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

/**
 * The route is tested with the auth guard and the backend fetch as the only
 * seams. `requireAuthenticatedUser` and `checkRateLimit` are the two things that
 * decide *whether* and *whose*, so both are asserted directly rather than
 * inferred from a status code.
 */
const mockRequireAuth = vi.fn()
const mockCheckRateLimit = vi.fn()

vi.mock("@/lib/passkey/auth-guard", () => ({
  requireAuthenticatedUser: (req: NextRequest) => mockRequireAuth(req),
  checkRateLimit: (req: NextRequest, endpoint: string, limit?: number, window?: number) =>
    mockCheckRateLimit(req, endpoint, limit, window),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

const fetchMock = vi.fn()

function makeRequest(ip = "203.0.113.9") {
  return new NextRequest("http://localhost/api/export", {
    method: "GET",
    headers: { "x-forwarded-for": ip, cookie: "moistello_session=token-123" },
  })
}

function allowAuth(userId = "user-alice") {
  mockRequireAuth.mockReturnValue({ ok: true, user: { id: userId, username: "alice" } })
}

function allowRateLimit() {
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 60_000 })
}

/** Queues one backend response per path, in call order. */
function backend(...payloads: unknown[]) {
  for (const payload of payloads) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: payload }),
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Re-stub on every test: `unstubAllGlobals` in an afterEach would otherwise
  // leave later tests hitting the real `fetch`, so they would pass for the
  // wrong reason (a failed request degrades to an empty archive, which is 200).
  vi.stubGlobal("fetch", fetchMock)
  allowAuth()
  allowRateLimit()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GET /api/export — authentication", () => {
  it("returns 401 when there is no session", async () => {
    mockRequireAuth.mockReturnValue({
      ok: false,
      response: Response.json({ error: "unauthenticated" }, { status: 401 }),
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
  })

  it("does not call the backend for an unauthenticated request", async () => {
    mockRequireAuth.mockReturnValue({
      ok: false,
      response: Response.json({ error: "unauthenticated" }, { status: 401 }),
    })

    await GET(makeRequest())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("takes the subject from the session, never from the request", async () => {
    backend([], [])
    const body = await (await GET(makeRequest())).json()

    // The subject is the authenticated id. This route accepts no userId query
    // parameter or body field, so there is nothing to tamper with.
    expect(body.subject.userId).toBe("user-alice")
  })
})

describe("GET /api/export — rate limiting", () => {
  it("returns 429 with Retry-After when over the limit", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 30_000 })

    const response = await GET(makeRequest())

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("30")
  })

  it("advertises the limit in the 429 response", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 5_000 })
    const response = await GET(makeRequest())

    expect(response.headers.get("X-RateLimit-Limit")).toBe("3")
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0")
  })

  it("does not hit the backend when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 1_000 })
    await GET(makeRequest())

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rate limits on its own endpoint name, not a shared bucket", async () => {
    backend([], [])
    await GET(makeRequest())

    const [, endpoint] = mockCheckRateLimit.mock.calls[0]
    expect(endpoint).toBe("personal-data-export")
  })
})

describe("GET /api/export — archive contents", () => {
  it("returns 200 with a JSON attachment", async () => {
    backend([], [])

    const response = await GET(makeRequest())
    expect(fetchMock).toHaveBeenCalledTimes(2)

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("application/json")
    expect(response.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="moistello-data-user-alice-\d{4}-\d{2}-\d{2}\.json"/,
    )
  })

  it("is not cached", async () => {
    backend([], [])
    const response = await GET(makeRequest())

    // A cached export would serve one user's archive to the next request.
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it("forwards the session cookie to the backend so it can scope the query", async () => {
    backend([], [])
    await GET(makeRequest())

    // Both backend calls must carry a well-formed Cookie header, i.e. name=value.
    for (const call of fetchMock.mock.calls) {
      const init = call[1] as { headers: Record<string, string> }
      expect(init.headers.cookie).toBe("moistello_session=token-123")
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("excludes other users' records even if the backend returns them", async () => {
    backend(
      [
        { id: "c1", userId: "user-alice", amount: 100, circleId: "x", roundNumber: 1, status: "confirmed", onTime: true, createdAt: "" },
        { id: "c2", userId: "user-bob", amount: 999, circleId: "x", roundNumber: 1, status: "confirmed", onTime: true, createdAt: "" },
      ],
      [{ id: "n1", userId: "user-alice" }, { id: "n2", userId: "user-bob" }],
    )

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(body.contributions).toHaveLength(1)
    expect(body.contributions[0].id).toBe("c1")
    expect(body.notifications).toHaveLength(1)
    expect(JSON.stringify(body)).not.toContain("user-bob")
  })

  it("identifies whose data the file is", async () => {
    backend([], [])
    const body = await (await GET(makeRequest())).json()

    expect(body.subject).toEqual({ userId: "user-alice" })
    expect(body.profile.id).toBe("user-alice")
  })

  it("returns an empty but valid archive when the backend has nothing", async () => {
    backend([], [])

    const body = await (await GET(makeRequest())).json()

    expect(body.counts).toEqual({ contributions: 0, notifications: 0 })
    expect(Array.isArray(body.contributions)).toBe(true)
  })

  it("degrades to a partial export when the backend is down", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))

    const response = await GET(makeRequest())
    const body = await response.json()

    // A partial file the user can act on beats a hard failure, and the counts
    // make the gap visible rather than silently implying "you have no data".
    expect(response.status).toBe(200)
    expect(body.counts).toEqual({ contributions: 0, notifications: 0 })
  })

  it("degrades when the backend returns a non-OK status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })

    const body = await (await GET(makeRequest())).json()
    expect(body.counts.contributions).toBe(0)
  })
})
