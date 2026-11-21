import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"
import { Skeleton } from "../skeleton"

describe("Skeleton", () => {
  it("renders default text variant with shimmer styles and aria-hidden", () => {
    render(<Skeleton data-testid="skel" />)
    const el = screen.getByTestId("skel")

    expect(el).toHaveAttribute("aria-hidden", "true")
    expect(el.className).toContain("animate-shimmer")
    expect(el.className).toContain("bg-muted")
    expect(el.className).toContain("h-4")
    expect(el.className).toContain("w-full")
  })

  it("renders circular, heading, card, and rectangular variants with expected classes", () => {
    const { rerender } = render(<Skeleton data-testid="skel" variant="heading" />)
    expect(screen.getByTestId("skel").className).toContain("h-6")
    expect(screen.getByTestId("skel").className).toContain("w-3/4")

    rerender(<Skeleton data-testid="skel" variant="card" />)
    expect(screen.getByTestId("skel").className).toContain("rounded-2xl")
    expect(screen.getByTestId("skel").className).toContain("h-48")

    rerender(<Skeleton data-testid="skel" variant="rectangular" />)
    expect(screen.getByTestId("skel").className).toContain("rounded-xl")

    rerender(<Skeleton data-testid="skel" variant="circular" width={48} />)
    const circular = screen.getByTestId("skel")
    expect(circular.className).toContain("rounded-full")
    expect(circular.className).toContain("aspect-square")
    expect(circular.style.width).toBe("48px")
    expect(circular.style.height).toBe("48px")
  })

  it("applies custom width, height, className, and style overrides", () => {
    render(
      <Skeleton
        data-testid="skel"
        variant="rectangular"
        width="120px"
        height={24}
        className="custom-class"
        style={{ opacity: 0.5 }}
      />
    )
    const el = screen.getByTestId("skel")

    expect(el.className).toContain("custom-class")
    expect(el.style.width).toBe("120px")
    expect(el.style.height).toBe("24px")
    expect(el.style.opacity).toBe("0.5")
  })
})
