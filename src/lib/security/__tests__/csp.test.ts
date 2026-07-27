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

import { describe, expect, it } from "vitest"
import { buildCsp, generateNonce } from "../csp"

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
