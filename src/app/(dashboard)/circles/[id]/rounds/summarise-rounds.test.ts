import { describe, it, expect } from "vitest"
import {
  overallParticipation,
  summariseRound,
  summariseRounds,
} from "./summarise-rounds"
import type { CircleMember, CircleRound, Contribution, Payout } from "@/types"

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: overrides.id ?? "c1",
    circleId: "circle-1",
    userId: overrides.userId ?? "user-1",
    roundNumber: overrides.roundNumber ?? 1,
    amount: overrides.amount ?? 50,
    txnHash: null,
    status: overrides.status ?? "confirmed",
    onTime: overrides.onTime ?? true,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  }
}

function payout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: "p1",
    circleId: "circle-1",
    recipientId: overrides.recipientId ?? "user-2",
    roundNumber: overrides.roundNumber ?? 1,
    amount: overrides.amount ?? 500,
    feeAmount: 1,
    txnHash: null,
    payoutType: "random",
    createdAt: overrides.createdAt ?? "2026-01-02T00:00:00.000Z",
  }
}

describe("summariseRound — participation", () => {
  it("counts a member as participating only when their money settled", () => {
    const summary = summariseRound(
      {
        roundNumber: 1,
        contributions: [
          contribution({ userId: "u1", status: "confirmed" }),
          contribution({ userId: "u2", status: "late", onTime: false }),
          // Charged, but nothing landed — must not count as participation.
          contribution({ userId: "u3", status: "failed" }),
          contribution({ userId: "u4", status: "pending" }),
        ],
      },
      { maxMembers: 4 },
    )

    expect(summary.participatedCount).toBe(2)
    expect(summary.participationRate).toBe(0.5)
  })

  it("excludes unsettled amounts from the collected total", () => {
    const summary = summariseRound(
      {
        roundNumber: 1,
        contributions: [
          contribution({ userId: "u1", amount: 50, status: "confirmed" }),
          contribution({ userId: "u2", amount: 50, status: "late", onTime: false }),
          contribution({ userId: "u3", amount: 50, status: "failed" }),
        ],
      },
      { maxMembers: 3, contributionAmount: 50 },
    )

    expect(summary.settledAmount).toBe(100)
    // 50 * 3 expected.
    expect(summary.expectedAmount).toBe(150)
  })

  it("reports a zero expected total when the circle has no configured amount", () => {
    // Guards the "of $X" suffix in the detail panel: with no contribution
    // amount there is nothing to compare against, so the comparison is hidden
    // rather than rendered as "collected $100 of $0".
    const summary = summariseRound(
      { roundNumber: 1, contributions: [contribution({ amount: 50 })] },
      { maxMembers: 4 },
    )

    expect(summary.settledAmount).toBe(50)
    expect(summary.expectedAmount).toBe(0)
  })

  it("counts a member once even when they retried a failed payment", () => {
    const summary = summariseRound(
      {
        roundNumber: 1,
        contributions: [
          contribution({ id: "a", userId: "u1", status: "failed" }),
          contribution({ id: "b", userId: "u1", status: "confirmed" }),
        ],
      },
      { maxMembers: 2 },
    )

    // Counting rows would report 1/2 = 50% for a member who did pay.
    expect(summary.participatedCount).toBe(1)
    expect(summary.participationRate).toBe(0.5)
  })

  it("never reports participation above 100% when the circle shrank", () => {
    const summary = summariseRound(
      {
        roundNumber: 1,
        contributions: [contribution({ userId: "u1" }), contribution({ userId: "u2" })],
      },
      // Circle is configured for 1 member but 2 contributed.
      { maxMembers: 1 },
    )

    expect(summary.expectedParticipants).toBe(2)
    expect(summary.participationRate).toBe(1)
  })

  it("reports 0% rather than NaN for a circle with no members", () => {
    const summary = summariseRound({ roundNumber: 1, contributions: [] }, { maxMembers: 0 })

    expect(summary.participationRate).toBe(0)
    expect(Number.isNaN(summary.participationRate)).toBe(false)
  })

  it("reports 0% for a round where nobody contributed", () => {
    const summary = summariseRound({ roundNumber: 1, contributions: [] }, { maxMembers: 8 })

    expect(summary.participatedCount).toBe(0)
    expect(summary.participationRate).toBe(0)
    expect(summary.settledAmount).toBe(0)
  })
})

