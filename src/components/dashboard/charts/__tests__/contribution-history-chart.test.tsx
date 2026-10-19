import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import type { Contribution } from "@/types"
import { ContributionHistoryChart } from "../contribution-history-chart"

/** A contribution dated `daysAgo` days back so it lands inside the chart window. */
function contribution(
  amount: number,
  daysAgo = 0,
  id = `c-${amount}-${daysAgo}`,
): Contribution {
  return {
    id,
    circleId: "circle-1",
    userId: "user-1",
    roundNumber: 1,
    amount,
    status: "completed",
    onTime: true,
    createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  } as Contribution
}

describe("ContributionHistoryChart (#621)", () => {
  it("renders the heading and the total/average/peak summary", () => {
    render(<ContributionHistoryChart period="all" contributions={[]} />)

    expect(
      screen.getByRole("heading", { name: "Contribution History" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByText("Average")).toBeInTheDocument()
    expect(screen.getByText("Peak")).toBeInTheDocument()
    // With no contributions every aggregate formats to a zero USDC amount.
    expect(screen.getAllByText("0 USDC").length).toBeGreaterThanOrEqual(3)
  })

  it("aggregates contributions into the Total, Average and Peak figures", () => {
    render(
      <ContributionHistoryChart
        period="week"
        contributions={[contribution(100, 0), contribution(50, 2)]}
      />,
    )

    // total = 150, average = 150 / 8 days = 18.75, peak = busiest day = 100
    expect(screen.getByText("150 USDC")).toBeInTheDocument()
    expect(screen.getByText("18.75 USDC")).toBeInTheDocument()
    expect(screen.getByText("100 USDC")).toBeInTheDocument()
  })

  it("renders one bar per day in the selected period", () => {
    const { container: week } = render(
      <ContributionHistoryChart period="week" contributions={[]} />,
    )
    // Inclusive 7-day lookback: today plus the previous 7 days.
    expect(week.querySelectorAll("rect")).toHaveLength(8)

    const { container: all } = render(
      <ContributionHistoryChart period="all" contributions={[]} />,
    )
    expect(all.querySelectorAll("rect")).toHaveLength(1)
  })

  it("scales bar heights against the busiest day", () => {
    const { container } = render(
      <ContributionHistoryChart
        period="week"
        contributions={[
          contribution(100, 0),
          contribution(25, 0),
          contribution(25, 2),
        ]}
      />,
    )

    // chartHeight = 200 - top(12) - bottom(28) = 160.
    // Busiest day = 125 -> full 160px bar; the 25 day is 25/125 * 160 = 32px.
    const heights = Array.from(container.querySelectorAll("rect")).map((bar) =>
      Number(bar.getAttribute("height")),
    )
    expect(heights).toContain(160)
    expect(heights).toContain(32)
  })

  it("renders zero-height bars when there are no contributions", () => {
    const { container } = render(
      <ContributionHistoryChart period="all" contributions={[]} />,
    )

    expect(container.querySelector("rect")?.getAttribute("height")).toBe("0")
  })

  it("draws every axis label for a short week window", () => {
    const { container } = render(
      <ContributionHistoryChart period="week" contributions={[]} />,
    )

    // labelStep is 1 for windows of 14 days or fewer, so all 8 days are labelled.
    expect(container.querySelectorAll("text")).toHaveLength(8)
  })
})
