import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

/**
 * Regression tests for the not-found boundaries (#471).
 *
 * The root `not-found.tsx` used to call `notFound()` inside its own body. That
 * throws `NEXT_HTTP_ERROR_FALLBACK;404` back into the very boundary being
 * rendered, so the JSX below it was unreachable in production — the page looked
 * fine in review and threw in a browser.
 *
 * `notFound` is mocked to *throw* here, the way Next does, so a reintroduced
 * self-call fails the test instead of being silently swallowed.
 */
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404")
  },
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockHistoryBack = vi.fn()

function renderRoot() {
  vi.resetModules()
  return import("./not-found").then((m) => m.default)
}

describe("root not-found boundary", () => {
  it("renders its content instead of calling notFound() on itself", async () => {
    // If the component still called notFound(), this import would throw.
    const NotFound = await renderRoot()
    render(<NotFound />)

    expect(screen.getByRole("heading", { name: /404/ })).toBeInTheDocument()
    expect(screen.getByText(/this route ends here/i)).toBeInTheDocument()
  })

  it("offers working navigation out of the dead end", async () => {
    const NotFound = await renderRoot()
    render(<NotFound />)

    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: /browse docs/i })).toHaveAttribute("href", "/docs")
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument()
  })

  it("exposes the go-back control as a button, not a link", async () => {
    const NotFound = await renderRoot()
    render(<NotFound />)

    // A history.back() in an <a> would navigate instead of going back in-place.
    expect(screen.getByRole("button", { name: /go back/i }).tagName).toBe("BUTTON")
  })

  it("has exactly one level-1 heading so the page outline stays valid", async () => {
    const NotFound = await renderRoot()
    render(<NotFound />)

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})

describe("go-back button", () => {
  it("delegates to history.back when activated", async () => {
    const { GoBackButton } = await import("@/components/shared/go-back-button")

    const original = window.history.back
    window.history.back = mockHistoryBack
    try {
      render(<GoBackButton />)
      screen.getByRole("button", { name: /go back/i }).click()
      expect(mockHistoryBack).toHaveBeenCalledTimes(1)
    } finally {
      window.history.back = original
      mockHistoryBack.mockClear()
    }
  })

  it("accepts a custom label", async () => {
    const { GoBackButton } = await import("@/components/shared/go-back-button")
    render(<GoBackButton label="Return to circles" />)
    expect(screen.getByRole("button", { name: /return to circles/i })).toBeInTheDocument()
  })
})
