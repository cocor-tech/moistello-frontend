import React from "react"
import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { SessionTimeoutBanner } from "../session-timeout-banner"

const mockState = {
  tokenExpiresAt: null as number | null,
  isAuthenticated: false,
}

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}))

describe("SessionTimeoutBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockState.tokenExpiresAt = null
    mockState.isAuthenticated = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null when user is not authenticated", () => {
    mockState.isAuthenticated = false
    mockState.tokenExpiresAt = Date.now() + 60 * 1000

    const { container } = render(<SessionTimeoutBanner />)
    expect(container.firstChild).toBeNull()
  })

  it("returns null when tokenExpiresAt is not set", () => {
    mockState.isAuthenticated = true
    mockState.tokenExpiresAt = null

    const { container } = render(<SessionTimeoutBanner />)
    expect(container.firstChild).toBeNull()
  })

  it("returns null when timeLeft is greater than 300 seconds (5 minutes)", () => {
    mockState.isAuthenticated = true
    mockState.tokenExpiresAt = Date.now() + 600 * 1000 // 10 minutes

    const { container } = render(<SessionTimeoutBanner />)
    expect(container.firstChild).toBeNull()
  })

  it("renders countdown status warning when session expires within 5 minutes", () => {
    mockState.isAuthenticated = true
    // 2 minutes and 15 seconds remaining = 135 seconds
    mockState.tokenExpiresAt = Date.now() + 135 * 1000

    render(<SessionTimeoutBanner />)

    const status = screen.getByRole("status")
    expect(status).toBeInTheDocument()
    expect(screen.getByText("Session expires in 2:15")).toBeInTheDocument()
  })

  it("renders expired session alert when timeLeft reaches 0 or less", () => {
    mockState.isAuthenticated = true
    mockState.tokenExpiresAt = Date.now() - 5000 // already expired

    render(<SessionTimeoutBanner />)

    const alert = screen.getByRole("alert")
    expect(alert).toBeInTheDocument()
    expect(
      screen.getByText("Session expired. Please sign in again.")
    ).toBeInTheDocument()
  })

  it("updates countdown timer interval periodically", () => {
    mockState.isAuthenticated = true
    const now = Date.now()
    mockState.tokenExpiresAt = now + 120 * 1000 // 2:00 remaining

    render(<SessionTimeoutBanner />)

    expect(screen.getByText("Session expires in 2:00")).toBeInTheDocument()

    // Advance by 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByText("Session expires in 1:50")).toBeInTheDocument()
  })
})
