import type { CircleMember, CircleRound, Contribution, Payout } from "@/types"

/**
 * Round history summarisation.
 *
 * Kept free of React so the participation arithmetic can be tested directly —
 * it is the part of the timeline most likely to be quietly wrong, because a
 * divide-by-zero shows up as a perfectly plausible "0%" rather than a crash.
 *
 * The rules, stated once here so the UI never has to re-derive them:
 *
 * 1. A member "participated" when their contribution *settled* — confirmed or
 *    late. A failed contribution did not move money, so counting it would
 *    report healthy participation for a round where people were charged and
 *    nothing landed.
 * 2. The denominator is how many members were expected to contribute, which is
 *    never allowed to fall below the number who actually did. Otherwise a
 *    circle that shrank mid-run reports participation above 100%.
 * 3. A round's date is its last recorded activity — the most recent settled
 *    contribution, else the payout. A round that has not happened yet has none.
 */

export interface RoundParticipant {
  userId: string
  /** Resolved from the member list; null when the member is unknown. */
  name: string | null
  amount: number
  status: Contribution["status"]
  onTime: boolean
  createdAt: string
  settled: boolean
}

export interface RoundSummary {
  roundNumber: number
  /** ISO timestamp of the round's last activity, or null if it never happened. */
  date: string | null
  settledAmount: number
  /** `contributionAmount * expectedParticipants` — what a full round collects. */
  expectedAmount: number
  participatedCount: number
  expectedParticipants: number
  /** 0–1. Exactly 0 when nobody was expected, never NaN. */
  participationRate: number
  lateCount: number
  payout: Payout | null
  participants: RoundParticipant[]
}

export interface SummariseOptions {
  /** Configured circle size. */
  maxMembers?: number
  contributionAmount?: number
  /** Used to label contributors by name rather than raw id. */
  members?: CircleMember[]
  /** Round currently in progress, used to label status. */
  currentRound?: number
}

/** Money actually moved: confirmed, or late but still settled. */
function isSettled(contribution: Contribution): boolean {
  return contribution.status === "confirmed" || contribution.status === "late"
}

/**
 * Last valid timestamp of the given ISO strings.
 *
 * Returns null rather than an `Invalid Date`, because an unparseable date would
 * otherwise render as "NaN" in the timeline and read as real data.
 */
function latestIso(values: Array<string | null | undefined>): string | null {
  let latest: number | null = null

  for (const value of values) {
    if (!value) continue
    const parsed = Date.parse(value)
    if (Number.isNaN(parsed)) continue
    if (latest === null || parsed > latest) latest = parsed
  }

  return latest === null ? null : new Date(latest).toISOString()
}

export function summariseRound(
  round: CircleRound,
  { maxMembers = 0, contributionAmount = 0, members = [] }: SummariseOptions = {},
): RoundSummary {
  // A member can have more than one contribution in a round (a retry after a
  // failed payment). Counting rows would report one person as two
  // participants, so participation is counted per distinct user.
  const participants: RoundParticipant[] = round.contributions.map((contribution) => {
    const member = members.find((item) => item.userId === contribution.userId)
    return {
      userId: contribution.userId,
      name: member?.userName ?? null,
      amount: contribution.amount,
      status: contribution.status,
      onTime: contribution.onTime,
      createdAt: contribution.createdAt,
      settled: isSettled(contribution),
    }
  })

  const settledParticipants = participants.filter((item) => item.settled)

  const participatedCount = new Set(settledParticipants.map((item) => item.userId)).size

  // Rule 2: never divide by a denominator smaller than the numerator.
  const expectedParticipants = Math.max(maxMembers, participants.length)

  const participationRate =
    expectedParticipants > 0 ? participatedCount / expectedParticipants : 0

  return {
    roundNumber: round.roundNumber,
    date: latestIso([
      ...round.contributions.map((contribution) => contribution.createdAt),
      round.payout?.createdAt,
    ]),
    settledAmount: settledParticipants.reduce((total, item) => total + item.amount, 0),
    expectedAmount: contributionAmount * expectedParticipants,
    participatedCount,
    expectedParticipants,
    participationRate,
    lateCount: participants.filter((item) => item.settled && !item.onTime).length,
    payout: round.payout ?? null,
    participants,
  }
}

/**
 * Newest round first, and stable for equal round numbers.
 *
 * Sorting on round number alone (rather than the `date` field) means a round
 * with an unparseable date still lands in a sensible position instead of
 * drifting to the end.
 */
export function summariseRounds(
  rounds: CircleRound[],
  options: SummariseOptions = {},
): RoundSummary[] {
  return [...rounds]
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .map((round) => summariseRound(round, options))
}

/** Aggregate participation across every round — the headline figure. */
export function overallParticipation(summaries: RoundSummary[]): number {
  const expected = summaries.reduce((total, summary) => total + summary.expectedParticipants, 0)
  if (expected === 0) return 0

  const participated = summaries.reduce((total, summary) => total + summary.participatedCount, 0)
  return participated / expected
}
