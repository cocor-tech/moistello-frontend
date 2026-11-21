// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

function makeJwt(exp?: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", ...(exp !== undefined ? { exp } : {}) })
  ).toString("base64url")
  return `${header}.${payload}.sig`
}

const VALID_TOKEN = makeJwt(Math.floor(Date.now() / 1000) + 3600)
const EXPIRED_TOKEN = makeJwt(Math.floor(Date.now() / 1000) - 100)
const NO_EXP_TOKEN = makeJwt()

function makeGetRequest(cookieValue?: string) {
  const headers: Record<string, string> = {}
  if (cookieValue) {
    headers["Cookie"] = `moistello_token=${cookieValue}`
  }
  return new NextRequest("http://localhost/api/auth/session", {
    method: "GET",
    headers,
  })
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeBadJsonRequest() {
  return new NextRequest("http://localhost/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{{bad_json",
  })
}

import {
  GET as sessionGET,
  POST as sessionPOST,
  DELETE as sessionDELETE,
} from "./route"

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

  it("returns 200 with token and expiresAt for a valid non-expired token", async () => {
    const res = await sessionGET(makeGetRequest(VALID_TOKEN))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.authenticated).toBe(true)
    expect(json.token).toBe(VALID_TOKEN)
    expect(typeof json.expiresAt).toBe("number")
    expect(json.expiresAt).toBeGreaterThan(Date.now())
  })

  it("returns 200 with expiresAt as null when token has no exp claim", async () => {
    const res = await sessionGET(makeGetRequest(NO_EXP_TOKEN))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.authenticated).toBe(true)
    expect(json.token).toBe(NO_EXP_TOKEN)
    expect(json.expiresAt).toBeNull()
  })

  it("returns 200 with expiresAt as null for non-JWT token string", async () => {
    const res = await sessionGET(makeGetRequest("simple-opaque-token"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.authenticated).toBe(true)
    expect(json.token).toBe("simple-opaque-token")
    expect(json.expiresAt).toBeNull()
  })
})

describe("POST /api/auth/session", () => {
  it("returns 400 when body is malformed JSON", async () => {
    const res = await sessionPOST(makeBadJsonRequest())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid request body")
  })

  it("returns 400 when token is missing", async () => {
    const res = await sessionPOST(makePostRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Token required")
  })

  it("returns 400 when token is not a string", async () => {
    const res = await sessionPOST(makePostRequest({ token: 12345 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Token required")
  })

  it("returns 400 when token is an empty string", async () => {
    const res = await sessionPOST(makePostRequest({ token: "" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Token required")
  })

  it("returns 200 and sets access-token and csrf-token cookies", async () => {
    const res = await sessionPOST(makePostRequest({ token: VALID_TOKEN }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(typeof json.expiresAt).toBe("number")

    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_token")
    expect(setCookieHeader).toContain("moistello_csrf")
  })

  it("stores refresh token cookie when refreshToken is provided", async () => {
    const res = await sessionPOST(
      makePostRequest({ token: VALID_TOKEN, refreshToken: "my-refresh-token" })
    )
    expect(res.status).toBe(200)
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_refresh")
    expect(setCookieHeader).toContain("my-refresh-token")
  })

  it("does not set refresh token cookie when refreshToken is omitted or empty", async () => {
    const res = await sessionPOST(makePostRequest({ token: VALID_TOKEN }))
    expect(res.status).toBe(200)
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).not.toContain("moistello_refresh=")
  })
})

describe("DELETE /api/auth/session", () => {
  it("returns 200 and success: true on logout", async () => {
    const res = await sessionDELETE()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("clears access token, refresh token, and CSRF cookies (maxAge=0)", async () => {
    const res = await sessionDELETE()
    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain("moistello_token")
    expect(setCookieHeader).toContain("moistello_refresh")
    expect(setCookieHeader).toContain("moistello_csrf")
    expect(setCookieHeader).toContain("Max-Age=0")
  })

  it("is idempotent and safe to call multiple times", async () => {
    const r1 = await sessionDELETE()
    const r2 = await sessionDELETE()
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
  })
})
