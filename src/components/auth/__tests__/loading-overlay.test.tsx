import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { LoadingOverlay } from "../loading-overlay"

describe("LoadingOverlay", () => {
  it("announces the default message as a polite status", () => {
    render(<LoadingOverlay />)

    const overlay = screen.getByRole("status")
    expect(overlay).toHaveAttribute("aria-live", "polite")
    expect(overlay).toHaveAttribute("aria-label", "Loading...")
    expect(overlay).toHaveClass("absolute", "inset-0", "z-50")
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("uses a custom message for both the label and visible text", () => {
    render(<LoadingOverlay message="Signing transaction" />)

    expect(screen.getByRole("status", { name: "Signing transaction" })).toBeInTheDocument()
    expect(screen.getByText("Signing transaction")).toBeInTheDocument()
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("merges a custom className and falls back to an empty label for an empty message", () => {
    render(<LoadingOverlay message="" className="rounded-none custom-overlay" />)

    const overlay = screen.getByRole("status")
    expect(overlay).toHaveClass("custom-overlay", "rounded-none")
    expect(overlay).not.toHaveClass("rounded-xl")
    expect(overlay).toHaveAttribute("aria-label", "")
  })
})