describe("summariseRound — detail", () => {
  it("resolves contributor names from the member list", () => {
    const members: CircleMember[] = [
      {
        id: "m1",
        circleId: "circle-1",
        userId: "user-1",
        position: 1,
        status: "active",
        userName: "Ada Lovelace",
        joinedAt: "2025-01-01T00:00:00.000Z",
      },
    ]

    const summary = summariseRound(
      { roundNumber: 1, contributions: [contribution({ userId: "user-1" })] },
      { maxMembers: 1, members },
    )

    expect(summary.participants[0].name).toBe("Ada Lovelace")
  })

  it("leaves the name null for a contributor who is not in the member list", () => {
    const summary = summariseRound(
      { roundNumber: 1, contributions: [contribution({ userId: "ghost" })] },
      { maxMembers: 1, members: [] },
    )

    expect(summary.participants[0].name).toBeNull()
    // The id is still available, so the UI can show a truncated address.
    expect(summary.participants[0].userId).toBe("ghost")
  })

  it("counts late settled contributions separately", () => {
    const summary = summariseRound(
      {
        roundNumber: 1,
        contributions: [
          contribution({ userId: "u1", onTime: true }),
          contribution({ userId: "u2", status: "late", onTime: false }),
          contribution({ userId: "u3", status: "failed", onTime: false }),
        ],
      },
      { maxMembers: 3 },
    )

    // The failed one is not "late" — it never settled.
    expect(summary.lateCount).toBe(1)
  })
})

describe("summariseRound — dates", () => {
  it("uses the last activity in the round as its date", () => {
    const summary = summariseRound({
      roundNumber: 1,
      contributions: [
        contribution({ userId: "u1", createdAt: "2026-03-01T10:00:00.000Z" }),
        contribution({ userId: "u2", createdAt: "2026-03-05T10:00:00.000Z" }),
      ],
      payout: payout({ createdAt: "2026-03-07T10:00:00.000Z" }),
    })

    expect(summary.date).toBe("2026-03-07T10:00:00.000Z")
  })

  it("has no date for a round that never happened", () => {
    const summary = summariseRound({ roundNumber: 1, contributions: [] })

    expect(summary.date).toBeNull()
  })

  it("ignores an unparseable date instead of propagating NaN", () => {
    const summary = summariseRound({
      roundNumber: 1,
      contributions: [
        contribution({ userId: "u1", createdAt: "not-a-date" }),
        contribution({ userId: "u2", createdAt: "2026-04-02T00:00:00.000Z" }),
      ],
    })

    expect(summary.date).toBe("2026-04-02T00:00:00.000Z")
    expect(String(summary.date)).not.toContain("NaN")
  })
})

describe("summariseRounds", () => {
  const rounds: CircleRound[] = [
    { roundNumber: 1, contributions: [contribution({ roundNumber: 1 })] },
    { roundNumber: 3, contributions: [contribution({ roundNumber: 3 })] },
    { roundNumber: 2, contributions: [contribution({ roundNumber: 2 })] },
  ]

  it("orders rounds newest first", () => {
    expect(summariseRounds(rounds).map((r) => r.roundNumber)).toEqual([3, 2, 1])
  })

  it("does not mutate the caller's array", () => {
    const input = [...rounds]
    summariseRounds(input)

    expect(input.map((r) => r.roundNumber)).toEqual([1, 3, 2])
  })

  it("returns an empty list for a circle before its first round", () => {
    expect(summariseRounds([])).toEqual([])
  })

  it("handles 50+ rounds", () => {
    const many: CircleRound[] = Array.from({ length: 60 }, (_, index) => ({
      roundNumber: index + 1,
      contributions: [
        contribution({ id: `c-${index}-1`, userId: "u1", roundNumber: index + 1 }),
        contribution({
          id: `c-${index}-2`,
          userId: "u2",
          roundNumber: index + 1,
          status: index % 3 === 0 ? "failed" : "confirmed",
        }),
      ],
    }))

    const summaries = summariseRounds(many, { maxMembers: 4 })

    expect(summaries).toHaveLength(60)
    expect(summaries[0].roundNumber).toBe(60)
    expect(summaries[59].roundNumber).toBe(1)
    // Every summary is independent and finite.
    expect(summaries.every((s) => Number.isFinite(s.participationRate))).toBe(true)
  })
})

describe("overallParticipation", () => {
  it("averages across rounds", () => {
    const summaries = summariseRounds(
      [
        { roundNumber: 1, contributions: [contribution(), contribution({ id: "b", userId: "u2" })] },
        { roundNumber: 2, contributions: [contribution()] },
      ],
      { maxMembers: 2 },
    )

    // 2/2 then 1/2 => 3 of 4 expected participants.
    expect(overallParticipation(summaries)).toBe(0.75)
  })

  it("returns 0 for no rounds rather than dividing by zero", () => {
    expect(overallParticipation([])).toBe(0)
    expect(Number.isNaN(overallParticipation([]))).toBe(false)
  })
})
