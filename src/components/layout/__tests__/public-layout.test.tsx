import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"
import { PublicLayout } from "../public-layout"
import { LocaleProvider } from "@/lib/locale/context"

let mockIsAuthenticated = false

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}))

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockDashboardLayout(props: { children: React.ReactNode }) {
      return <div data-testid="mock-dashboard-layout">{props.children}</div>
    }
  },
}))

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}))

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}))

describe("PublicLayout component (#611)", () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    vi.clearAllMocks()
  })

  it("renders public navigation and children when unauthenticated", () => {
    render(
      <LocaleProvider>
        <PublicLayout>
          <div data-testid="child-content">Landing Page Content</div>
        </PublicLayout>
      </LocaleProvider>
    )

    expect(screen.getByRole("link", { name: /skip to main content/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /moistello/i })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument()
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument()
    expect(screen.getByTestId("child-content")).toBeInTheDocument()
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument()
  })

  it("renders DashboardLayout when authenticated", () => {
    mockIsAuthenticated = true
    render(
      <LocaleProvider>
        <PublicLayout>
          <div data-testid="child-content">Dashboard Content</div>
        </PublicLayout>
      </LocaleProvider>
    )

    expect(screen.getByTestId("mock-dashboard-layout")).toBeInTheDocument()
    expect(screen.getByTestId("child-content")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /skip to main content/i })).not.toBeInTheDocument()
  })

  it("opens and closes mobile navigation menu on hamburger toggle", async () => {
    render(
      <LocaleProvider>
        <PublicLayout>
          <div>Body</div>
        </PublicLayout>
      </LocaleProvider>
    )

    const hamburgerBtn = screen.getByRole("button", { name: /open menu/i })
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false")

    // Open menu
    fireEvent.click(hamburgerBtn)
    expect(screen.getByRole("dialog", { name: /mobile navigation/i })).toBeInTheDocument()
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true")

    // Close menu via close button inside mobile menu
    const closeBtns = screen.getAllByRole("button", { name: /close menu/i })
    fireEvent.click(closeBtns[closeBtns.length - 1])

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false")
    })
  })

  it("closes mobile navigation when clicking on mobile menu link", async () => {
    render(
      <LocaleProvider>
        <PublicLayout>
          <div>Body</div>
        </PublicLayout>
      </LocaleProvider>
    )

    const hamburgerBtn = screen.getByRole("button", { name: /open menu/i })
    fireEvent.click(hamburgerBtn)

    const mobileNav = screen.getByRole("dialog", { name: /mobile navigation/i })
    expect(mobileNav).toBeInTheDocument()

    // Find links inside mobileNav
    const links = screen.getAllByRole("link", { name: /howItWorks|how it works/i })
    fireEvent.click(links[links.length - 1])

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false")
    })
  })
})
