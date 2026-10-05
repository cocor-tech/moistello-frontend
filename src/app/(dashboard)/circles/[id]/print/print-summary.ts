/**
 * Derives the figures a printed circle summary needs, from the records the
 * API already returns.
 *
 * Pure functions — no React, no network, no DOM. The print view renders these
 * rows directly, and the calculations stay testable without a browser, which
 * matters because this is the path an organizer relies on when the meeting
 * has no connectivity.
 */

import type { Circle, CircleMember, CircleRound, Contribution, Payout } from "@/types"

/** Counts as settled money: on time or late but still collected. */
const SETTLED_STATUSES = new Set<Contribution["status"]>(["confirmed", "late"])

export interface MemberBalance {
  userId: string
  displayName: string
  position: number
  status: CircleMember["status"]
  userAddress?: string | null
  /** Number of rounds where a settled contribution was recorded. */
  roundsContributed: number
  /** Total settled contributions made by this member. */
  totalContributed: number
  /** Rounds this member is still expected to pay. */
  outstandingRounds: number
  /** Payouts this member has received, in the currency of the circle. */
  totalReceived: number
  /** Rounds in which this member received a payout. */
  roundsReceived: number
  /**
   * `totalReceived - totalContributed`. Positive means the member has taken
   * more out of the circle than they have put in, which is expected early in
   * a ROSCA and only notable at the end.
   */
  netPosition: number
  /** Rounds where this member's contribution was recorded late. */
  lateRounds: number
}

export interface RoundSummary {
  roundNumber: number
  /** `completed` past the current round, `current`, else `upcoming`. */
  state: "completed" | "current" | "upcoming"
  settledCount: number
  settledAmount: number
  /** Contribution amount × settled members, i.e. the pool if everyone paid. */
  expectedAmount: number
  /** Members who have not settled for this round. */
  missingCount: number
  payoutAmount?: number
  payoutRecipientId?: string
  payoutRecipientName?: string
  payoutDate?: string
}

export interface CircleSummary {
  members: MemberBalance[]
  rounds: RoundSummary[]
  /** Sum of every settled contribution across all rounds. */
  totalCollected: number
  /** Sum of every payout issued. */
  totalPaidOut: number
  /** `totalCollected - totalPaidOut`; the pot still held by the circle. */
  outstandingBalance: number
  roundsCompleted: number
  roundsOutstanding: number
}

function memberLabel(member: CircleMember): string {
  return member.userName?.trim() || "Anonymous"
}

function nameForUserId(
  userId: string,
  members: readonly CircleMember[],
  byUserId: ReadonlyMap<string, CircleMember>,
): string {
  const direct = byUserId.get(userId)
  if (direct) return memberLabel(direct)
  const byAddress = members.find(
    (member) => member.userId === userId || member.userAddress === userId,
  )
  return byAddress ? memberLabel(byAddress) : userId
}

/**
 * Per-member ledger: what each member has paid in, taken out, and still owes.
 *
 * Members are returned in `position` order, which is the order a printed
 * summary should read in — position determines payout order, so it is the
 * only ordering an organizer can act on.
 */
export function buildMemberBalances(
  members: readonly CircleMember[],
  rounds: readonly CircleRound[],
): MemberBalance[] {
  const settledRoundsByUser = new Map<string, Contribution[]>()
  const receivedByUser = new Map<string, Payout[]>()

  for (const round of rounds) {
    for (const contribution of round.contributions) {
      if (!SETTLED_STATUSES.has(contribution.status)) continue
      settledRoundsByUser.set(contribution.userId, [
        ...(settledRoundsByUser.get(contribution.userId) ?? []),
        contribution,
      ])
    }
    if (round.payout) {
      receivedByUser.set(round.payout.recipientId, [
        ...(receivedByUser.get(round.payout.recipientId) ?? []),
        round.payout,
      ])
    }
  }

  return [...members]
    .sort((a, b) => a.position - b.position)
    .map((member) => {
      const settled = settledRoundsByUser.get(member.userId) ?? []
      const received = receivedByUser.get(member.userId) ?? []
      const totalContributed = settled.reduce((sum, c) => sum + c.amount, 0)
      const totalReceived = received.reduce((sum, p) => sum + p.amount, 0)

      return {
        userId: member.userId,
        displayName: memberLabel(member),
        position: member.position,
        status: member.status,
        userAddress: member.userAddress,
        roundsContributed: settled.length,
        totalContributed,
        outstandingRounds: Math.max(rounds.length - settled.length, 0),
        totalReceived,
        roundsReceived: received.length,
        netPosition: totalReceived - totalContributed,
        lateRounds: settled.filter((c) => c.status === "late").length,
      }
    })
}

/** Per-round collection progress, ordered by round number ascending. */
export function buildRoundSummaries(
  rounds: readonly CircleRound[],
  circle: Pick<Circle, "currentRound" | "contributionAmount" | "maxMembers">,
  members: readonly CircleMember[],
): RoundSummary[] {
  const byUserId = new Map(members.map((member) => [member.userId, member]))

  return [...rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => {
      const settled = round.contributions.filter((c) => SETTLED_STATUSES.has(c.status))
      const settledAmount = settled.reduce((sum, c) => sum + c.amount, 0)
      // A member who has left or been removed is not expected to pay, so
      // counting them would understate collection on every round.
      const activeMembers = members.filter(
        (member) => member.status !== "left" && member.status !== "removed",
      )
      const expectedAmount = circle.contributionAmount * activeMembers.length
      const settledIds = new Set(settled.map((c) => c.userId))
      const missingCount = activeMembers.filter((member) => !settledIds.has(member.userId)).length

      return {
        roundNumber: round.roundNumber,
        state:
          round.roundNumber < circle.currentRound
            ? ("completed" as const)
            : round.roundNumber === circle.currentRound
              ? ("current" as const)
              : ("upcoming" as const),
        settledCount: settled.length,
        settledAmount,
        expectedAmount,
        missingCount,
        payoutAmount: round.payout?.amount,
        payoutRecipientId: round.payout?.recipientId,
        payoutRecipientName: round.payout
          ? nameForUserId(round.payout.recipientId, members, byUserId)
          : undefined,
        payoutDate: round.payout?.createdAt,
      }
    })
}

/** Roll-up shown at the top of a printed summary. */
export function buildCircleSummary(
  circle: Circle,
  members: readonly CircleMember[],
  rounds: readonly CircleRound[],
): CircleSummary {
  const memberBalances = buildMemberBalances(members, rounds)
  const roundSummaries = buildRoundSummaries(rounds, circle, members)

  const totalCollected = roundSummaries.reduce((sum, r) => sum + r.settledAmount, 0)
  const totalPaidOut = roundSummaries.reduce((sum, r) => sum + (r.payoutAmount ?? 0), 0)

  return {
    members: memberBalances,
    rounds: roundSummaries,
    totalCollected,
    totalPaidOut,
    outstandingBalance: totalCollected - totalPaidOut,
    roundsCompleted: roundSummaries.filter((r) => r.state === "completed").length,
    roundsOutstanding: roundSummaries.reduce((sum, r) => sum + r.missingCount, 0),
  }
}
