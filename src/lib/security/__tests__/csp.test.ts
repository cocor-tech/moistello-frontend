/**
 * Tests for src/lib/security/csp.ts
 *
 * Covers:
 *  - Nonces are unique per call and base64-shaped
 *  - The nonce is carried into script-src
 *  - Inline script execution is not blanket-allowed via 'unsafe-inline'
 *  - Third-party integrations the app depends on remain reachable
 *  - Dev-only relaxations stay out of the production policy
 */

import { describe, expect, it, vi, afterEach } from "vitest"
import { buildCsp, cspMode, generateNonce, CSP_REPORT_PATH, CSP_REPORTING_GROUP } from "../csp"

/** Pull a single directive's source list out of a serialised policy. */
function directive(policy: string, name: string): string | undefined {
  return policy
    .split("; ")
    .find((part) => part === name || part.startsWith(`${name} `))
}

describe("generateNonce", () => {
  it("produces a base64 value", () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
  })

  it("produces a different value on every call", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => generateNonce()))
    expect(nonces.size).toBe(50)
  })
})

describe("buildCsp", () => {
  const prod = buildCsp("test-nonce", false)

  it("carries the nonce in script-src", () => {
    expect(directive(prod, "script-src")).toContain("'nonce-test-nonce'")
  })

  it("never allows arbitrary inline scripts", () => {
    expect(directive(prod, "script-src")).not.toContain("'unsafe-inline'")
  })

  it("locks down the classic injection sinks", () => {
    expect(directive(prod, "object-src")).toBe("object-src 'none'")
    expect(directive(prod, "base-uri")).toBe("base-uri 'self'")
    expect(directive(prod, "form-action")).toBe("form-action 'self'")
    expect(directive(prod, "frame-ancestors")).toBe("frame-ancestors 'none'")
  })

  it("keeps the wallet, captcha and analytics integrations reachable", () => {
    const connect = directive(prod, "connect-src") ?? ""
    expect(connect).toContain("https://horizon.stellar.org")
    expect(connect).toContain("wss://*.walletconnect.com")
    expect(connect).toContain("https://*.hcaptcha.com")
    expect(connect).toContain("https://mc.yandex.ru")

    const frame = directive(prod, "frame-src") ?? ""
    expect(frame).toContain("https://challenges.cloudflare.com")
  })

  it("upgrades insecure requests in production only", () => {
    expect(prod).toContain("upgrade-insecure-requests")
    expect(buildCsp("test-nonce", true)).not.toContain("upgrade-insecure-requests")
  })

  it("permits eval for the dev server but not in production", () => {
    expect(directive(buildCsp("n", true), "script-src")).toContain("'unsafe-eval'")
    expect(directive(prod, "script-src")).not.toContain("'unsafe-eval'")
  })
})

// cspMode() is the single place the CSP_REPORT_ONLY env var is interpreted, and
// its failure direction matters more than its success path: an unrecognised
// value must fall back to ENFORCE. A report-only mode that fails open is
// indistinguishable from a working deployment right up until someone realises
// production has been unprotected for a week.
describe("cspMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(["1", "true", "TRUE", "yes", "on", "report-only", " on "])(
    "reads %j as report-only",
    (value) => {
      vi.stubEnv("CSP_REPORT_ONLY", value)
      expect(cspMode()).toBe("report-only")
    },
  )

  it.each([
    ["unset", undefined],
    ["false", "false"],
    ["zero", "0"],
    ["empty", ""],
    ["a typo", "ture"],
    ["a bare 'report'", "report"],
    ["an unrelated value", "enabled"],
  ])("reads %s as enforce", (_label, value) => {
    vi.stubEnv("CSP_REPORT_ONLY", value as string | undefined)
    expect(cspMode()).toBe("enforce")
  })

  it("is re-read per call so the mode is not frozen at module load", () => {
    // The middleware resolves the mode per request. If this were a module-level
    // constant the flag would be baked in at import time and the env stub in
    // every other test here would be meaningless.
    vi.stubEnv("CSP_REPORT_ONLY", "false")
    expect(cspMode()).toBe("enforce")

    vi.stubEnv("CSP_REPORT_ONLY", "true")
    expect(cspMode()).toBe("report-only")
  })
})

describe("buildCsp – reporting directives", () => {
  it("emits both report-uri and report-to in report-only mode", () => {
    const policy = buildCsp("test-nonce", false, "report-only")

    // Chrome/Safari honour report-uri; Firefox honours report-to. Emitting only
    // one silently loses violations on the other engine.
    expect(directive(policy, "report-uri")).toBe(`report-uri ${CSP_REPORT_PATH}`)
    expect(directive(policy, "report-to")).toBe(`report-to ${CSP_REPORTING_GROUP}`)
  })

  it("omits reporting directives in the enforced policy", () => {
    const policy = buildCsp("test-nonce", false, "enforce")

    expect(directive(policy, "report-uri")).toBeUndefined()
    expect(directive(policy, "report-to")).toBeUndefined()
  })

  it("changes nothing but the reporting directives between modes", () => {
    const strip = (policy: string) =>
      policy
        .split("; ")
        .filter((part) => !part.startsWith("report-uri") && !part.startsWith("report-to"))
        .join("; ")

    // If this drifts, report-only is validating a policy nobody would deploy.
    expect(strip(buildCsp("n", false, "report-only"))).toBe(strip(buildCsp("n", false, "enforce")))
  })

  it("points at the path the collector actually serves", () => {
    expect(CSP_REPORT_PATH).toBe("/api/csp-report")
  })
})
