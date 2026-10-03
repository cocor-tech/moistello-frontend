import { describe, expect, it } from "vitest"
import {
  TREND_PERIOD_COUNT,
  buildContributionSummary,
  buildTrend,
  computeCurrentStreak,
  isStreakEligible,
  periodOverPeriodChange,
  sumContributed,
} from "../summary"
import type { Contribution } from "@/types"

/** Fixed clock so bucket boundaries are deterministic. */
const NOW = new Date("2026-06-17T12:00:00.000Z") // a Wednesday

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "c1",
    circleId: "circle-1",
    userId: "user-1",
    roundNumber: 1,
    amount: 100,
    status: "confirmed",
    onTime: true,
    createdAt: "2026-06-10T10:00:00.000Z",
    ...overrides,
  }
}

const daysAgo = (days: number, from: Date = NOW) =>
  new Date(from.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

describe("sumContributed", () => {
  it("returns 0 for an empty list", () => {
    expect(sumContributed([])).toBe(0)
  })

  it("sums every amount exactly", () => {
    const list = [
      contribution({ id: "a", amount: 100 }),
      contribution({ id: "b", amount: 250.5 }),
      contribution({ id: "c", amount: 0.25 }),
    ]
    expect(sumContributed(list)).toBe(350.75)
  })

  it("avoids float drift that would desync the display from the backend", () => {
    // 0.1 + 0.2 in binary floating point is 0.30000000000000004, which would
    // render as a different figure than the backend reports.
    const list = Array.from({ length: 3 }, (_, i) =>
      contribution({ id: `c${i}`, amount: 0.1 }),
    )
    expect(sumContributed(list)).toBe(0.3)
  })
})

describe("isStreakEligible", () => {
  it("counts confirmed only", () => {
    expect(isStreakEligible(contribution({ status: "confirmed" }))).toBe(true)
  })

  it("excludes pending, failed and late", () => {
    for (const status of ["pending", "failed", "late"] as const) {
      expect(isStreakEligible(contribution({ status }))).toBe(false)
    }
  })
})

describe("buildTrend", () => {
  it("returns exactly the requested number of periods", () => {
    expect(buildTrend([], NOW)).toHaveLength(TREND_PERIOD_COUNT)
  })

  it("orders periods oldest to newest", () => {
    const trend = buildTrend([], NOW)
    const starts = trend.map((p) => p.periodStart)
    expect([...starts].sort()).toEqual(starts)
    expect(trend[0].index).toBe(0)
    expect(trend[trend.length - 1].index).toBe(TREND_PERIOD_COUNT - 1)
  })

  it("places a contribution in the period containing it", () => {
    // NOW is 2026-06-17; the newest period starts 7 days earlier.
    const trend = buildTrend([contribution({ createdAt: daysAgo(0) })], NOW)
    const newest = trend[trend.length - 1]
    expect(newest.amount).toBe(100)
    expect(newest.count).toBe(1)
  })

  it("places an older contribution in the correct older period", () => {
    const trend = buildTrend([contribution({ createdAt: daysAgo(21) })], NOW)
    // 21 days back is 3 periods back from the newest.
    expect(trend[trend.length - 4].amount).toBe(100)
    expect(trend[trend.length - 1].amount).toBe(0)
  })

  it("sums multiple contributions within one period", () => {
    // The newest period starts *today*, so a second contribution has to be a
    // few days back to land in the same bucket (the period before it).
    const list = [
      contribution({ id: "a", amount: 50, createdAt: daysAgo(5) }),
      contribution({ id: "b", amount: 70, createdAt: daysAgo(6) }),
    ]
    const trend = buildTrend(list, NOW)

    expect(trend[trend.length - 2].amount).toBe(120)
    expect(trend[trend.length - 2].count).toBe(2)
    // ...and they are not double-counted into the live period.
    expect(trend[trend.length - 1].amount).toBe(0)
  })

  it("sums two contributions on the same day into the live period", () => {
    const list = [
      contribution({ id: "a", amount: 10, createdAt: daysAgo(0) }),
      contribution({ id: "b", amount: 15, createdAt: daysAgo(0) }),
    ]
    const trend = buildTrend(list, NOW)

    expect(trend[trend.length - 1].amount).toBe(25)
    expect(trend[trend.length - 1].count).toBe(2)
  })

  it("ignores contributions older than the window rather than clamping them", () => {
    // Clamping would silently inflate the oldest period with ancient history.
    const trend = buildTrend([contribution({ amount: 999, createdAt: daysAgo(400) })], NOW)
    expect(trend.every((p) => p.amount === 0)).toBe(true)
  })

  it("ignores future-dated records", () => {
    const future = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const trend = buildTrend([contribution({ amount: 500, createdAt: future })], NOW)
    expect(trend.every((p) => p.amount === 0)).toBe(true)
  })

  it("is stable regardless of input order", () => {
    const list = [
      contribution({ id: "a", amount: 10, createdAt: daysAgo(1) }),
      contribution({ id: "b", amount: 20, createdAt: daysAgo(8) }),
    ]
    expect(buildTrend(list, NOW)).toEqual(buildTrend([...list].reverse(), NOW))
  })

  it("supports a custom period count", () => {
    expect(buildTrend([], NOW, 3)).toHaveLength(3)
  })
})

describe("computeCurrentStreak", () => {
  it("is 0 with no contributions", () => {
    const trend = buildTrend([], NOW)
    expect(computeCurrentStreak(trend, [], NOW)).toBe(0)
  })

  it("is 1 when only the current period has a contribution", () => {
    const list = [contribution({ createdAt: daysAgo(0) })]
    expect(computeCurrentStreak(buildTrend(list, NOW), list, NOW)).toBe(1)
  })

  it("counts consecutive periods", () => {
    const list = [
      contribution({ id: "a", createdAt: daysAgo(0) }),
      contribution({ id: "b", createdAt: daysAgo(7) }),
      contribution({ id: "c", createdAt: daysAgo(14) }),
    ]
    expect(computeCurrentStreak(buildTrend(list, NOW), list, NOW)).toBe(3)
  })

  it("breaks on a gap", () => {
    const list = [
      contribution({ id: "a", createdAt: daysAgo(0) }),
      // days 8-13 empty
      contribution({ id: "b", createdAt: daysAgo(21) }),
    ]
    expect(computeCurrentStreak(buildTrend(list, NOW), list, NOW)).toBe(1)
  })

  it("does not count unconfirmed contributions", () => {
    const list = [
      contribution({ id: "a", status: "pending", createdAt: daysAgo(0) }),
      contribution({ id: "b", status: "failed", createdAt: daysAgo(7) }),
    ]
    expect(computeCurrentStreak(buildTrend(list, NOW), list, NOW)).toBe(0)
  })

  it("gives the in-progress period a grace period", () => {
    // Nothing yet this week, but last week was saved: the streak is alive
    // rather than reading as zero from Monday morning. daysAgo(3) sits in the
    // period immediately before the live one; daysAgo(8) would be two periods
    // back and a genuine gap.
    const list = [contribution({ createdAt: daysAgo(3) })]
    expect(computeCurrentStreak(buildTrend(list, NOW), list, NOW)).toBe(1)
  })

  it("cannot exceed the number of periods", () => {
    const list = Array.from({ length: 20 }, (_, i) =>
      contribution({ id: `c${i}`, createdAt: daysAgo(i) }),
    )
    expect(computeCurrentStreak(buildTrend(list, NOW), list, NOW)).toBeLessThanOrEqual(
      TREND_PERIOD_COUNT,
    )
  })
})

describe("periodOverPeriodChange", () => {
  it("returns null with fewer than two periods", () => {
    expect(periodOverPeriodChange([])).toBeNull()
    expect(periodOverPeriodChange([{ periodStart: "x", index: 0, amount: 5, count: 1 }])).toBeNull()
  })

  it("returns null when there is no prior amount to compare against", () => {
    // 0 -> 50 is not "+infinity%"; a dash is the honest rendering.
    const trend = [
      { periodStart: "a", index: 0, amount: 0, count: 0 },
      { periodStart: "b", index: 1, amount: 50, count: 1 },
    ]
    expect(periodOverPeriodChange(trend)).toBeNull()
  })

  it("returns 0 when both periods are zero", () => {
    const trend = [
      { periodStart: "a", index: 0, amount: 0, count: 0 },
      { periodStart: "b", index: 1, amount: 0, count: 0 },
    ]
    expect(periodOverPeriodChange(trend)).toBe(0)
  })

  it("computes a signed percentage", () => {
    const trend = [
      { periodStart: "a", index: 0, amount: 100, count: 1 },
      { periodStart: "b", index: 1, amount: 150, count: 1 },
    ]
    expect(periodOverPeriodChange(trend)).toBe(50)
  })

  it("reports a decline as negative", () => {
    const trend = [
      { periodStart: "a", index: 0, amount: 200, count: 1 },
      { periodStart: "b", index: 1, amount: 50, count: 1 },
    ]
    expect(periodOverPeriodChange(trend)).toBe(-75)
  })
})

describe("buildContributionSummary", () => {
  it("reports an empty summary for no contributions", () => {
    const summary = buildContributionSummary([], NOW)
    expect(summary.isEmpty).toBe(true)
    expect(summary.totalContributed).toBe(0)
    expect(summary.currentStreak).toBe(0)
    expect(summary.trend).toHaveLength(TREND_PERIOD_COUNT)
  })

  it("tolerates a non-array input rather than throwing in render", () => {
    const summary = buildContributionSummary(undefined as unknown as Contribution[], NOW)
    expect(summary.isEmpty).toBe(true)
  })

  it("separates the confirmed total from the overall total", () => {
    const summary = buildContributionSummary(
      [
        contribution({ id: "a", amount: 100, status: "confirmed" }),
        contribution({ id: "b", amount: 40, status: "pending" }),
      ],
      NOW,
    )
    expect(summary.totalContributed).toBe(140)
    expect(summary.confirmedTotal).toBe(100)
    expect(summary.contributionCount).toBe(2)
    expect(summary.confirmedCount).toBe(1)
  })

  it("matches the backend's own summary figure exactly", () => {
    // The acceptance criterion: the card's total must equal what the API
    // reports, so the sum is taken over exactly the records it returned.
    const apiContributions = [
      contribution({ id: "c1", amount: 100 }),
      contribution({ id: "c2", amount: 250 }),
      contribution({ id: "c3", amount: 50 }),
    ]
    const apiSummary = { totalContributed: 400, average: 133.33, count: 3 }

    const summary = buildContributionSummary(apiContributions, NOW)

    expect(summary.totalContributed).toBe(apiSummary.totalContributed)
    expect(summary.contributionCount).toBe(apiSummary.count)
  })
})
