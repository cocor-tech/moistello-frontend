"use client"

import { useMemo, useState } from "react"
import { CalendarClock } from "lucide-react"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { EmptyState } from "@/components/shared/empty-state"
import { TimelineRound } from "./timeline-round-row"
import { overallParticipation, summariseRounds } from "./summarise-rounds"
import type { CircleMember, CircleRound } from "@/types"

/**
 * How many rounds are mounted before the reader asks for more.
 *
 * The acceptance criterion is 50+ rounds without a performance problem, and the
 * cost that actually matters is the *detail* rows: a 50-member circle over 50
 * rounds is 2,500 member rows. Collapsing by default already removes all of
 * them. This bound removes the remaining summary rows too, so a 200-round
 * circle mounts the same node count as a 20-round one.
 *
 * Deliberately a plain count rather than a virtualiser: that would need a
 * dependency and a scroll-anchoring behaviour the page has no other use for.
 */
const INITIAL_VISIBLE_ROUNDS = 20
const VISIBLE_ROUND_STEP = 20

interface RoundHistoryTimelineProps {
  rounds: CircleRound[]
  members?: CircleMember[]
  maxMembers?: number
  contributionAmount?: number
  currentRound?: number
  currency?: string
  /** Circle name, used in the empty state's copy. */
  circleName?: string
}

export function RoundHistoryTimeline({
  rounds,
  members = [],
  maxMembers = 0,
  contributionAmount = 0,
  currentRound = 0,
  currency = "USDC",
  circleName = "this circle",
}: RoundHistoryTimelineProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROUNDS)

  // Recomputed only when the data itself changes — not when a row is expanded,
  // so opening a round never re-sorts or re-counts the whole history.
  const summaries = useMemo(
    () => summariseRounds(rounds, { maxMembers, contributionAmount, members }),
    [rounds, maxMembers, contributionAmount, members],
  )

  const visible = useMemo(() => summaries.slice(0, visibleCount), [summaries, visibleCount])
  const participation = useMemo(() => overallParticipation(summaries), [summaries])

  if (summaries.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-6 w-6" />}
        title="No rounds yet"
        description={`${circleName} has not started its first round yet. Once the circle is running, every round will appear here with its participation and payout.`}
      />
    )
  }

  const hiddenCount = summaries.length - visible.length
  const payoutCount = summaries.filter((summary) => summary.payout).length
  const totalPaidOut = summaries.reduce(
    (total, summary) => total + (summary.payout?.amount ?? 0),
    0,
  )

  return (
    <section aria-labelledby="round-history-heading" className="space-y-6">
      {/* The three figures a member opens this view for, read as a row rather
          than hunted for down the timeline. */}
      <div className="grid gap-px overflow-hidden border-y border-border bg-border sm:grid-cols-3">
        <StatCell
          label="Rounds recorded"
          value={String(summaries.length)}
          hint={currentRound > 0 ? `Round ${currentRound} in progress` : undefined}
        />
        <StatCell
          label="Avg participation"
          value={formatPercentage(participation, 0)}
          hint={`Across all ${summaries.length} rounds`}
        />
        <StatCell
          label="Total paid out"
          value={formatCurrency(totalPaidOut, currency)}
          hint={`${payoutCount} completed payout${payoutCount === 1 ? "" : "s"}`}
        />
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <h2 id="round-history-heading" className="font-heading text-lg font-semibold text-foreground">
          Round history
        </h2>
        <p className="text-2xs uppercase tracking-wider text-muted-foreground">Newest first</p>
      </div>

      {/* The spine. Drawn once behind the dots rather than as a border on each
          row — a per-row border double-prints at every join. */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute bottom-6 left-[1.4375rem] top-6 w-px bg-gradient-to-b from-emerald-400/60 via-aurora-violet/30 to-transparent"
        />

        <ol className="space-y-3">
          {visible.map((summary) => (
            <TimelineRound
              key={summary.roundNumber}
              summary={summary}
              currency={currency}
              currentRound={currentRound}
              expanded={expandedRound === summary.roundNumber}
              onToggle={() =>
                setExpandedRound((current) =>
                  current === summary.roundNumber ? null : summary.roundNumber,
                )
              }
            />
          ))}
        </ol>
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + VISIBLE_ROUND_STEP)}
          className="focus-ring w-full rounded-lg border border-dashed border-border py-3 text-xs font-heading uppercase tracking-wider text-muted-foreground transition-colors hover:border-aurora-violet/40 hover:text-foreground"
        >
          Show {Math.min(hiddenCount, VISIBLE_ROUND_STEP)} earlier rounds
        </button>
      )}
    </section>
  )
}

function StatCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-background/80 px-4 py-4">
      <p className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-2xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
