// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

function makeJwt(exp?: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", exp: exp ?? Math.floor(Date.now() / 1000) + 3600 })
  ).toString("base64url")
  return `${header}.${payload}.sig`
}

const VALID_TOKEN = makeJwt()

const mockFetch = vi.fn()
global.fetch = mockFetch

function makeRefreshRequest(refreshToken?: string) {
  const headers: Record<string, string> = {}
  if (refreshToken) {
    headers["Cookie"] = `moistello_refresh=${refreshToken}`
  }
  return new NextRequest("http://localhost/api/auth/refresh", {
    method: "POST",
    headers,
  })
}

import { POST as refreshPOST } from "./route"

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when no refresh token cookie is present", async () => {
    const req = makeRefreshRequest()
    const res = await refreshPOST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/refresh token/i)
  })

  it("returns 502 when upstream API is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network connection error"))
    const req = makeRefreshRequest("valid-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toMatch(/reach|service/i)
  })

  it("returns 401 when upstream returns non-ok status", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "expired" }), { status: 401 })
    )
    const req = makeRefreshRequest("valid-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Refresh failed")
  })

  it("returns 502 when upstream response has no token", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 })
    )
    const req = makeRefreshRequest("valid-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toBe("No token in refresh response")
  })

  it("returns 502 when upstream token is empty string or not string", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "" }), { status: 200 })
    )
    const req = makeRefreshRequest("valid-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(502)
  })

  it("returns 200 and sets access-token cookie when upstream succeeds", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: VALID_TOKEN }), { status: 200 })
    )
    const req = makeRefreshRequest("valid-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBe(VALID_TOKEN)

    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_token")
  })

  it("accepts token nested under data.token", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { token: VALID_TOKEN } }), { status: 200 })
    )
    const req = makeRefreshRequest("valid-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBe(VALID_TOKEN)
  })

  it("rotates refresh token when upstream returns a new one at root", async () => {
    const newRefresh = "new-refresh-token-123"
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: VALID_TOKEN, refreshToken: newRefresh }), { status: 200 })
    )
    const req = makeRefreshRequest("old-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(200)

    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_refresh")
    expect(setCookieHeader).toContain(newRefresh)
  })

  it("rotates refresh token when upstream returns a new one under data.refreshToken", async () => {
    const newRefresh = "nested-refresh-token-456"
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { token: VALID_TOKEN, refreshToken: newRefresh } }), { status: 200 })
    )
    const req = makeRefreshRequest("old-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(200)

    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_refresh")
    expect(setCookieHeader).toContain(newRefresh)
  })
})
