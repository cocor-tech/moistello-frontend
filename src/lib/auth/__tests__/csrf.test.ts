import { afterEach, describe, expect, it } from "vitest"
import { getCsrfHeaders, getCsrfToken } from "../csrf"

afterEach(() => {
  document.cookie = "moistello_csrf=; Max-Age=0; path=/"
  document.querySelector('meta[name="csrf-token"]')?.remove()
})

describe("CSRF token helper", () => {
  it("prefers the current cookie over a stale page meta tag", () => {
    const meta = document.createElement("meta")
    meta.name = "csrf-token"
    meta.content = "stale-token"
    document.head.appendChild(meta)
    document.cookie = "moistello_csrf=rotated-token; path=/"

    expect(getCsrfToken()).toBe("rotated-token")
    expect(getCsrfHeaders()).toEqual({ "X-CSRF-Token": "rotated-token" })
  })

  it("falls back to the page token when no cookie is readable", () => {
    const meta = document.createElement("meta")
    meta.name = "csrf-token"
    meta.content = "page-token"
    document.head.appendChild(meta)

    expect(getCsrfToken()).toBe("page-token")
  })
})
