import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"
import { CircleCardSkeleton } from "../circle-card-skeleton"

describe("CircleCardSkeleton", () => {
  it("renders card container with avatar, 3-column stats, progress bar, and button placeholders", () => {
    const { container } = render(<CircleCardSkeleton />)

    const card = container.firstElementChild as HTMLElement
    expect(card).not.toBeNull()
    expect(card.className).toContain("rounded-2xl")
    expect(card.className).toContain("bg-card")

    const placeholders = container.querySelectorAll('[aria-hidden="true"]')
    expect(placeholders).toHaveLength(11)

    // Circular 40x40 avatar placeholder
    const avatar = placeholders[0] as HTMLElement
    expect(avatar.className).toContain("rounded-full")
    expect(avatar.style.width).toBe("40px")
    expect(avatar.style.height).toBe("40px")

    // 3-column stats grid
    const statsGrid = container.querySelector(".grid.grid-cols-3")
    expect(statsGrid).not.toBeNull()
    expect(statsGrid?.children).toHaveLength(3)
  })

  it("exposes no interactive elements while loading", () => {
    render(<CircleCardSkeleton />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
