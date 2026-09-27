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

function reportOnlyHeader(response: Response): string | undefined {
  return response.headers.get("Content-Security-Policy-Report-Only") ?? undefined
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

// The mode switch is the whole point of CSP_REPORT_ONLY: staging ships a
// candidate policy that is observed rather than enforced, so a change that
// would break the app surfaces as collected violations instead of a blank
// widget. These tests pin the observable consequence of flipping the flag —
// which header carries the policy — rather than the internals, because the
// header name is the entire contract with the browser.
describe("middleware – report-only mode", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("serves the policy under the report-only header when the flag is on", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CSP_REPORT_ONLY", "true")

    const res = middleware(makeRequest("/"))
    const reportOnly = reportOnlyHeader(res)

    expect(reportOnly).toBeDefined()
    expect(reportOnly).toContain("'nonce-")
    // Nothing is enforced in this mode — that is the entire point. Leaving the
    // enforcing header on would make report-only a no-op that still blocks.
    expect(cspHeader(res)).toBeUndefined()
  })

  it("emits both reporting directives so every engine reports", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CSP_REPORT_ONLY", "true")

    const policy = reportOnlyHeader(middleware(makeRequest("/"))) ?? ""
    expect(policy).toContain("report-uri /api/csp-report")
    expect(policy).toContain("report-to csp-endpoint")
  })

  it("keeps the policy string otherwise identical to the enforced one", () => {
    vi.stubEnv("NODE_ENV", "production")

    // Two separate requests, so two separate nonces. Normalise the nonce and the
    // reporting directives out: what is left must match exactly, or report-only
    // is validating a policy nobody would actually deploy.
    const strip = (policy: string) =>
      policy
        .split("; ")
        .filter((part) => !part.startsWith("report-uri") && !part.startsWith("report-to"))
        .map((part) => part.replace(/'nonce-[^']+'/, "'nonce-<redacted>'"))
        .join("; ")

    const enforced = cspHeader(middleware(makeRequest("/"))) ?? ""
    vi.stubEnv("CSP_REPORT_ONLY", "true")
    const observed = reportOnlyHeader(middleware(makeRequest("/"))) ?? ""

    expect(strip(observed)).toBe(strip(enforced))
    expect(strip(enforced)).toContain("'nonce-<redacted>'")
  })

  it("does not put the policy in both headers at once", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CSP_REPORT_ONLY", "true")

    const res = middleware(makeRequest("/"))
    expect(cspHeader(res)).toBeUndefined()
    expect(reportOnlyHeader(res)).toBeDefined()
  })

  it("keeps the mode out of the enforcing policy when the flag is unset", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CSP_REPORT_ONLY", undefined)

    const csp = cspHeader(middleware(makeRequest("/"))) ?? ""
    expect(csp).not.toContain("report-uri")
    expect(csp).not.toContain("report-to")
  })

  // Fail-closed. A typo must not be able to leave production without
  // enforcement, and it must not be able to silently become report-only
  // either — both directions are silent failures, so both are pinned.
  it.each([
    ["a typo", "ture"],
    ["a negative value", "false"],
    ["zero", "0"],
    ["an empty string", ""],
    ["a stray word", "report"],
  ])("treats %s as enforce, not report-only", (_label, value) => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CSP_REPORT_ONLY", value)

    const res = middleware(makeRequest("/"))
    expect(cspHeader(res)).toBeDefined()
    expect(reportOnlyHeader(res)).toBeUndefined()
  })

  it.each(["1", "true", "yes", "on", "report-only", "TRUE", " on "])(
    "treats %j as report-only",
    (value) => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("CSP_REPORT_ONLY", value)

      const res = middleware(makeRequest("/"))
      expect(reportOnlyHeader(res)).toBeDefined()
      expect(cspHeader(res)).toBeUndefined()
    },
  )

  it("carries the mode across the unauthenticated bounce to /login", () => {
    // The login redirect is a separate response object with its own header
    // write, so it is the easiest place for a mode switch to be applied to one
    // path and forgotten on the other. A user landing on /settings is exactly
    // the journey where that drift would go unnoticed.
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CSP_REPORT_ONLY", "true")

    const res = middleware(makeRequest("/settings"))
    expect(res.status).toBe(307)
    expect(reportOnlyHeader(res)).toContain("report-uri")
    expect(cspHeader(res)).toBeUndefined()
  })

  it("leaves API responses enforcing even in report-only mode", () => {
    // next.config.mjs serves the static API policy under the enforcing header,
    // so renaming it here would leave every JSON response with two CSP headers
    // of different semantics — and would quietly stop enforcing it.
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CSP_REPORT_ONLY", "true")

    const res = middleware(makeRequest("/api/auth/session"))
    expect(cspHeader(res)).toBe(API_CSP)
    expect(reportOnlyHeader(res)).toBeUndefined()
  })
})

// The collector has to be reachable by the browser, and the browser cannot
// attach an x-csrf-token header to a report it generates itself. Without this
// carve-out every report 403s and the endpoint silently collects nothing.
describe("middleware – CSP report collection endpoint", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("accepts a browser-generated report with no CSRF token and no origin", () => {
    vi.stubEnv("NODE_ENV", "production")

    const res = middleware(new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/reports+json" },
    }))

    expect(res.status).toBe(200)
  })

  it("still rejects a report coming from a foreign origin", () => {
    vi.stubEnv("NODE_ENV", "production")

    const res = middleware(new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    }))

    expect(res.status).toBe(403)
  })

  it("keeps the CSRF gate closed for every other API route", () => {
    // Proves the carve-out is scoped to the collector rather than loosening the
    // general mutating-route rule.
    vi.stubEnv("NODE_ENV", "production")

    const res = middleware(new NextRequest("http://localhost/api/circles", {
      method: "POST",
      headers: { origin: "http://localhost" },
    }))

    expect(res.status).toBe(403)
  })

  it("serves the API policy on the report route, not the page policy", () => {
    vi.stubEnv("NODE_ENV", "production")

    const res = middleware(new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/reports+json" },
    }))

    expect(cspHeader(res)).toBe(API_CSP)
  })
})