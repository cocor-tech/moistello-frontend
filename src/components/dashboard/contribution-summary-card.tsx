"use client"

import { useId, useMemo } from "react"
import { Coins, Flame, TrendingDown, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import {
  buildContributionSummary,
  periodOverPeriodChange,
  TREND_PERIOD_COUNT,
  type ContributionSummary,
  type TrendPoint,
} from "@/lib/contributions/summary"
import type { Contribution } from "@/types"

/**
 * Contribution summary card (#470).
 *
 * Shows three things the dashboard was missing: the user's own total, their
 * current saving streak, and a 6-period trend.
 *
 * The sparkline is hand-rolled SVG because the repo has no chart library, and it
 * is *not* the accessible content: an SVG path conveys nothing to a screen
 * reader, so the trend is also emitted as prose ("up 20 over the last 6 weeks,
 * most recent week 45") and as a visually-hidden table. `role="img"` with an
 * `aria-label` names the graphic; the table carries the same data in a form that
 * can actually be read out.
 *
 * Styling follows AGENTS.md: no `glass*` and no `rounded-2xl`, and it uses three
 * distinct layout devices (directional border accent, oversized figure,
 * dashed divider) so it does not read as another dashboard card.
 */

const VIEW_W = 132
const VIEW_H = 34
const PAD = 3

interface ScaledPoint {
  x: number
  y: number
  amount: number
}

/**
 * Maps trend amounts into the sparkline's coordinate space once, so the line
 * and the dots cannot drift apart.
 */
function scaleTrend(trend: readonly TrendPoint[]): ScaledPoint[] {
  if (trend.length === 0) return []

  const max = Math.max(...trend.map((p) => p.amount), 0)
  const min = Math.min(...trend.map((p) => p.amount), 0)
  const span = max - min
  const stepX = trend.length > 1 ? (VIEW_W - PAD * 2) / (trend.length - 1) : 0
  const usable = VIEW_H - PAD * 2

  return trend.map((point, i) => ({
    x: round(PAD + i * stepX),
    // A flat series (span === 0) would divide by zero; centre it instead.
    y: round(span === 0 ? VIEW_H / 2 : VIEW_H - PAD - ((point.amount - min) / span) * usable),
    amount: point.amount,
  }))
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function describeTrend(
  trend: readonly TrendPoint[],
  periodDays: number,
  currency = "USDC",
): string {
  if (trend.length === 0) return "No trend data yet."
  // Six empty buckets is a real shape but a useless description; saying so is
  // more honest than announcing "total 0, most recent 0, highest 0".
  if (trend.every((point) => point.amount === 0)) return "No trend data yet."

  const newest = trend[trend.length - 1]
  const total = trend.reduce((sum, p) => sum + p.amount, 0)
  const peak = trend.reduce((best, p) => (p.amount > best.amount ? p : best), trend[0])
  const periodLabel = `${trend.length} ${periodDays === 1 ? "day" : "week"}${trend.length === 1 ? "" : "s"}`

  return (
    `Contribution trend over the last ${periodLabel}: ` +
    `total ${formatCurrency(total, currency)}, ` +
    `most recent period ${formatCurrency(newest.amount, currency)}, ` +
    `highest period ${formatCurrency(peak.amount, currency)} starting ${peak.periodStart}.`
  )
}

export interface ContributionSummaryCardProps {
  /** Exactly the records the API returned — the total is their exact sum. */
  contributions: Contribution[]
  currency?: string
  isLoading?: boolean
  /** Rendered when the request failed, alongside a retry affordance. */
  error?: string | null
  onRetry?: () => void
}

export function ContributionSummaryCard({
  contributions,
  currency = "USDC",
  isLoading = false,
  error = null,
  onRetry,
}: ContributionSummaryCardProps) {
  const captionId = useId()

  const summary: ContributionSummary = useMemo(
    () => buildContributionSummary(contributions),
    [contributions],
  )
  const change = useMemo(() => periodOverPeriodChange(summary.trend), [summary.trend])
  const trendDescription = useMemo(
    () => describeTrend(summary.trend, summary.periodDays, currency),
    [summary.trend, summary.periodDays, currency],
  )
  const scaled = useMemo(() => scaleTrend(summary.trend), [summary.trend])

  // A user with no contributions has a 0% change, and "+0% vs previous week"
  // is noise rather than information. Suppress it until there is something to
  // compare.
  const showChange = !summary.isEmpty && change !== null

  if (error) {
    return (
      <section
        aria-label="Contribution summary"
        className="border-y border-border border-l-4 border-l-aurora-cyan py-6 pl-6"
      >
        <p className="font-heading text-lg font-semibold text-foreground">
          Contribution summary unavailable
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm text-aurora-violet hover:underline"
          >
            Retry
          </button>
        )}
      </section>
    )
  }

  if (isLoading) {
    return (
      <section
        aria-label="Contribution summary"
        aria-busy="true"
        className="border-y border-border border-l-4 border-l-aurora-cyan py-6 pl-6"
      >
        <div className="h-3 w-28 animate-pulse bg-white/5" />
        <div className="mt-3 h-10 w-40 animate-pulse bg-white/5" />
      </section>
    )
  }

  return (
    <section
      aria-label="Contribution summary"
      className="border-y border-border border-l-4 border-l-aurora-cyan py-6 pl-6"
    >
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-aurora-cyan">
        Your savings
      </p>

      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xs uppercase tracking-wider text-muted-foreground">Total contributed</p>
          <p
            data-testid="contribution-total"
            className="font-heading text-4xl font-black leading-none text-foreground sm:text-5xl"
          >
            {formatCurrency(summary.totalContributed, currency)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Coins aria-hidden className="h-3.5 w-3.5 text-aurora-violet" />
            {summary.contributionCount} contribution{summary.contributionCount === 1 ? "" : "s"}
            {summary.confirmedCount !== summary.contributionCount && (
              <> · {summary.confirmedCount} confirmed</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Flame aria-hidden className="h-4 w-4 text-amber-400" />
          <span className="font-heading text-2xl font-bold text-foreground">
            {summary.currentStreak}
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            week{summary.currentStreak === 1 ? "" : "s"} in a row
          </span>
        </div>
      </div>

      {showChange && (
        <p
          className={`mt-3 inline-flex items-center gap-1 text-xs ${
            change >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {change >= 0 ? (
            <TrendingUp aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown aria-hidden className="h-3.5 w-3.5" />
          )}
          {change >= 0 ? "+" : ""}
          {change}% vs previous week
        </p>
      )}

      <div className="mt-5 border-t border-dashed border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xs uppercase tracking-wider text-muted-foreground">
            Last {TREND_PERIOD_COUNT} weeks
          </h3>
          {!showChange && !summary.isEmpty && (
            <span className="text-2xs text-muted-foreground">no prior period to compare</span>
          )}
        </div>

        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={trendDescription}
          aria-describedby={captionId}
          className="mt-2 h-10 w-full max-w-[220px] overflow-visible"
        >
          <polyline
            points={scaled.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-aurora-cyan"
          />
          {scaled.map((point, i) => (
            <circle
              key={summary.trend[i].periodStart}
              cx={point.x}
              cy={point.y}
              r="1.6"
              className="fill-aurora-cyan"
            />
          ))}
        </svg>

        {/* The sparkline's text alternative: the same numbers, readable. */}
        <p id={captionId} className="sr-only">
          {trendDescription}
        </p>
        <table className="sr-only">
          <caption>Contribution trend by week</caption>
          <thead>
            <tr>
              <th scope="col">Week starting</th>
              <th scope="col">Amount</th>
              <th scope="col">Contributions</th>
            </tr>
          </thead>
          <tbody>
            {summary.trend.map((point) => (
              <tr key={point.periodStart}>
                <th scope="row">{point.periodStart}</th>
                <td>{formatCurrency(point.amount, currency)}</td>
                <td>{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ContributionSummaryCard
