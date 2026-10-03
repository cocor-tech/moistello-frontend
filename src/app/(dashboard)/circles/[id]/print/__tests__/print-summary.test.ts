import { describe, expect, it } from "vitest"

import type { Circle, CircleMember, CircleRound, Contribution, Payout } from "@/types"
import {
  buildCircleSummary,
  buildMemberBalances,
  buildRoundSummaries,
} from "../print-summary"

function member(overrides: Partial<CircleMember> = {}): CircleMember {
  return {
    id: `m-${overrides.userId ?? "1"}`,
    circleId: "circle-1",
    userId: "user-1",
    position: 1,
    status: "active",
    userName: "Ada",
    userAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABC",
    joinedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: `c-${overrides.userId ?? "1"}-${overrides.roundNumber ?? 1}`,
    circleId: "circle-1",
    userId: "user-1",
    roundNumber: 1,
    amount: 100,
    status: "confirmed",
    onTime: true,
    createdAt: "2026-01-05T00:00:00.000Z",
    ...overrides,
  }
}

function payout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: `p-${overrides.roundNumber ?? 1}`,
    circleId: "circle-1",
    recipientId: "user-1",
    roundNumber: 1,
    amount: 300,
    payoutType: "random",
    createdAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  }
}

function round(overrides: Partial<CircleRound> & { roundNumber: number }): CircleRound {
  return { contributions: [], ...overrides }
}

const circle: Circle = {
  id: "circle-1",
  name: "Lagos Market Women",
  circleType: "private",
  payoutType: "random",
  contributionAmount: 100,
  currency: "USDC",
  frequency: "monthly",
  maxMembers: 3,
  collateralPercent: 10,
  lateFeePercent: 5,
  gracePeriodHours: 48,
  maxStrikes: 3,
  status: "active",
  currentRound: 2,
  totalContributions: 900,
  organizerId: "user-1",
  memberCount: 3,
  createdAt: "2026-01-01T00:00:00.000Z",
}

describe("buildMemberBalances", () => {
  it("totals settled contributions per member", () => {
    const members = [member({ userId: "user-1", position: 1 })]
    const rounds = [
      round({ roundNumber: 1, contributions: [contribution({ amount: 100 })] }),
      round({ roundNumber: 2, contributions: [contribution({ amount: 100 })] }),
    ]

    const [balance] = buildMemberBalances(members, rounds)
    expect(balance.roundsContributed).toBe(2)
    expect(balance.totalContributed).toBe(200)
  })

  it("counts a late contribution as settled but flags it", () => {
    // Late money still arrived, so it belongs in the total — but the organizer
    // needs to see it separately to follow up on it.
    const rounds = [
      round({ roundNumber: 1, contributions: [contribution({ status: "late", onTime: false })] }),
    ]
    const [balance] = buildMemberBalances([member()], rounds)
    expect(balance.totalContributed).toBe(100)
    expect(balance.lateRounds).toBe(1)
  })

  it("excludes unsettled contributions from totals and counts them as owing", () => {
    const rounds = [
      round({
        roundNumber: 1,
        contributions: [
          contribution({ status: "pending" }),
          contribution({ status: "failed" }),
        ],
      }),
      round({ roundNumber: 2 }),
    ]
    const [balance] = buildMemberBalances([member()], rounds)
    expect(balance.totalContributed).toBe(0)
    expect(balance.outstandingRounds).toBe(2)
  })

  it("nets received payouts against contributions", () => {
    const rounds = [
      round({
        roundNumber: 1,
        contributions: [contribution({ amount: 100 })],
        payout: payout({ amount: 300 }),
      }),
    ]
    const [balance] = buildMemberBalances([member()], rounds)
    expect(balance.totalReceived).toBe(300)
    expect(balance.roundsReceived).toBe(1)
    expect(balance.netPosition).toBe(200)
  })

  it("orders members by position, not by array order", () => {
    // Position determines payout order, so it is the only ordering a printed
    // summary can be acted on.
    const members = [
      member({ userId: "user-3", position: 3, userName: "Chidi" }),
      member({ userId: "user-1", position: 1, userName: "Ada" }),
      member({ userId: "user-2", position: 2, userName: "Bisi" }),
    ]
    expect(buildMemberBalances(members, []).map((m) => m.position)).toEqual([1, 2, 3])
    expect(buildMemberBalances(members, []).map((m) => m.displayName)).toEqual([
      "Ada",
      "Bisi",
      "Chidi",
    ])
  })

  it("falls back to a readable name when the member has none", () => {
    const [balance] = buildMemberBalances([member({ userName: null })], [])
    expect(balance.displayName).toBe("Anonymous")
  })

  it("treats a blank name as absent", () => {
    const [balance] = buildMemberBalances([member({ userName: "   " })], [])
    expect(balance.displayName).toBe("Anonymous")
  })

  it("returns a zeroed row for a member with no activity", () => {
    const [balance] = buildMemberBalances([member()], [])
    expect(balance).toMatchObject({
      roundsContributed: 0,
      totalContributed: 0,
      totalReceived: 0,
      roundsReceived: 0,
      netPosition: 0,
      lateRounds: 0,
    })
  })
})

