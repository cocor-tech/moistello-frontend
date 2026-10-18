import { describe, expect, it } from "vitest"
import { queryKeys } from "@/lib/query-keys"

describe("queryKeys", () => {
  it("creates stable circle keys for list, detail, members, rounds, and palette queries", () => {
    expect(queryKeys.circles.all).toEqual(["circles"])
    expect(queryKeys.circles.list({ page: 2 })).toEqual(["circles", { page: 2 }])
    expect(queryKeys.circles.detail("circle-1")).toEqual(["circle", "circle-1"])
    expect(queryKeys.circles.members("circle-1")).toEqual(["circle-members", "circle-1"])
    expect(queryKeys.circles.rounds("circle-1")).toEqual(["circle-rounds", "circle-1"])
    expect(queryKeys.circles.palette()).toEqual(["circles", "palette"])
  })

  it("keeps payout filters in the cache key", () => {
    expect(queryKeys.payouts.list({
      page: 3,
      limit: 20,
      sortBy: "date",
      sortDir: "desc",
      circleId: "circle-1",
      payoutType: "scheduled",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    })).toEqual([
      "payouts",
      3,
      20,
      "date",
      "desc",
      "circle-1",
      "scheduled",
      "2026-01-01",
      "2026-01-31",
    ])
  })

  it("creates independent keys for governance and notification scopes", () => {
    expect(queryKeys.governance.list({ status: "open" })).toEqual([
      "governance-proposals",
      { status: "open" },
    ])
    expect(queryKeys.governance.detail("proposal-1")).toEqual([
      "governance-proposal",
      "proposal-1",
    ])
    expect(queryKeys.notifications.archive).toEqual(["notifications", "archive"])
  })
})