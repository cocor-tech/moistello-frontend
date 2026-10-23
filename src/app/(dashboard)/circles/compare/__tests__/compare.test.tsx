import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CompareRounds } from "../components/compare-rounds"
import { CompareSummary } from "../components/compare-summary"
import { Circle, CircleRound } from "@/types"

const mockCircleA: Circle = {
  id: "circle-a",
  name: "Circle Alpha",
  circleType: "public",
  payoutType: "fixed",
  contributionAmount: 100,
  currency: "USDC",
  frequency: "weekly",
  maxMembers: 3,
  collateralPercent: 10,
  lateFeePercent: 5,
  gracePeriodHours: 24,
  maxStrikes: 3,
  status: "active",
  currentRound: 2,
  totalContributions: 600,
  organizerId: "org-1",
  createdAt: "2026-01-01T00:00:00Z",
}

const mockCircleB: Circle = {
  id: "circle-b",
  name: "Circle Beta",
  circleType: "private",
  payoutType: "random",
  contributionAmount: 250,
  currency: "USDC",
  frequency: "monthly",
  maxMembers: 5,
  collateralPercent: 15,
  lateFeePercent: 10,
  gracePeriodHours: 48,
  maxStrikes: 2,
  status: "active",
  currentRound: 1,
  totalContributions: 500,
  organizerId: "org-2",
  createdAt: "2026-01-01T00:00:00Z",
}

const mockRoundsA: CircleRound[] = [
  { roundNumber: 1, contributions: [] },
  { roundNumber: 2, contributions: [] },
]

const mockRoundsB: CircleRound[] = [
  { roundNumber: 1, contributions: [] },
]

describe("Circle Compare Feature (#480)", () => {
  it("renders side-by-side summary metrics for both circles", () => {
    render(
      <CompareSummary
        circleA={mockCircleA}
        circleB={mockCircleB}
        isLoadingA={false}
        isLoadingB={false}
      />
    )

    expect(screen.getByText("Circle Alpha")).toBeDefined()
    expect(screen.getByText("Circle Beta")).toBeDefined()
    expect(screen.getByText("Contribution & Payout Metrics")).toBeDefined()
    expect(screen.getByText("Participation & Rules")).toBeDefined()
  })

  it("handles different round counts side by side without breakage", () => {
    // Circle A has 3 rounds, Circle B has 5 rounds
    render(
      <CompareRounds
        circleA={mockCircleA}
        circleB={mockCircleB}
        roundsA={mockRoundsA}
        roundsB={mockRoundsB}
      />
    )

    // All rounds up to max (5) should be present
    expect(screen.getByText("Round 1")).toBeDefined()
    expect(screen.getByText("Round 2")).toBeDefined()
    expect(screen.getByText("Round 3")).toBeDefined()
    expect(screen.getByText("Round 4")).toBeDefined()
    expect(screen.getByText("Round 5")).toBeDefined()

    // For round 4 & 5, circle A shows completed cycle
    const completedNotices = screen.getAllByText(/Cycle completed/i)
    expect(completedNotices.length).toBeGreaterThan(0)
  })
})
