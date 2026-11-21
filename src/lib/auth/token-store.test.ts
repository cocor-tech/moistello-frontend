import { beforeEach, describe, expect, it } from "vitest"
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-store"

describe("token-store", () => {
  beforeEach(() => {
    clearAccessToken()
  })

  it("returns null before any token is set", () => {
    expect(getAccessToken()).toBeNull()
  })

  it("returns the token that was set", () => {
    setAccessToken("tok-abc")

    expect(getAccessToken()).toBe("tok-abc")
  })

  it("replaces an existing token on a second set", () => {
    setAccessToken("tok-1")
    setAccessToken("tok-2")

    expect(getAccessToken()).toBe("tok-2")
  })

  it("clears the token when set to null", () => {
    setAccessToken("tok-abc")
    setAccessToken(null)

    expect(getAccessToken()).toBeNull()
  })

  it("clearAccessToken() removes the stored token", () => {
    setAccessToken("tok-abc")
    clearAccessToken()

    expect(getAccessToken()).toBeNull()
  })

  it("does not persist the token to localStorage or sessionStorage", () => {
    setAccessToken("tok-abc")

    expect(Object.keys(localStorage)).not.toContain("tok-abc")
    expect(Object.values(localStorage)).not.toContain("tok-abc")
    expect(Object.values(sessionStorage)).not.toContain("tok-abc")
  })
})
