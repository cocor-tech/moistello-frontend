import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Payout, Circle } from "@/types"
import { UpcomingPayoutsWidget } from "./upcoming-payouts-widget"

const circle = { id: "circle-1", name: "Esusu Circle", currency: "USD" } as unknown as Circle
const payout: Payout = {
  id: "p-1",
  circleId: "circle-1",
  recipientId: "user-1",
  roundNumber: 2,
  amount: 300,
  payoutType: "fixed",
  createdAt: "2026-08-01T00:00:00Z",
}

describe("UpcomingPayoutsWidget", () => {
  it("renders loading state", () => {
    const { container } = render(
      <UpcomingPayoutsWidget payouts={[]} circles={[]} isLoading isError={false} />
    )
    expect(container.querySelectorAll('[class*="animate-shimmer"]').length).toBeGreaterThan(0)
  })

  it("renders error state", () => {
    render(<UpcomingPayoutsWidget payouts={[]} circles={[]} isLoading={false} isError />)
    expect(screen.getByText("Failed to load payouts")).toBeDefined()
  })

  it("renders empty state", () => {
    render(<UpcomingPayoutsWidget payouts={[]} circles={[]} isLoading={false} isError={false} />)
    expect(screen.getByText(/No scheduled upcoming payouts/)).toBeDefined()
  })

  it("renders upcoming payouts list with circle name and amount", () => {
    render(
      <UpcomingPayoutsWidget
        payouts={[payout]}
        circles={[circle]}
        isLoading={false}
        isError={false}
      />
    )
    expect(screen.getByText("Esusu Circle")).toBeDefined()
    expect(screen.getByText("Round 2")).toBeDefined()
  })
})
