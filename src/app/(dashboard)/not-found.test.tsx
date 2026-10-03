import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

/**
 * The dashboard-scoped 404 and error boundaries (#471).
 *
 * The point of a boundary *inside* the `(dashboard)` route group is that it
 * renders within `(dashboard)/layout.tsx`, so the app shell survives. These
 * tests pin the recovery affordances and the single-h1 outline rule.
 */
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    leftIcon,
  }: {
    children?: React.ReactNode
    onClick?: () => void
    leftIcon?: React.ReactNode
  }) => (
    <button type="button" onClick={onClick}>
      {leftIcon}
      {children}
    </button>
  ),
  ButtonLink: ({
    children,
    href,
    leftIcon,
  }: {
    children?: React.ReactNode
    href: string
    leftIcon?: React.ReactNode
  }) => (
    <a href={href}>
      {leftIcon}
      {children}
    </a>
  ),
}))

async function loadDashboardNotFound() {
  vi.resetModules()
  const mod = await import("./not-found")
  return mod.default
}

describe("dashboard not-found boundary", () => {
  it("renders the 404 code as a heading", async () => {
    const NotFound = await loadDashboardNotFound()
    render(<NotFound />)

    expect(screen.getByRole("heading", { name: /404/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
  })

  it("tells the user they are still signed in, so the shell is not a surprise", async () => {
    const NotFound = await loadDashboardNotFound()
    render(<NotFound />)

    expect(screen.getByText(/still signed in/i)).toBeInTheDocument()
  })

  it("exposes a labelled navigation landmark", async () => {
    const NotFound = await loadDashboardNotFound()
    render(<NotFound />)

    expect(screen.getByRole("navigation", { name: /recovery/i })).toBeInTheDocument()
  })

  it("links back to real destinations", async () => {
    const NotFound = await loadDashboardNotFound()
    render(<NotFound />)

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: /browse circles/i })).toHaveAttribute("href", "/circles")
    expect(screen.getByRole("link", { name: /browse docs/i })).toHaveAttribute("href", "/docs")
  })

  it("keeps a working go-back control", async () => {
    const NotFound = await loadDashboardNotFound()
    render(<NotFound />)

    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument()
  })
})

describe("dashboard error boundary", () => {
  async function loadErrorBoundary() {
    vi.resetModules()
    const mod = await import("./error")
    return mod.default
  }

  it("announces itself as an alert", async () => {
    const ErrorBoundary = await loadErrorBoundary()
    render(<ErrorBoundary error={new Error("boom")} reset={() => {}} />)

    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("reassures the user that the rest of the dashboard still works", async () => {
    const ErrorBoundary = await loadErrorBoundary()
    render(<ErrorBoundary error={new Error("boom")} reset={() => {}} />)

    expect(screen.getByText(/rest of your dashboard is still working/i)).toBeInTheDocument()
  })

  it("does not leak the raw error message to the user", async () => {
    const ErrorBoundary = await loadErrorBoundary()
    render(<ErrorBoundary error={new Error("DATABASE_PASSWORD=hunter2")} reset={() => {}} />)

    expect(screen.queryByText(/hunter2/)).toBeNull()
  })

  it("calls reset when retry is pressed", async () => {
    const ErrorBoundary = await loadErrorBoundary()
    const reset = vi.fn()

    render(<ErrorBoundary error={new Error("boom")} reset={reset} />)
    screen.getByRole("button", { name: /try again/i }).click()

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("offers a route out besides retrying", async () => {
    const ErrorBoundary = await loadErrorBoundary()
    render(<ErrorBoundary error={new Error("boom")} reset={() => {}} />)

    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: /contact support/i })).toHaveAttribute(
      "href",
      "/support",
    )
  })
})
