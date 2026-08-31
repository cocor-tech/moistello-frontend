/**
 * auth-session-routes.test.ts
 *
 * Route-level tests for:
 *   POST /api/auth/refresh  — exchange refresh token for new access token
 *   GET  /api/auth/session  — rehydrate session from HttpOnly cookie
 *   POST /api/auth/session  — store new token pair
 *   DELETE /api/auth/session — clear session cookies (logout)
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { NextRequest } from "next/server"

// ── JWT test tokens ──────────────────────────────────────────────────────────

function makeJwt(exp?: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", exp: exp ?? Math.floor(Date.now() / 1000) + 3600 })
  ).toString("base64url")
  return `${header}.${payload}.sig`
}

const VALID_TOKEN = makeJwt()
const EXPIRED_TOKEN = makeJwt(Math.floor(Date.now() / 1000) - 100)

// ── Fetch mock — set up once, reassign per test ──────────────────────────────
// We don't use vi.resetModules() here because that would require re-importing
// routes on every test, and the route reads global.fetch at call-time (not
// module-import-time), so a single module import + per-test mock reassignment
// is sufficient.

const mockFetch = vi.fn()
global.fetch = mockFetch

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown, url = "http://localhost/api") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeBadJsonRequest(url = "http://localhost/api") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{{bad",
  })
}

function makeGetRequest(cookieValue?: string) {
  const headers: Record<string, string> = {}
  if (cookieValue) {
    // The cookie name in non-production is "moistello_token" (no __Host- prefix)
    headers["Cookie"] = `moistello_token=${cookieValue}`
  }
  return new NextRequest("http://localhost/api/auth/session", {
    method: "GET",
    headers,
  })
}

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

// ── Import routes once (no vi.resetModules — fetch is captured at call time) ─

import { POST as refreshPOST } from "@/app/api/auth/refresh/route"
import {
  GET as sessionGET,
  POST as sessionPOST,
  DELETE as sessionDELETE,
} from "@/app/api/auth/session/route"

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------

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
    mockFetch.mockRejectedValueOnce(new Error("Network error"))
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
  })

  it("returns 502 when upstream response has no token", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 })
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

  it("rotates refresh token when upstream returns a new one", async () => {
    const newRefresh = "new-refresh-token-xyz"
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: VALID_TOKEN, refreshToken: newRefresh }), { status: 200 })
    )
    const req = makeRefreshRequest("old-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(200)
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_refresh")
  })

  it("accepts token nested under data.token", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { token: VALID_TOKEN } }), { status: 200 })
    )
    const req = makeRefreshRequest("valid-refresh-token")
    const res = await refreshPOST(req)
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// GET /api/auth/session
// ---------------------------------------------------------------------------

describe("GET /api/auth/session", () => {
  it("returns 401 when no access token cookie is present", async () => {
    const res = await sessionGET(makeGetRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.authenticated).toBe(false)
  })

  it("returns 401 for an expired token", async () => {
    const res = await sessionGET(makeGetRequest(EXPIRED_TOKEN))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.authenticated).toBe(false)
  })

  it("returns 200 with token for a valid non-expired token", async () => {
    const res = await sessionGET(makeGetRequest(VALID_TOKEN))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.authenticated).toBe(true)
    expect(json.token).toBe(VALID_TOKEN)
  })

  it("returns expiresAt when token has exp claim", async () => {
    const res = await sessionGET(makeGetRequest(VALID_TOKEN))
    const json = await res.json()
    expect(typeof json.expiresAt).toBe("number")
    expect(json.expiresAt).toBeGreaterThan(Date.now())
  })
})

// ---------------------------------------------------------------------------
// POST /api/auth/session
// ---------------------------------------------------------------------------

describe("POST /api/auth/session", () => {
  it("returns 400 when body is malformed JSON", async () => {
    const res = await sessionPOST(makeBadJsonRequest())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("returns 400 when token is missing", async () => {
    const res = await sessionPOST(makePostRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/token/i)
  })

  it("returns 400 when token is not a string", async () => {
    const res = await sessionPOST(makePostRequest({ token: 42 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when token is empty string", async () => {
    const res = await sessionPOST(makePostRequest({ token: "" }))
    expect(res.status).toBe(400)
  })

  it("returns 200 and sets access-token cookie for valid token", async () => {
    const res = await sessionPOST(makePostRequest({ token: VALID_TOKEN }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_token")
  })

  it("sets CSRF cookie on successful POST", async () => {
    const res = await sessionPOST(makePostRequest({ token: VALID_TOKEN }))
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_csrf")
  })

  it("stores refresh token when provided", async () => {
    const res = await sessionPOST(
      makePostRequest({ token: VALID_TOKEN, refreshToken: "refresh-abc" })
    )
    expect(res.status).toBe(200)
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_refresh")
  })

  it("does not crash when refreshToken is absent", async () => {
    const res = await sessionPOST(makePostRequest({ token: VALID_TOKEN }))
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/auth/session
// ---------------------------------------------------------------------------

describe("DELETE /api/auth/session", () => {
  it("returns 200 on logout", async () => {
    const res = await sessionDELETE()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("clears access token cookie (maxAge=0)", async () => {
    const res = await sessionDELETE()
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_token")
    expect(setCookieHeader).toContain("Max-Age=0")
  })

  it("clears refresh token cookie (maxAge=0)", async () => {
    const res = await sessionDELETE()
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_refresh")
  })

  it("clears CSRF cookie", async () => {
    const res = await sessionDELETE()
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_csrf")
  })

  it("is idempotent — can be called multiple times safely", async () => {
    const r1 = await sessionDELETE()
    const r2 = await sessionDELETE()
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
  })
})
