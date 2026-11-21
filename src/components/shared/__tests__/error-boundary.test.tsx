import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ErrorBoundary } from "../error-boundary"

function Boom(): never {
  throw new Error("boom")
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>safe content</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText("safe content")).toBeInTheDocument()
  })

  it("renders the fallback UI when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })
})
