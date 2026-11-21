import React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { ContributionListSkeleton } from "../contribution-list-skeleton"

function rows(container: HTMLElement) {
  return Array.from((container.firstElementChild as HTMLElement).children) as HTMLElement[]
}

describe("ContributionListSkeleton", () => {
  it("renders five placeholder rows by default", () => {
    const { container } = render(<ContributionListSkeleton />)

    const list = rows(container)
    expect(list).toHaveLength(5)
    expect(container.textContent).toBe("")
  })

  it("renders an avatar, info lines and amount lines in each row", () => {
    const { container } = render(<ContributionListSkeleton count={2} />)

    const list = rows(container)
    expect(list).toHaveLength(2)
    list.forEach((row) => {
      const avatar = row.firstElementChild as HTMLElement
      expect(avatar).toHaveClass("rounded-full")
      expect(avatar.style.width).toBe("40px")
      expect(avatar.style.height).toBe("40px")
      const placeholders = row.querySelectorAll('[aria-hidden="true"]')
      expect(placeholders).toHaveLength(6)
    })
  })

  it("renders an empty list when count is zero", () => {
    const { container } = render(<ContributionListSkeleton count={0} />)

    expect(container.firstElementChild).toBeInTheDocument()
    expect(rows(container)).toHaveLength(0)
  })
})
