import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SavingsGrowthChart } from "../savings-growth-chart"

const goals = [
  {
    id: "emergency",
    name: "Emergency Fund",
    targetAmount: 5000,
    currentAmount: 2000,
    targetDate: null,
  },
  {
    id: "trip",
    name: "Japan Trip",
    targetAmount: 3000,
    currentAmount: 3000,
    targetDate: "2026-12-01",
  },
]

describe("SavingsGrowthChart", () => {
  it("renders each goal with its progress and formatted totals", () => {
    const { container } = render(<SavingsGrowthChart goals={goals} />)

    expect(
      screen.getByRole("heading", { name: "Savings Progress" })
    ).toBeInTheDocument()
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument()
    expect(screen.getByText("40%")).toBeInTheDocument()
    expect(screen.getByText("Japan Trip")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getByText("2,000 USDC")).toBeInTheDocument()
    expect(screen.getAllByText("3,000 USDC")).toHaveLength(2)
    expect(screen.getByText("Total Saved")).toBeInTheDocument()
    expect(screen.getAllByText("5,000 USDC")).toHaveLength(2)
    expect(screen.getByText("Total Goal")).toBeInTheDocument()
    expect(screen.getByText("8,000 USDC")).toBeInTheDocument()

    const widths = Array.from(container.querySelectorAll<HTMLElement>("div[style]")).map(
      (element) => element.style.width
    )
    expect(widths).toContain("40%")
    expect(widths).toContain("100%")
  })

  it("clamps progress above target to 100%", () => {
    render(
      <SavingsGrowthChart
        goals={[
          {
            id: "overfunded",
            name: "Overfunded Goal",
            targetAmount: 1000,
            currentAmount: 1250,
            targetDate: null,
          },
        ]}
      />
    )

    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getAllByText("1,250 USDC")).toHaveLength(2)
  })

  it("renders the empty state when no goal has a positive target", () => {
    render(
      <SavingsGrowthChart
        goals={[
          {
            id: "invalid",
            name: "Invalid Goal",
            targetAmount: 0,
            currentAmount: 50,
            targetDate: null,
          },
        ]}
      />
    )

    expect(screen.getByText("No savings goals yet")).toBeInTheDocument()
    expect(
      screen.getByText("Create a savings goal to track your progress")
    ).toBeInTheDocument()
    expect(screen.queryByText("Invalid Goal")).not.toBeInTheDocument()
  })
})
