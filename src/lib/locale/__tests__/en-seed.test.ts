import { describe, expect, it } from "vitest"
import { EN_SEED } from "../en-seed"

describe("EN_SEED", () => {
  it("is a plain object with string values", () => {
    expect(typeof EN_SEED).toBe("object")
    for (const value of Object.values(EN_SEED)) {
      expect(typeof value).toBe("string")
    }
  })

  it("contains the most critical common keys", () => {
    const criticalKeys = [
      "common.loading",
      "common.error",
      "common.retry",
      "common.cancel",
      "common.save",
      "common.confirm",
    ]
    for (const key of criticalKeys) {
      expect(EN_SEED).toHaveProperty(key)
      expect(EN_SEED[key].length).toBeGreaterThan(0)
    }
  })

  it("contains primary navigation keys", () => {
    const navKeys = [
      "nav.wallet",
      "nav.circles",
      "nav.dashboard",
      "nav.settings",
    ]
    for (const key of navKeys) {
      expect(EN_SEED).toHaveProperty(key)
    }
  })

  it("contains the auth sign-in button key", () => {
    expect(EN_SEED["auth.login.signInButton"]).toBe("Sign in with Passkey")
  })

  it("contains landing page keys", () => {
    expect(EN_SEED).toHaveProperty("landing.launchApp")
    expect(EN_SEED).toHaveProperty("landing.howItWorks")
  })

  it("has no empty string values", () => {
    for (const [key, value] of Object.entries(EN_SEED)) {
      expect(value, `EN_SEED["${key}"] should not be empty`).not.toBe("")
    }
  })

  it("uses dot-separated namespaced keys", () => {
    for (const key of Object.keys(EN_SEED)) {
      expect(key).toMatch(/^[a-z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9.]*$/)
    }
  })
})
