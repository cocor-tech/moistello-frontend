import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import React from "react"
import { DashboardSkeleton, SkeletonDetailPage, SkeletonTable } from "../dashboard-skeleton"

describe("DashboardSkeleton", () => {
  it("renders accessible loading container with busy status and structural placeholders", () => {
    const { container } = render(<DashboardSkeleton />)

    const loadingRegion = screen.getByLabelText("Loading")
    expect(loadingRegion).toBeInTheDocument()
    expect(loadingRegion).toHaveAttribute("aria-busy", "true")

    // Has no interactive buttons or links while skeleton is visible
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()

    // Table placeholder is rendered
    expect(container.querySelector("table")).toBeInTheDocument()
  })
})

describe("SkeletonDetailPage", () => {
  it("renders detail page skeleton layout with avatar placeholder and list rows", () => {
    const { container } = render(<SkeletonDetailPage />)

    const loadingRegion = screen.getByLabelText("Loading")
    expect(loadingRegion).toBeInTheDocument()
    expect(loadingRegion).toHaveAttribute("aria-busy", "true")

    // Circular avatar placeholder
    const avatar = container.querySelector(".h-16.w-16.rounded-full")
    expect(avatar).not.toBeNull()
  })
})

describe("SkeletonTable export", () => {
  it("renders table with expected rows and columns", () => {
    const { container } = render(<SkeletonTable rows={3} columns={2} />)

    const rows = container.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(3)

    const headerCols = container.querySelectorAll("thead th")
    expect(headerCols).toHaveLength(2)
  })
})
