import { afterEach, describe, expect, it, vi } from "vitest"

// The cookie names depend on NODE_ENV at import time, so each test loads a
// fresh copy of the module after setting the environment it needs.
async function loadSessionCookies() {
  vi.resetModules()
  return import("../session-cookies")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("session cookie names", () => {
  it("uses unprefixed names outside production", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const cookies = await loadSessionCookies()

    expect(cookies.ACCESS_TOKEN_COOKIE).toBe("moistello_token")
    expect(cookies.REFRESH_TOKEN_COOKIE).toBe("moistello_refresh")
    expect(cookies.CSRF_TOKEN_COOKIE).toBe("moistello_csrf")
  })

  it("uses __Host- prefixed names in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const cookies = await loadSessionCookies()

    expect(cookies.ACCESS_TOKEN_COOKIE).toBe("__Host-moistello_token")
    expect(cookies.REFRESH_TOKEN_COOKIE).toBe("__Host-moistello_refresh")
    expect(cookies.CSRF_TOKEN_COOKIE).toBe("__Host-moistello_csrf")
  })

  it("never lets a current cookie share a name with a legacy script-readable one in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const cookies = await loadSessionCookies()
    const current = [
      cookies.ACCESS_TOKEN_COOKIE,
      cookies.REFRESH_TOKEN_COOKIE,
      cookies.CSRF_TOKEN_COOKIE,
    ]

    for (const legacy of cookies.LEGACY_TOKEN_COOKIES) {
      expect(current).not.toContain(legacy)
    }
  })

  it("lists the legacy cookies that logout must clear", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const cookies = await loadSessionCookies()

    expect(cookies.LEGACY_TOKEN_COOKIES).toEqual([
      "moistello_token",
      "moistello_refresh",
    ])
  })
})

describe("session cookie options", () => {
  it("is HttpOnly, SameSite=Lax and scoped to the whole site in every environment", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const cookies = await loadSessionCookies()

    expect(cookies.SESSION_COOKIE_OPTIONS).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
  })

  it("does not mark cookies Secure outside production, so plain http:// dev still works", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const cookies = await loadSessionCookies()

    expect(cookies.SESSION_COOKIE_OPTIONS.secure).toBe(false)
  })

  it("marks cookies Secure in production, as the __Host- prefix requires", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const cookies = await loadSessionCookies()

    expect(cookies.SESSION_COOKIE_OPTIONS.secure).toBe(true)
  })
})

describe("session cookie lifetimes", () => {
  it("keeps the access token for 24 hours and the refresh token for 7 days", async () => {
    const cookies = await loadSessionCookies()

    expect(cookies.ACCESS_TOKEN_MAX_AGE).toBe(60 * 60 * 24)
    expect(cookies.REFRESH_TOKEN_MAX_AGE).toBe(60 * 60 * 24 * 7)
  })

  it("expires the CSRF token together with the refresh token", async () => {
    const cookies = await loadSessionCookies()

    expect(cookies.CSRF_TOKEN_MAX_AGE).toBe(cookies.REFRESH_TOKEN_MAX_AGE)
  })
})
