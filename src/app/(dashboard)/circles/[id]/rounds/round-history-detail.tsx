"use client"

import { CircleCheck, Clock, UserX, Users } from "lucide-react"
import { formatCurrency, formatDate, formatAddress } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import type { RoundSummary } from "./summarise-rounds"

/**
 * Per-member detail for one expanded round.
 *
 * Split out of the timeline so the two can be reasoned about separately: the
 * timeline owns *when* detail is mounted, this owns what is in it. It is only
 * ever rendered for the single open round.
 */
export function RoundDetail({
  summary,
  currency,
}: {
  summary: RoundSummary
  currency: string
}) {
  if (summary.participants.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <UserX className="h-4 w-4 shrink-0" aria-hidden="true" />
        No contributions were recorded in round {summary.roundNumber}.
      </p>
    )
  }

  const percent = Math.round(summary.participationRate * 100)

  return (
    <div className="space-y-4">
      {/* Settlement summary, stated in words as well as numbers — a rate on its
          own does not say whether the shortfall was nobody paying or everyone
          paying late. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono font-semibold tabular-nums">
            {summary.participatedCount} of {summary.expectedParticipants}
          </span>
          <span className="text-muted-foreground">members contributed</span>
        </p>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {formatCurrency(summary.settledAmount, currency)}
          {summary.expectedAmount > 0 && (
            <span className="text-2xs"> of {formatCurrency(summary.expectedAmount, currency)}</span>
          )}
        </p>
      </div>

      {percent < 100 && (
        <p className="text-2xs text-amber-400">
          {summary.expectedParticipants - summary.participatedCount} member
          {summary.expectedParticipants - summary.participatedCount === 1 ? "" : "s"} did not
          contribute this round.
        </p>
      )}

      {/* Named so a screen reader announces "Members in round 3, list of 6"
          rather than an unlabelled list — and so the count can be asserted
          against the detail alone, not the timeline rows around it. */}
      <ul className="space-y-1.5" aria-label={`Members in round ${summary.roundNumber}`}>
        {summary.participants.map((participant, index) => (
          <li
            // A member can appear twice in a round after a retry, so the
            // contribution id is not available here and the index is the only
            // thing that distinguishes them.
            key={`${participant.userId}-${index}`}
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-3 py-2 text-sm",
              participant.settled ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
              aria-hidden="true"
            >
              {participant.settled ? (
                <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-amber-400" />
              )}
            </span>

            <span className="min-w-0 flex-1 truncate">
              {participant.name ?? formatAddress(participant.userId)}
            </span>

            <span className="font-mono tabular-nums">
              {formatCurrency(participant.amount, currency)}
            </span>

            {/* The status is text, not a colour alone — a red dot is invisible
                to a screen reader and to a colourblind reader. */}
            <span
              className={cn(
                "w-20 shrink-0 text-right text-2xs uppercase tracking-wider",
                participant.settled
                  ? participant.onTime
                    ? "text-emerald-400"
                    : "text-amber-400"
                  : "text-red-400",
              )}
            >
              {participant.settled
                ? participant.onTime
                  ? "On time"
                  : "Late"
                : participant.status}
            </span>
          </li>
        ))}
      </ul>

      {summary.payout && (
        <p className="border-t border-border/60 pt-3 text-2xs text-muted-foreground">
          Paid {formatCurrency(summary.payout.amount, currency)} to{" "}
          {formatAddress(summary.payout.recipientId)} on{" "}
          {formatDate(summary.payout.createdAt)}.
        </p>
      )}
    </div>
  )
}
