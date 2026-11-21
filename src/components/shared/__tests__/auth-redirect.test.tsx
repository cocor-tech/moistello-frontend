import React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const replace = vi.fn()
const authState = { isAuthenticated: false, isLoading: false }

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}))

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}))

import { AuthRedirect } from "../auth-redirect"

describe("AuthRedirect", () => {
  beforeEach(() => {
    replace.mockClear()
    authState.isAuthenticated = false
    authState.isLoading = false
  })

  it("redirects an authenticated user to the home page and renders nothing", () => {
    authState.isAuthenticated = true

    const { container } = render(<AuthRedirect />)

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith("/")
    expect(container).toBeEmptyDOMElement()
  })

  it("does not redirect a signed-out user", () => {
    render(<AuthRedirect />)

    expect(replace).not.toHaveBeenCalled()
  })

  it("waits for the auth state to finish loading before redirecting", () => {
    authState.isAuthenticated = true
    authState.isLoading = true

    const { rerender } = render(<AuthRedirect />)
    expect(replace).not.toHaveBeenCalled()

    authState.isLoading = false
    rerender(<AuthRedirect />)
    expect(replace).toHaveBeenCalledWith("/")
  })
})
