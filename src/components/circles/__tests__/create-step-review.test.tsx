import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { CreateStepReview } from "../create-step-review"
import type { CircleFormData } from "@/types"

const mockFormData: CircleFormData = {
  name: "Builders Circle",
  description: "A circle for builders",
  circleType: "ROTATING",
  maxMembers: 10,
  contributionAmount: 100,
  currency: "XLM",
  frequency: "monthly",
  payoutType: "RANDOM",
  lateFeePercent: 5,
  gracePeriodHours: 24,
  maxStrikes: 3,
  collateralPercent: 10,
  minMoiScore: 650,
}

describe("CreateStepReview", () => {
  it("renders the review heading and all form summary rows", () => {
    render(<CreateStepReview formData={mockFormData} isPending={false} />)

    expect(screen.getByText("Review Your Circle")).toBeInTheDocument()
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Builders Circle")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("A circle for builders")).toBeInTheDocument()
    expect(screen.getByText("Type")).toBeInTheDocument()
    expect(screen.getByText("ROTATING")).toBeInTheDocument()
    expect(screen.getByText("Max Members")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("Contribution")).toBeInTheDocument()
    expect(screen.getByText("100 XLM · Monthly")).toBeInTheDocument()
    expect(screen.getByText("Payout Type")).toBeInTheDocument()
    expect(screen.getByText("RANDOM")).toBeInTheDocument()
    expect(screen.getByText("Late Fee")).toBeInTheDocument()
    expect(screen.getByText("5%")).toBeInTheDocument()
    expect(screen.getByText("Grace Period")).toBeInTheDocument()
    expect(screen.getByText("24h")).toBeInTheDocument()
    expect(screen.getByText("Max Strikes")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Collateral")).toBeInTheDocument()
    expect(screen.getByText("10%")).toBeInTheDocument()
    expect(screen.getByText("Min MoiScore")).toBeInTheDocument()
    expect(screen.getByText("650")).toBeInTheDocument()
  })

  it("omits optional fields when they are undefined or empty", () => {
    const minimalData: CircleFormData = {
      ...mockFormData,
      description: "",
      collateralPercent: undefined as unknown as number,
      minMoiScore: 0,
    }

    render(<CreateStepReview formData={minimalData} isPending={false} />)

    expect(screen.queryByText("Description")).toBeNull()
    expect(screen.queryByText("Collateral")).toBeNull()
    expect(screen.queryByText("Min MoiScore")).toBeNull()
  })

  it("renders submission error alert when errors.submit is present", () => {
    render(
      <CreateStepReview
        formData={mockFormData}
        isPending={false}
        errors={{ submit: "Failed to create circle. Please try again." }}
      />
    )

    expect(
      screen.getByText("Failed to create circle. Please try again.")
    ).toBeInTheDocument()
  })
})
