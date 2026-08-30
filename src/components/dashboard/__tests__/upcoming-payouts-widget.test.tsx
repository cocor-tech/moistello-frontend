import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Payout, Circle } from "@types"
import { UpcomingPayoutsWidget } from "../upcoming-payouts-widget"

const circle = { id: "circle-1", name: "Ethereum Builders", currency: "USDC" } as unknown as Circle

function makePayout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: "payout-1",
    circleId: "circle-1",
    recipientId: "user-1",
    roundNumber: 2,
    amount: 500,
    payoutType: "fixed",
    createdAt: "2030-01-01T00:00:00.000Z",
    ...overrides,
  } as Payout
}

describe("UpcomingPayoutsWidget", () => {
  it("renders loading state correctly", () => {
    const { container } = render(
      <UpcomingPayoutsWidget
        payouts={[]}
        circles={[circle]}
        isLoading
        isError={false}
      />,
    )
    expect(container.querySelectorAll('[class*="animate-shimmer"]').length).toBeGreaterThan(0)
  })

  it("renders error state correctly", () => {
    render(
      <UpcomingPayoutsWidget
        payouts={[]}
        circles={[circle]}
        isLoading={false}
        isError
      />,
    )
    expect(screen.getByText(/Failed to load upcoming payouts/)).toBeDefined()
  })

  it("renders empty state correctly", () => {
    render(
      <UpcomingPayoutsWidget
        payouts={[]}
        circles={[circle]}
        isLoading={false}
        isError={false}
      />,
    )
    expect(screen.getByText(/No upcoming payouts scheduled/)).toBeDefined()
  })

  it("renders upcoming payouts with circle name and formatted amount", () => {
    render(
      <UpcomingPayoutsWidget
        payouts={[makePayout()]}
        circles={[circle]}
        isLoading={false}
        isError={false}
      />,
    )

    expect(screen.getByText("Ethereum Builders")).toBeDefined()
    expect(screen.getByText(/Round 2/)).toBeDefined()
  })
})
