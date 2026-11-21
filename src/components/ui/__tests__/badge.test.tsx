import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "../badge"

describe("Badge", () => {
  it("renders its children as text", () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("applies the variant and size classes", () => {
    render(
      <Badge variant="success" size="sm">
        Paid
      </Badge>
    )
    const badge = screen.getByText("Paid")
    expect(badge).toHaveClass("text-success")
    expect(badge).toHaveClass("px-2")
  })

  it("keeps the decorative dot out of the accessibility tree", () => {
    const { container } = render(<Badge>Live</Badge>)
    const dot = container.querySelector("span > span")
    expect(dot).toHaveAttribute("aria-hidden", "true")
  })

  it("forwards extra props and merges a custom className", () => {
    render(
      <Badge className="custom-class" data-testid="badge" title="Status">
        Ok
      </Badge>
    )
    const badge = screen.getByTestId("badge")
    expect(badge).toHaveClass("custom-class")
    expect(badge).toHaveAttribute("title", "Status")
  })

  it("falls back to the default variant and md size when none are given", () => {
    render(<Badge>Plain</Badge>)
    const badge = screen.getByText("Plain")
    expect(badge).toHaveClass("glass-strong")
    expect(badge).toHaveClass("px-2.5")
  })
})
