import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { AuthStepIndicator } from "../auth-step-indicator"

describe("AuthStepIndicator", () => {
  const steps = [
    { key: "wallet", label: "Choose Wallet" },
    { key: "profile", label: "Profile Info", optional: true },
    { key: "sign", label: "Verify Signature" },
  ]

  it("renders all steps, auto-assigns 1-based step numbers, and shows optional badge", () => {
    render(<AuthStepIndicator steps={steps} currentStep="wallet" />)

    expect(screen.getByText("Choose Wallet")).toBeInTheDocument()
    expect(screen.getByText(/Profile Info/)).toBeInTheDocument()
    expect(screen.getByText("(optional)")).toBeInTheDocument()
    expect(screen.getByText("Verify Signature")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("marks earlier steps as completed when currentStep advances", () => {
    render(<AuthStepIndicator steps={steps} currentStep="sign" />)

    expect(screen.queryByText("1")).toBeNull()
    expect(screen.queryByText("2")).toBeNull()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("falls back to step 1 when currentStep key is unknown and forwards className", () => {
    const { container } = render(
      <AuthStepIndicator
        steps={steps}
        currentStep="unknown-step"
        className="custom-step-indicator"
      />
    )

    expect(container.firstChild).toHaveClass("custom-step-indicator")
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("renders without crashing when given an empty steps list", () => {
    const { container } = render(<AuthStepIndicator steps={[]} currentStep="wallet" />)

    expect(container.firstChild).toBeInTheDocument()
  })
})
