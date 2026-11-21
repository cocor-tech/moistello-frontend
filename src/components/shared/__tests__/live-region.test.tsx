import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { LiveRegion } from "../live-region"

describe("LiveRegion", () => {
  it("renders a visually hidden, polite, atomic status region with the message", () => {
    render(<LiveRegion message="Contribution submitted" />)

    const region = screen.getByRole("status")
    expect(region).toHaveTextContent("Contribution submitted")
    expect(region).toHaveAttribute("aria-live", "polite")
    expect(region).toHaveAttribute("aria-atomic", "true")
    expect(region).toHaveClass("sr-only")
  })

  it("updates the same region in place when the message changes", () => {
    const { rerender } = render(<LiveRegion message="Submitting…" />)
    const region = screen.getByRole("status")

    rerender(<LiveRegion message="Submission failed" />)

    expect(screen.getByRole("status")).toBe(region)
    expect(region).toHaveTextContent("Submission failed")
  })

  it("stays mounted and empty when the message is an empty string", () => {
    render(<LiveRegion message="" />)

    const region = screen.getByRole("status")
    expect(region).toBeInTheDocument()
    expect(region).toBeEmptyDOMElement()
  })
})
