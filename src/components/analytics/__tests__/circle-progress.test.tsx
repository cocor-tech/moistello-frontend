import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { CircleProgress } from "../circle-progress"

const items = [
  { label: "Contributions", current: 5, max: 10, color: "#22c55e" },
  { label: "Payouts", current: 3, max: 4, color: "#a855f7" },
]

describe("CircleProgress", () => {
  it("renders the error state and retries on demand", () => {
    const onRetry = vi.fn()
    render(<CircleProgress error="boom" onRetry={onRetry} />)

    expect(screen.getByText("Failed to load progress data.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("omits the retry button when no onRetry handler is provided", () => {
    render(<CircleProgress error="boom" />)

    expect(screen.getByText("Failed to load progress data.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })

  it("renders loading placeholders instead of data", () => {
    const { container } = render(<CircleProgress isLoading items={items} />)

    expect(screen.queryByText("Progress")).not.toBeInTheDocument()
    expect(container.querySelectorAll(".animate-shimmer").length).toBeGreaterThan(0)
    expect(screen.queryByText("Contributions")).not.toBeInTheDocument()
  })

  it("renders an empty state when there are no items", () => {
    render(<CircleProgress items={[]} />)

    expect(screen.getByText("No progress data")).toBeInTheDocument()
    expect(
      screen.getByText("Circle progress will appear here once available."),
    ).toBeInTheDocument()
  })

  it("renders each item with its rounded percentage and count", () => {
    render(<CircleProgress items={items} />)

    expect(screen.getByText("Progress")).toBeInTheDocument()
    expect(screen.getByText("Contributions")).toBeInTheDocument()
    expect(screen.getByText("Payouts")).toBeInTheDocument()
    expect(screen.getByText("50%")).toBeInTheDocument()
    expect(screen.getByText("75%")).toBeInTheDocument()
    expect(screen.getByText("5 / 10")).toBeInTheDocument()
    expect(screen.getByText("3 / 4")).toBeInTheDocument()
  })

  it("renders one svg ring per item using the item color", () => {
    const { container } = render(<CircleProgress items={items} />)

    const rings = container.querySelectorAll('svg[class*="rotate-90"]')
    expect(rings.length).toBe(items.length)
    const colored = Array.from(container.querySelectorAll("circle")).filter((c) =>
      items.some((i) => i.color === c.getAttribute("stroke")),
    )
    expect(colored.length).toBe(items.length)
  })

  it("clamps the ring fill at the maximum while showing the raw percentage", () => {
    const { container } = render(
      <CircleProgress
        items={[{ label: "Overflow", current: 25, max: 10, color: "#000" }]}
      />,
    )

    expect(screen.getByText("250%")).toBeInTheDocument()
    expect(screen.getByText("25 / 10")).toBeInTheDocument()
    const fill = container.querySelector('circle[stroke="#000"]')
    expect(fill).toHaveAttribute("stroke-dashoffset", "0")
  })

  it("treats a zero maximum as 0%", () => {
    render(
      <CircleProgress
        items={[{ label: "Idle", current: 0, max: 0, color: "#000" }]}
      />,
    )

    expect(screen.getByText("0%")).toBeInTheDocument()
  })

  it("forwards a custom size to each ring", () => {
    const { container } = render(
      <CircleProgress
        size={80}
        items={[{ label: "Ring", current: 1, max: 2, color: "#000" }]}
      />,
    )

    const svg = container.querySelector('svg[class*="rotate-90"]')
    expect(svg).toHaveAttribute("width", "80")
    expect(svg).toHaveAttribute("height", "80")
  })
})
