import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"

const authState = {
  isAuthenticated: false,
  isLoading: false,
  token: null as string | null,
}

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}))

vi.mock("next/dynamic", () => ({
  default: (fn: () => unknown) => {
    const fnStr = fn.toString()
    if (fnStr.includes("public-layout")) {
      return ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="public-layout">{children}</div>
      )
    }
    if (fnStr.includes("landing-content")) {
      return () => <div data-testid="landing-content">Landing Content</div>
    }
    if (fnStr.includes("dashboard-layout")) {
      return ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="dashboard-layout">{children}</div>
      )
    }
    if (fnStr.includes("dashboard-content")) {
      return () => <div data-testid="dashboard-content">Dashboard Content</div>
    }
    return ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  },
}))

import { HomeContent } from "../home-content"

describe("HomeContent", () => {
  beforeEach(() => {
    authState.isAuthenticated = false
    authState.isLoading = false
    authState.token = null
  })

  it("renders DashboardLayout and DashboardContent when user is authenticated", () => {
    authState.isAuthenticated = true
    authState.isLoading = false

    render(<HomeContent />)

    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument()
    expect(screen.getByTestId("dashboard-content")).toBeInTheDocument()
    expect(screen.queryByTestId("public-layout")).toBeNull()
    expect(screen.queryByTestId("landing-content")).toBeNull()
  })

  it("renders PublicLayout and LandingContent when user is not authenticated and not loading", () => {
    authState.isAuthenticated = false
    authState.isLoading = false

    render(<HomeContent />)

    expect(screen.getByTestId("public-layout")).toBeInTheDocument()
    expect(screen.getByTestId("landing-content")).toBeInTheDocument()
    expect(screen.queryByTestId("dashboard-layout")).toBeNull()
    expect(screen.queryByTestId("dashboard-content")).toBeNull()
  })

  it("returns null while auth token exists and auth is resolving (isLoading=true)", () => {
    authState.token = "fake-jwt-token"
    authState.isLoading = true
    authState.isAuthenticated = false

    const { container } = render(<HomeContent />)

    expect(container.firstChild).toBeNull()
  })

  it("returns null while loading with no token", () => {
    authState.token = null
    authState.isLoading = true
    authState.isAuthenticated = false

    const { container } = render(<HomeContent />)

    expect(container.firstChild).toBeNull()
  })
})