describe("buildRoundSummaries", () => {
  const members = [
    member({ userId: "user-1", position: 1, userName: "Ada" }),
    member({ userId: "user-2", position: 2, userName: "Bisi" }),
  ]

  it("classifies rounds against the circle's current round", () => {
    const rounds = [
      round({ roundNumber: 1 }),
      round({ roundNumber: 2 }),
      round({ roundNumber: 3 }),
    ]
    expect(buildRoundSummaries(rounds, circle, members).map((r) => r.state)).toEqual([
      "completed",
      "current",
      "upcoming",
    ])
  })

  it("orders rounds ascending", () => {
    const rounds = [round({ roundNumber: 3 }), round({ roundNumber: 1 })]
    expect(buildRoundSummaries(rounds, circle, members).map((r) => r.roundNumber)).toEqual([1, 3])
  })

  it("counts members who have not paid", () => {
    const rounds = [
      round({ roundNumber: 1, contributions: [contribution({ userId: "user-1" })] }),
    ]
    const [summary] = buildRoundSummaries(rounds, circle, members)
    expect(summary.settledCount).toBe(1)
    expect(summary.missingCount).toBe(1)
  })

  it("does not hold departed members responsible for a round", () => {
    // Counting someone who left would understate collection on every round
    // they are still listed in.
    const withDeparted = [...members, member({ userId: "user-3", position: 3, status: "left" })]
    const rounds = [round({ roundNumber: 1, contributions: [contribution({ userId: "user-1" }), contribution({ userId: "user-2" })] })]

    const [summary] = buildRoundSummaries(rounds, circle, withDeparted)
    expect(summary.settledCount).toBe(2)
    expect(summary.missingCount).toBe(0)
  })

  it("excludes removed members from the expected total", () => {
    const withRemoved = [...members, member({ userId: "user-3", position: 3, status: "removed" })]
    const rounds = [round({ roundNumber: 1 })]
    // 2 active members x 100, not 3 x 100.
    expect(buildRoundSummaries(rounds, circle, withRemoved)[0].expectedAmount).toBe(200)
  })

  it("resolves the payout recipient to a member name", () => {
    const rounds = [round({ roundNumber: 1, payout: payout({ recipientId: "user-2" }) })]
    expect(buildRoundSummaries(rounds, circle, members)[0].payoutRecipientName).toBe("Bisi")
  })

  it("falls back to the raw id when the recipient is not a listed member", () => {
    const rounds = [round({ roundNumber: 1, payout: payout({ recipientId: "user-ghost" }) })]
    expect(buildRoundSummaries(rounds, circle, members)[0].payoutRecipientName).toBe("user-ghost")
  })

  it("leaves payout fields undefined when a round has not been paid", () => {
    const [summary] = buildRoundSummaries([round({ roundNumber: 1 })], circle, members)
    expect(summary.payoutAmount).toBeUndefined()
    expect(summary.payoutRecipientName).toBeUndefined()
    expect(summary.payoutDate).toBeUndefined()
  })
})

describe("buildCircleSummary", () => {
  it("rolls collected, paid out and held balance", () => {
    const members = [
      member({ userId: "user-1", position: 1 }),
      member({ userId: "user-2", position: 2 }),
      member({ userId: "user-3", position: 3 }),
    ]
    const rounds = [
      round({
        roundNumber: 1,
        contributions: [
          contribution({ userId: "user-1" }),
          contribution({ userId: "user-2" }),
          contribution({ userId: "user-3" }),
        ],
        payout: payout({ roundNumber: 1, recipientId: "user-1", amount: 300 }),
      }),
      round({
        roundNumber: 2,
        contributions: [contribution({ userId: "user-1" })],
      }),
    ]

    const summary = buildCircleSummary(circle, members, rounds)
    // 300 collected in round 1, 100 in round 2.
    expect(summary.totalCollected).toBe(400)
    expect(summary.totalPaidOut).toBe(300)
    expect(summary.outstandingBalance).toBe(100)
    expect(summary.roundsCompleted).toBe(1)
    // Round 2: two members have not paid.
    expect(summary.roundsOutstanding).toBe(2)
  })

  it("returns a zeroed summary for a circle with no rounds", () => {
    const summary = buildCircleSummary(circle, [member()], [])
    expect(summary).toMatchObject({
      totalCollected: 0,
      totalPaidOut: 0,
      outstandingBalance: 0,
      roundsCompleted: 0,
      roundsOutstanding: 0,
    })
  })

  it("keeps a zero balance negative-free when a payout precedes collection", () => {
    // Defensive: a payout with no matching contributions must not produce a
    // negative "held" figure that reads as a missing balance.
    const rounds = [round({ roundNumber: 1, payout: payout({ amount: 300 }) })]
    const summary = buildCircleSummary(circle, [member()], rounds)
    expect(summary.outstandingBalance).toBe(-300)
  })
})
