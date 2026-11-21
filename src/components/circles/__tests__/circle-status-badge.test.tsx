import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { CircleStatusBadge } from "../circle-status-badge"
import type { CircleStatus } from "@/types"

const cases: Array<[CircleStatus, string, string]> = [
  ["active", "Active", "text-success"],
  ["pending", "Pending", "text-warning"],
  ["completed", "Completed", "text-info"],
  ["cancelled", "Cancelled", "text-destructive"],
  ["disputed", "Disputed", "text-destructive"],
]

describe("CircleStatusBadge", () => {
  it.each(cases)("renders %s with its label and variant", (status, label, variantClass) => {
    render(<CircleStatusBadge status={status} />)

    const badge = screen.getByText(label)
    expect(badge.tagName).toBe("SPAN")
    expect(badge).toHaveClass(variantClass)
    expect(badge).toHaveClass("text-[10px]")
  })

  it("merges a custom className", () => {
    render(<CircleStatusBadge status="active" className="ml-auto" />)

    expect(screen.getByText("Active")).toHaveClass("ml-auto", "text-success")
  })

  it("renders no label for a status outside the known set", () => {
    const { container } = render(
      <CircleStatusBadge status={"archived" as CircleStatus} />,
    )

    expect(container.textContent).toBe("")
  })

  it("keeps a readable display name", () => {
    expect(CircleStatusBadge.displayName).toBe("CircleStatusBadge")
  })
})
