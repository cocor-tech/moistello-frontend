import type { Contribution } from "@/types"

/**
 * Contribution summary maths (#470).
 *
 * Pure functions with no React and no formatting, so the figures on the card
 * can be asserted directly against an API response. That matters because the
 * acceptance criterion is "matches backend figures exactly": the total has to be
 * the sum of the records the API returned, not a re-derived or rounded variant
 * of it.
 *
 * Two deliberate choices, both documented because they are easy to misread:
 *
 *  - `totalContributed` sums **every** contribution in the response. The
 *    backend's own `summary.totalContributed` does the same, so the two agree.
 *  - `currentStreak` counts only **confirmed** contributions. A pending or
 *    failed contribution is money that has not landed yet and should not
 *    sustain a savings streak.
 */

/** Trend window: 6 periods of 1 week. */
export const TREND_PERIOD_COUNT = 6
export const TREND_PERIOD_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Only these sustain a streak. */
const STREAK_ELIGIBLE_STATUSES = new Set<Contribution["status"]>(["confirmed"])

export interface TrendPoint {
  /** Inclusive start of the period, as an ISO date (YYYY-MM-DD). */
  periodStart: string
  /** Index from oldest (0) to newest (TREND_PERIOD_COUNT - 1). */
  index: number
  /** Sum of contribution amounts inside the period. */
  amount: number
  count: number
}

export interface ContributionSummary {
  /** Exact sum of every contribution's amount. */
  totalContributed: number
  confirmedTotal: number
  contributionCount: number
  confirmedCount: number
  /** Consecutive eligible periods, counting back from the newest. */
  currentStreak: number
  trend: TrendPoint[]
  periodDays: number
  periodCount: number
  /** True when there is nothing at all to show. */
  isEmpty: boolean
}

/** ISO date (YYYY-MM-DD) for a Date, in UTC. */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Start-of-day for a Date, in UTC. Bucket boundaries must not drift by timezone. */
function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function sumContributed(contributions: readonly Contribution[]): number {
  // Summing in integer cents first avoids the float drift that makes a displayed
  // total disagree with the backend by a cent on a long list.
  const cents = contributions.reduce((total, c) => total + Math.round(c.amount * 100), 0)
  return cents / 100
}

export function isStreakEligible(contribution: Contribution): boolean {
  return STREAK_ELIGIBLE_STATUSES.has(contribution.status)
}

/**
 * Buckets contributions into `count` fixed periods of `days`, ending with the
 * period containing `now`.
 *
 * Bucketing is anchored to the start of the current UTC day, so the boundaries
 * do not shift with the viewer's timezone — otherwise the same data would
 * produce a different chart in Lagos and in Lagos-adjacent timezones.
 */
export function buildTrend(
  contributions: readonly Contribution[],
  now: Date = new Date(),
  count: number = TREND_PERIOD_COUNT,
  days: number = TREND_PERIOD_DAYS,
): TrendPoint[] {
  const today = startOfUtcDay(now)
  const oldest = new Date(today.getTime() - (count - 1) * days * MS_PER_DAY)

  const buckets: TrendPoint[] = Array.from({ length: count }, (_, index) => ({
    periodStart: toIsoDate(new Date(oldest.getTime() + index * days * MS_PER_DAY)),
    index,
    amount: 0,
    count: 0,
  }))

  for (const contribution of contributions) {
    const at = startOfUtcDay(new Date(contribution.createdAt))
    // Skip anything outside the window rather than clamping it into the oldest
    // bucket, which would silently inflate that period.
    if (at < oldest || at > today) continue

    const offset = Math.floor((at.getTime() - oldest.getTime()) / (days * MS_PER_DAY))
    const bucket = buckets[offset]
    if (!bucket) continue

    bucket.amount = Math.round((bucket.amount + contribution.amount) * 100) / 100
    bucket.count += 1
  }

  return buckets
}

/**
 * Consecutive eligible periods, newest-first.
 *
 * The in-progress period is given a grace period: if nothing has landed yet
 * *this* week, the streak started last week is still running rather than
 * displaying as zero from Monday morning.
 *
 * `now` is a parameter rather than an internal `new Date()` so that the answer
 * is consistent with the `now` the trend was bucketed against. Reading the real
 * clock here made the function disagree with `buildTrend` for any caller
 * passing a fixed clock, and made it impossible to test a mid-window state.
 */
export function computeCurrentStreak(
  trend: readonly TrendPoint[],
  contributions: readonly Contribution[],
  now: Date = new Date(),
  periodDays: number = TREND_PERIOD_DAYS,
): number {
  if (trend.length === 0) return 0

  const eligibleByPeriod = new Map<string, number>()
  const today = startOfUtcDay(now)
  const oldest = startOfUtcDay(new Date(trend[0].periodStart))

  for (const contribution of contributions) {
    if (!isStreakEligible(contribution)) continue
    const at = startOfUtcDay(new Date(contribution.createdAt))
    if (at < oldest || at > today) continue
    const offset = Math.floor((at.getTime() - oldest.getTime()) / (periodDays * MS_PER_DAY))
    const key = toIsoDate(new Date(oldest.getTime() + offset * periodDays * MS_PER_DAY))
    eligibleByPeriod.set(key, (eligibleByPeriod.get(key) ?? 0) + 1)
  }

  let streak = 0
  let started = false

  // Walk newest -> oldest, allowing the current period to be empty exactly once.
  for (let i = trend.length - 1; i >= 0; i--) {
    const point = trend[i]
    const hasEligible = (eligibleByPeriod.get(point.periodStart) ?? 0) > 0

    if (hasEligible) {
      streak += 1
      started = true
      continue
    }

    if (!started && i === trend.length - 1) continue // grace for the live period
    break
  }

  return streak
}

export function buildContributionSummary(
  contributions: readonly Contribution[],
  now: Date = new Date(),
): ContributionSummary {
  const list = Array.isArray(contributions) ? contributions : []
  const confirmed = list.filter(isStreakEligible)
  const trend = buildTrend(list, now)

  return {
    totalContributed: sumContributed(list),
    confirmedTotal: sumContributed(confirmed),
    contributionCount: list.length,
    confirmedCount: confirmed.length,
    currentStreak: computeCurrentStreak(trend, list, now),
    trend,
    periodDays: TREND_PERIOD_DAYS,
    periodCount: TREND_PERIOD_COUNT,
    isEmpty: list.length === 0,
  }
}

/**
 * Percentage change between the newest completed period and the one before it.
 * Returns `null` when there is no meaningful baseline, so the card can show an
 * em dash rather than a fabricated "+100%".
 */
export function periodOverPeriodChange(trend: readonly TrendPoint[]): number | null {
  if (trend.length < 2) return null

  const previous = trend[trend.length - 2].amount
  const current = trend[trend.length - 1].amount

  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
