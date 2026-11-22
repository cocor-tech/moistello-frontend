import { render, screen, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardLayout } from "../dashboard-layout"

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/dashboard"),
}))

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}))

// Stub the heavy shell pieces; the layout is only responsible for wiring them together.
vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <aside data-testid="sidebar" />,
}))

vi.mock("@/components/layout/header", () => ({
  Header: ({
    onToggleMobileMenu,
    isMobileMenuOpen,
  }: {
    onToggleMobileMenu: () => void
    isMobileMenuOpen: boolean
  }) => (
    <button type="button" aria-expanded={isMobileMenuOpen} onClick={onToggleMobileMenu}>
      Toggle menu
    </button>
  ),
}))

vi.mock("@/components/layout/mobile-menu", () => ({
  MobileMenu: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="mobile-menu">
        <button type="button" onClick={onClose}>
          Close mobile menu
        </button>
      </div>
    ) : null,
}))

vi.mock("@/components/layout/mobile-nav", () => ({
  MobileNav: () => <nav data-testid="mobile-nav" />,
}))

vi.mock("@/components/shared/auto-breadcrumbs", () => ({
  AutoBreadcrumbs: () => <div data-testid="breadcrumbs" />,
}))

vi.mock("@/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: () => ({ shortcuts: [], helpOpen: false, closeHelp: vi.fn() }),
}))

// `next/dynamic` lazy-loads the palette and overlay; render inert placeholders instead.
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}))

describe("DashboardLayout", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/dashboard")
  })

  it("renders the page children inside the main landmark alongside the shell", () => {
    render(
      <DashboardLayout>
        <p>Dashboard content</p>
      </DashboardLayout>,
    )

    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("id", "main-content")
    expect(main).toContainElement(screen.getByText("Dashboard content"))
    expect(screen.getByTestId("sidebar")).toBeInTheDocument()
    expect(screen.getByTestId("mobile-nav")).toBeInTheDocument()
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument()
  })

  it("exposes a skip link that targets the main content", () => {
    render(
      <DashboardLayout>
        <p>Body</p>
      </DashboardLayout>,
    )

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    )
  })

  it("toggles the mobile menu from the header and closes it from the menu", () => {
    render(
      <DashboardLayout>
        <p>Body</p>
      </DashboardLayout>,
    )

    const toggle = screen.getByRole("button", { name: "Toggle menu" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByTestId("mobile-menu")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close mobile menu" }))
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument()
  })

  it("does not carry an open mobile menu over to a different route", () => {
    const { rerender } = render(
      <DashboardLayout>
        <p>Body</p>
      </DashboardLayout>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }))
    expect(screen.getByTestId("mobile-menu")).toBeInTheDocument()

    usePathnameMock.mockReturnValue("/wallet")
    rerender(
      <DashboardLayout>
        <p>Body</p>
      </DashboardLayout>,
    )

    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument()
  })
})
