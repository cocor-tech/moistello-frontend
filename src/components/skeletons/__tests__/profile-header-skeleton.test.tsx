import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"
import { ProfileHeaderSkeleton } from "../profile-header-skeleton"

describe("ProfileHeaderSkeleton", () => {
  it("renders cover, 96x96 circular avatar, info lines, 4-column stats, and 2 action placeholders", () => {
    const { container } = render(<ProfileHeaderSkeleton />)

    const placeholders = container.querySelectorAll('[aria-hidden="true"]')
    expect(placeholders).toHaveLength(16)

    // Cover banner
    const cover = placeholders[0] as HTMLElement
    expect(cover.className).toContain("h-32")
    expect(cover.className).toContain("rounded-xl")

    // Circular 96x96 avatar
    const avatar = placeholders[1] as HTMLElement
    expect(avatar.className).toContain("rounded-full")
    expect(avatar.style.width).toBe("96px")
    expect(avatar.style.height).toBe("96px")

    // 4-column stats grid
    const statsGrid = container.querySelector(".grid.grid-cols-4")
    expect(statsGrid).not.toBeNull()
    expect(statsGrid?.children).toHaveLength(4)
  })

  it("exposes no interactive elements while loading", () => {
    render(<ProfileHeaderSkeleton />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
