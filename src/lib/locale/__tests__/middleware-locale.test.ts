// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { middleware } from "@/middleware"
import { ACCESS_TOKEN_COOKIE, CSRF_TOKEN_COOKIE } from "@/lib/auth/session-cookies"

/** The request header middleware forwards for the root layout to read. */
function forwardedLocale(response: Response): string | null {
  return response.headers.get("x-middleware-request-x-locale")
}

function request(pathname: string, cookie?: string) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: {
      ...(cookie ? { cookie } : {}),
      [CSRF_TOKEN_COOKIE]: "csrf",
    },
  })
}

describe("middleware – locale header", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("defaults to English when no locale has been chosen", () => {
    expect(forwardedLocale(middleware(request("/")))).toBe("en")
  })

  // This is the whole point: the cookie is what carries a public-page language
  // choice through the login redirect, since localStorage is invisible to the
  // server and a redirect drops every piece of client state.
  it("forwards the locale cookie so SSR can render the right language", () => {
    expect(forwardedLocale(middleware(request("/", "moistello_locale=fr")))).toBe("fr")
  })

  it("forwards a region-qualified code", () => {
    expect(forwardedLocale(middleware(request("/", "moistello_locale=pt-BR")))).toBe("pt-BR")
  })

  // The cookie is attacker-settable and lands in <html lang>, so an unvalidated
  // value must never be handed to the layout.
  it.each([
    ["markup", 'en"><script>alert(1)</script>'],
    ["a path traversal", "../../secret"],
    ["a URL", "https://evil.example"],
    ["an empty value", ""],
  ])("refuses to forward %s", (_label, value) => {
    const res = middleware(request("/", `moistello_locale=${encodeURIComponent(value)}`))
    expect(forwardedLocale(res)).toBe("en")
  })

  it("carries the locale across the unauthenticated bounce to /login", () => {
    // The reported bug: a public-page language is lost on the way through the
    // login redirect. Nothing about the bounce can carry client state, so the
    // cookie is the only thing that can — assert the leg that matters, which is
    // the request the browser actually makes for the login page.
    const bounce = middleware(request("/settings", "moistello_locale=fr"))
    expect(bounce.status).toBe(307)
    expect(bounce.headers.get("location")).toContain("/login")

    // The browser resends cookies on the follow-up request.
    expect(forwardedLocale(middleware(request("/login", "moistello_locale=fr")))).toBe("fr")
  })

  it("ignores the locale cookie when a session cookie is absent on an API route", () => {
    // API routes return JSON and never render a document, so the header is
    // irrelevant there; this just pins that the guard above still runs.
    const res = middleware(new NextRequest("http://localhost/api/auth/session", {
      headers: { cookie: `moistello_locale=fr; ${ACCESS_TOKEN_COOKIE}=t; ${CSRF_TOKEN_COOKIE}=c` },
    }))
    expect(res.status).toBe(200)
  })
})
