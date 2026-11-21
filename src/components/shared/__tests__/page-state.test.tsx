import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { PageError, PageLoading, PageState } from "../page-state"

describe("PageLoading", () => {
  it("renders a busy status region with the default label", () => {
    render(<PageLoading />)

    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status).toHaveTextContent("Loading…")
  })

  it("renders custom children instead of the default spinner", () => {
    render(
      <PageLoading label="ignored">
        <p>Custom skeleton</p>
      </PageLoading>
    )

    expect(screen.getByText("Custom skeleton")).toBeInTheDocument()
    expect(screen.queryByText("ignored")).toBeNull()
  })
})

describe("PageError", () => {
  it("renders an assertive alert with a retry button that calls onRetry", () => {
    const onRetry = vi.fn()
    render(<PageError title="Circle failed" description="Network down" onRetry={onRetry} />)

    const alert = screen.getByRole("alert")
    expect(alert).toHaveAttribute("aria-live", "assertive")
    expect(alert).toHaveTextContent("Circle failed")
    expect(alert).toHaveTextContent("Network down")

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("omits the retry button when no onRetry is given", () => {
    render(<PageError />)

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load this page")
    expect(screen.queryByRole("button")).toBeNull()
  })
})

describe("PageState", () => {
  const base = { isLoading: false, isError: false, isEmpty: false, empty: <p>Nothing here</p> }

  it("renders children when data is ready", () => {
    render(<PageState {...base}><p>Loaded content</p></PageState>)

    expect(screen.getByText("Loaded content")).toBeInTheDocument()
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("renders the empty slot when isEmpty is true", () => {
    render(<PageState {...base} isEmpty><p>Loaded content</p></PageState>)

    expect(screen.getByText("Nothing here")).toBeInTheDocument()
    expect(screen.queryByText("Loaded content")).toBeNull()
  })

  it("gives loading precedence over error and empty states", () => {
    render(<PageState {...base} isLoading isError isEmpty><p>Loaded content</p></PageState>)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByText("Nothing here")).toBeNull()
  })

  it("shows the error state over the empty state and wires onRetry", () => {
    const onRetry = vi.fn()
    render(<PageState {...base} isError isEmpty onRetry={onRetry}><p>Loaded content</p></PageState>)

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Nothing here")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
