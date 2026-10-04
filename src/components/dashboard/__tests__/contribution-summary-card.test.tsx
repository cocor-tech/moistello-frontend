import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ContributionSummaryCard, describeTrend } from "../contribution-summary-card"
import { buildTrend } from "@/lib/contributions/summary"
import type { Contribution } from "@/types"

const NOW = new Date("2026-06-17T12:00:00.000Z")

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "c1",
    circleId: "circle-1",
    userId: "user-1",
    roundNumber: 1,
    amount: 100,
    status: "confirmed",
    onTime: true,
    createdAt: "2026-06-17T10:00:00.000Z",
    ...overrides,
  }
}

const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

// The card reads the real clock when it buckets the trend, which is correct in
// production. Pinning the system clock to NOW is what makes the fixtures
// relative to the same instant — without it the fixtures fall outside the
// window and every figure reads zero.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("ContributionSummaryCard", () => {
  it("shows the total contributed", () => {
    render(
      <ContributionSummaryCard
        contributions={[
          contribution({ amount: 250, createdAt: daysAgo(0) }),
          contribution({ id: "c2", amount: 150, createdAt: daysAgo(10) }),
        ]}
      />,
    )

    expect(screen.getByText(/total contributed/i)).toBeInTheDocument()
    expect(screen.getByTestId("contribution-total")).toHaveTextContent("400 USDC")
  })

  it("shows the current streak", () => {
    render(
      <ContributionSummaryCard
        contributions={[
          contribution({ id: "a", createdAt: daysAgo(0) }),
          contribution({ id: "b", createdAt: daysAgo(7) }),
        ]}
      />,
    )

    expect(screen.getByText(/in a row/i)).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("weeks in a row")).toBeInTheDocument()
  })

  it("uses the singular label for a one-week streak", () => {
    render(<ContributionSummaryCard contributions={[contribution()]} />)
    expect(screen.getByText("week in a row")).toBeInTheDocument()
  })

  it("renders a 6-period trend sparkline", () => {
    render(<ContributionSummaryCard contributions={[contribution()]} />)

    const sparkline = screen.getByRole("img")
    expect(sparkline.tagName.toLowerCase()).toBe("svg")
    // One marker per period, so the geometry is verifiable from the DOM.
    expect(sparkline.querySelectorAll("circle")).toHaveLength(6)
  })

  it("labels the sparkline for assistive technology", () => {
    render(<ContributionSummaryCard contributions={[contribution({ amount: 100 })]} />)

    const sparkline = screen.getByRole("img")
    const label = sparkline.getAttribute("aria-label") ?? ""

    expect(label.length).toBeGreaterThan(0)
    // The label must carry the actual figures, not just "trend".
    expect(label).toMatch(/trend over the last 6 weeks/i)
    expect(label).toMatch(/USDC/)
  })

  it("provides a readable table alternative for the sparkline", () => {
    render(
      <ContributionSummaryCard
        contributions={[
          contribution({ id: "a", amount: 100, createdAt: daysAgo(0) }),
          contribution({ id: "b", amount: 40, createdAt: daysAgo(10) }),
        ]}
      />,
    )

    // An SVG path conveys nothing to a screen reader, so the same numbers have
    // to exist as a table.
    const table = screen.getByRole("table", { name: /contribution trend by week/i })
    expect(table).toBeInTheDocument()
    expect(table.querySelectorAll("tbody tr")).toHaveLength(6)
  })

  it("names each period in the table with its date", () => {
    render(<ContributionSummaryCard contributions={[contribution()]}/>)
    const table = screen.getByRole("table", { name: /contribution trend by week/i })
    expect(table.querySelector("tbody th")).toBeInTheDocument()
  })

  it("exposes the figure region as a labelled region", () => {
    render(<ContributionSummaryCard contributions={[contribution()]} />)
    expect(screen.getByRole("region", { name: /contribution summary/i })).toBeInTheDocument()
  })

  it("handles an empty state without rendering a broken trend", () => {
    render(<ContributionSummaryCard contributions={[]} />)

    expect(screen.getByTestId("contribution-total")).toHaveTextContent("0 USDC")
    const sparkline = screen.getByRole("img")
    expect(sparkline.getAttribute("aria-label")).toMatch(/no trend data yet/i)
  })

  it("shows a loading state and marks itself busy", () => {
    render(<ContributionSummaryCard contributions={[]} isLoading />)

    const region = screen.getByRole("region", { name: /contribution summary/i })
    expect(region).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("surfaces an error with a retry affordance", () => {
    render(
      <ContributionSummaryCard
        contributions={[]}
        error="Network unreachable"
        onRetry={() => {}}
      />,
    )

    expect(screen.getByText(/network unreachable/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
  })

  it("does not show a period-over-period change when there is no baseline", () => {
    render(<ContributionSummaryCard contributions={[]} />)
    expect(screen.queryByText(/vs previous week/i)).toBeNull()
  })

  it("shows a period-over-period change when both periods have data", () => {
    render(
      <ContributionSummaryCard
        contributions={[
          // 3 days back is the period immediately before the live one, which is
          // what the percentage is measured against.
          contribution({ id: "a", amount: 100, createdAt: daysAgo(3) }),
          contribution({ id: "b", amount: 150, createdAt: daysAgo(0) }),
        ]}
      />,
    )

    expect(screen.getByText(/\+50% vs previous week/i)).toBeInTheDocument()
  })

  it("does not fabricate a percentage when the previous period was empty", () => {
    render(
      <ContributionSummaryCard
        contributions={[contribution({ amount: 150, createdAt: daysAgo(0) })]}
      />,
    )

    expect(screen.queryByText(/vs previous week/i)).toBeNull()
  })
})

describe("describeTrend", () => {
  it("reports the window, total, newest and peak", () => {
    const trend = buildTrend(
      [contribution({ amount: 100, createdAt: daysAgo(0) })],
      NOW,
    )
    const text = describeTrend(trend, 7, "USDC")

    expect(text).toMatch(/6 weeks/)
    expect(text).toMatch(/most recent period 100 USDC/)
  })

  it("handles an empty trend", () => {
    expect(describeTrend([], 7, "USDC")).toBe("No trend data yet.")
  })
})
