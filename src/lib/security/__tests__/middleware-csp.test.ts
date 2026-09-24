// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { middleware } from "@/middleware"
import { API_CSP } from "@/lib/security/api-csp.mjs"
import { CSRF_TOKEN_COOKIE } from "@/lib/auth/session-cookies"

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`)
}

function cspHeader(response: Response): string | undefined {
  return response.headers.get("Content-Security-Policy") ?? undefined
}

describe("middleware – CSP selection", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("serves the nonce-based page CSP for HTML routes", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = middleware(makeRequest("/circles"))
    const csp = cspHeader(res)
    expect(csp).toBeDefined()
    expect(csp).toContain("'nonce-")
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it("keeps 'unsafe-eval' out of the production page policy", () => {
    vi.stubEnv("NODE_ENV", "production")
    const csp = cspHeader(middleware(makeRequest("/"))) ?? ""
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).toContain("'wasm-unsafe-eval'")
  })

  it("serves the static API policy for API routes", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = middleware(makeRequest("/api/auth/session"))
    expect(cspHeader(res)).toBe(API_CSP)
  })

  it("API responses never carry page-script allowances", () => {
    vi.stubEnv("NODE_ENV", "production")
    const csp = cspHeader(middleware(makeRequest("/api/wallet/hmac/key"))) ?? ""
    expect(csp).not.toContain("nonce-")
    expect(csp).not.toContain("strict-dynamic")
    expect(csp).not.toContain("unsafe-eval")
    expect(csp).not.toContain("unsafe-inline")
  })

  it("allows same-origin beacon-style telemetry posts without the session CSRF handshake", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = middleware(new NextRequest("http://localhost/api/logs", {
      method: "POST",
      headers: { origin: "http://localhost" },
    }))
    expect(res.status).toBe(200)
    expect(cspHeader(res)).toBe(API_CSP)
  })

  it("allows the local upload origin with a matching CSRF token", () => {
    vi.stubEnv("NODE_ENV", "development")
    const token = "local-csrf-token"
    const request = new NextRequest("http://localhost:1110/api/upload", {
      method: "POST",
      headers: {
        origin: "http://localhost:1110",
        "x-csrf-token": token,
        cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
      },
    })

    expect(middleware(request).status).toBe(200)
  })

  it("rejects cross-origin telemetry posts", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = middleware(new NextRequest("http://localhost/api/logs", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    }))
    expect(res.status).toBe(403)
  })

  it("protected-page redirects still carry the page CSP", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = middleware(makeRequest("/settings"))
    expect(res.status).toBe(307)
    const csp = cspHeader(res)
    expect(csp).toContain("'nonce-")
  })
})