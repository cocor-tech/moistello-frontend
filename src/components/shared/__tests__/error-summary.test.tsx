import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ErrorSummary, type ErrorSummaryEntry } from "../error-summary"

const entries: ErrorSummaryEntry[] = [
  {
    fieldId: "github-profile",
    label: "GitHub profile",
    message: "Enter a GitHub URL",
  },
  {
    fieldId: "contribution-amount",
    label: "Contribution amount",
    message: "Must be greater than zero",
  },
]

describe("ErrorSummary", () => {
  it("renders nothing when there are no errors", () => {
    const { container } = render(<ErrorSummary entries={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders an accessible alert with a link for every invalid field", () => {
    render(<ErrorSummary entries={entries} />)

    const alert = screen.getByRole("alert")
    expect(alert).toHaveAttribute("aria-labelledby", "error-summary-heading")
    expect(screen.getByText("Please fix the following errors")).toHaveFocus()

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "#github-profile")
    expect(links[0]).toHaveTextContent("GitHub profile: Enter a GitHub URL")
    expect(links[1]).toHaveAttribute("href", "#contribution-amount")
    expect(links[1]).toHaveTextContent(
      "Contribution amount: Must be greater than zero"
    )
  })

  it("focuses and scrolls to the linked field without navigating", () => {
    window.location.hash = ""
    const scrollIntoView = vi.fn()

    render(
      <>
        <input id="github-profile" aria-label="GitHub profile" />
        <ErrorSummary entries={[entries[0]]} />
      </>
    )

    const field = screen.getByLabelText("GitHub profile")
    Object.defineProperty(field, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    })

    fireEvent.click(screen.getByRole("link"))

    expect(field).toHaveFocus()
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" })
    expect(window.location.hash).toBe("")
  })

  it("uses a custom title and does not refocus on repeated failures", () => {
    const { rerender } = render(
      <>
        <input aria-label="Outside field" />
        <ErrorSummary title="Fix these fields" entries={entries} />
      </>
    )

    const heading = screen.getByText("Fix these fields")
    expect(heading).toHaveFocus()

    const outsideField = screen.getByLabelText("Outside field")
    outsideField.focus()

    rerender(
      <>
        <input aria-label="Outside field" />
        <ErrorSummary title="Fix these fields" entries={[...entries]} />
      </>
    )

    expect(outsideField).toHaveFocus()
  })
})
