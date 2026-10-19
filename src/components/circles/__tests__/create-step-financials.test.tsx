import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { CreateStepFinancials } from "../create-step-financials"
import { initialCircleForm } from "@/lib/circles/circle-creation"
import type { CircleFormData } from "@/types"

function Harness({
  initial,
  errors = {},
}: {
  initial: CircleFormData
  errors?: Record<string, string>
}) {
  const [formData, setFormData] = React.useState(initial)
  return (
    <CreateStepFinancials formData={formData} setFormData={setFormData} errors={errors} />
  )
}

describe("CreateStepFinancials", () => {
  it("renders the financial and penalty sections with the current values", () => {
    render(<Harness initial={initialCircleForm()} />)

    expect(screen.getByText("Financial Settings")).toBeInTheDocument()
    expect(screen.getByText("Penalty Settings")).toBeInTheDocument()
    expect(screen.getByLabelText("Contribution Amount")).toHaveValue(100)
    expect(screen.getByLabelText("Grace Period (hrs)")).toHaveValue(24)
    expect(screen.getByLabelText("Max Strikes")).toHaveValue(3)
    expect(screen.getByText("Late Fee (5%)")).toBeInTheDocument()
  })

  it("marks the selected currency and frequency as pressed", () => {
    render(<Harness initial={initialCircleForm()} />)

    expect(screen.getByRole("button", { name: "USDC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("button", { name: "XLM" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("does not warn for non-premium circles regardless of contribution amount", () => {
    render(
      <Harness initial={{ ...initialCircleForm(), circleType: "public", contributionAmount: 1 }} />,
    )

    expect(screen.queryByText(/Premium circles require minimum/)).not.toBeInTheDocument()
  })

  it("warns when a premium USDC contribution is below the minimum", () => {
    render(
      <Harness
        initial={{ ...initialCircleForm(), circleType: "premium", currency: "USDC", contributionAmount: 10 }}
      />,
    )

    expect(screen.getByText(/Premium circles require minimum/)).toBeInTheDocument()
    expect(screen.getByText("50 USDC")).toBeInTheDocument()
  })

  it("warns with the XLM minimum for a premium XLM circle", () => {
    render(
      <Harness
        initial={{ ...initialCircleForm(), circleType: "premium", currency: "XLM", contributionAmount: 50 }}
      />,
    )

    expect(screen.getByText("100 XLM")).toBeInTheDocument()
  })

  it("does not warn when a premium circle meets the minimum", () => {
    render(
      <Harness
        initial={{ ...initialCircleForm(), circleType: "premium", currency: "USDC", contributionAmount: 50 }}
      />,
    )

    expect(screen.queryByText(/Premium circles require minimum/)).not.toBeInTheDocument()
  })

  it("updates the contribution amount through setFormData", () => {
    render(<Harness initial={initialCircleForm()} />)

    const input = screen.getByLabelText("Contribution Amount")
    fireEvent.change(input, { target: { value: "250" } })

    expect(input).toHaveValue(250)
  })

  it("recomputes the premium warning when the currency is switched", () => {
    render(
      <Harness
        initial={{ ...initialCircleForm(), circleType: "premium", currency: "USDC", contributionAmount: 50 }}
      />,
    )

    expect(screen.queryByText(/Premium circles require minimum/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "XLM" }))

    expect(screen.getByRole("button", { name: "XLM" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByText("100 XLM")).toBeInTheDocument()
  })

  it("switches the selected frequency on click", () => {
    render(<Harness initial={initialCircleForm()} />)

    const weekly = screen.getByRole("button", { name: "Weekly" })
    fireEvent.click(weekly)

    expect(weekly).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  it("updates the late fee range value", () => {
    render(<Harness initial={initialCircleForm()} />)

    const range = screen.getByLabelText("Late fee percentage")
    fireEvent.change(range, { target: { value: "20" } })

    expect(screen.getByText("Late Fee (20%)")).toBeInTheDocument()
  })

  it("surfaces a contribution amount validation error", () => {
    render(
      <Harness
        initial={initialCircleForm()}
        errors={{ contributionAmount: "Contribution must be positive" }}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Contribution must be positive")
  })

  it("calls setFormData with an updater on amount change when using the controlled prop", () => {
    let next: CircleFormData | null = null
    const setFormData = vi.fn(
      (update: React.SetStateAction<CircleFormData>) => {
        next =
          typeof update === "function"
            ? (update as (prev: CircleFormData) => CircleFormData)(initialCircleForm())
            : update
      },
    )

    render(
      <CreateStepFinancials
        formData={initialCircleForm()}
        setFormData={setFormData}
        errors={{}}
      />,
    )

    fireEvent.change(screen.getByLabelText("Contribution Amount"), {
      target: { value: "42" },
    })

    expect(setFormData).toHaveBeenCalledTimes(1)
    expect((next as CircleFormData | null)?.contributionAmount).toBe(42)
  })
})
