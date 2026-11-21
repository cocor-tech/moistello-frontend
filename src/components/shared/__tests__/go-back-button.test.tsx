import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { GoBackButton } from "../go-back-button"

describe("GoBackButton", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the default 'Go back' label and calls window.history.back on click", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {})

    render(<GoBackButton />)

    const button = screen.getByRole("button", { name: "Go back" })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute("type", "button")

    fireEvent.click(button)
    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it("renders a custom label and handles empty label fallback cleanly", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {})

    const { rerender } = render(<GoBackButton label="Return to dashboard" />)
    const customButton = screen.getByRole("button", { name: "Return to dashboard" })
    fireEvent.click(customButton)
    expect(backSpy).toHaveBeenCalledTimes(1)

    rerender(<GoBackButton label="" />)
    const emptyButton = screen.getByRole("button")
    fireEvent.click(emptyButton)
    expect(backSpy).toHaveBeenCalledTimes(2)
  })
})
