"use client"

import { memo } from "react"
import { ChevronDown, Users, WalletCards, CalendarClock, TrendingUp } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatCurrency, formatDate, formatAddress } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { RoundDetail } from "./round-history-detail"
import type { RoundSummary } from "./summarise-rounds"

export interface TimelineRoundProps {
  summary: RoundSummary
  currency: string
  currentRound: number
  expanded: boolean
  onToggle: () => void
}

/**
 * One round in the timeline: the summary always, the detail only when open.
 *
 * Memoised because the list re-renders whenever any row is toggled, and
 * without this every row would reconcile even though its own props are
 * unchanged. `onToggle` is a fresh closure per row, but `expanded` changes for
 * at most two rows per interaction, so the comparison still does its job.
 */
export const TimelineRound = memo(function TimelineRound({
  summary,
  currency,
  currentRound,
  expanded,
  onToggle,
}: TimelineRoundProps) {
  const isCurrent = summary.roundNumber === currentRound
  const isCompleted = summary.roundNumber < currentRound
  const detailId = `round-${summary.roundNumber}-detail`
  const percent = Math.round(summary.participationRate * 100)

  return (
    <li className="relative pl-14">
      {/* Dot sits on the spine. Colour encodes state; the glyph is decorative
          because the same status is stated in text beside it. */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-4 flex h-11 w-11 items-center justify-center rounded-full border-2 font-heading text-sm font-bold",
          isCompleted && "border-emerald-400/70 bg-emerald-500/15 text-emerald-400",
          isCurrent && "border-aurora-violet bg-aurora-violet/20 text-aurora-violet",
          !isCompleted && !isCurrent && "border-border text-muted-foreground",
        )}
      >
        {summary.roundNumber}
      </div>

      <div
        className={cn(
          "border-l-2 bg-background/40 transition-colors",
          expanded ? "border-aurora-violet" : "border-transparent hover:border-border",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="focus-ring flex w-full items-center gap-4 px-4 py-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-sm font-semibold text-foreground">
                Round {summary.roundNumber}
              </span>
              {isCurrent && (
                <Badge variant="primary" size="sm">
                  In progress
                </Badge>
              )}
              {summary.lateCount > 0 && (
                <Badge variant="warning" size="sm">
                  {summary.lateCount} late
                </Badge>
              )}
            </div>

            {/* Pill row rather than a table: the summary is three scalars, and
                inline pills keep them scannable down a long timeline. */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                {summary.date ? formatDate(summary.date) : "No activity yet"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {summary.participatedCount}/{summary.expectedParticipants} contributed
              </span>
              {summary.payout ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <WalletCards className="h-3 w-3" aria-hidden="true" />
                  {formatCurrency(summary.payout.amount, currency)} to{" "}
                  {formatAddress(summary.payout.recipientId)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  {formatCurrency(summary.settledAmount, currency)} collected
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Participation doubles as the row's progress meter, so the eye can
                scan a long history for dips without reading any numbers. */}
            <div
              className="hidden sm:block"
              role="img"
              aria-label={`${percent}% participation`}
            >
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full",
                    percent >= 80
                      ? "bg-emerald-400"
                      : percent >= 50
                        ? "bg-aurora-violet"
                        : "bg-amber-400",
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                />
              </div>
            </div>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          </div>
        </button>

        {/* Mounted only while open. This is the whole performance story: the
            per-member rows exist for exactly one round at a time. */}
        {expanded && (
          <div id={detailId} className="border-t border-border/60 px-4 pb-4 pt-3">
            <RoundDetail summary={summary} currency={currency} />
          </div>
        )}
      </div>
    </li>
  )
})
