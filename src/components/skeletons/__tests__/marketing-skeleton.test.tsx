import React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { MarketingSkeleton } from "../marketing-skeleton"

describe("MarketingSkeleton", () => {
  it("renders a busy loading shell with hero, feature cards and text body", () => {
    const { container, getByTestId, getAllByTestId } = render(<MarketingSkeleton />)

    const shell = container.firstElementChild as HTMLElement
    expect(shell).toHaveAttribute("aria-busy", "true")
    expect(shell).toHaveAttribute("aria-label", "Loading")
    expect(shell).toHaveClass("w-full", "space-y-12", "py-8")
    expect(shell.children).toHaveLength(3)

    expect(getByTestId("skeleton-card-grid")).toBeInTheDocument()
    expect(getAllByTestId("skeleton-card")).toHaveLength(3)
  })

  it("exposes no readable text and hides every placeholder from assistive tech", () => {
    const { container } = render(<MarketingSkeleton />)

    expect(container.textContent).toBe("")
    const placeholders = container.querySelectorAll(".animate-shimmer")
    expect(placeholders.length).toBeGreaterThan(0)
    placeholders.forEach((el) => expect(el).toHaveAttribute("aria-hidden", "true"))
  })
})
