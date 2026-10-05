"use client"

import { Printer } from "lucide-react"

import { formatCurrency, formatDate } from "@/lib/formatters"
import { useCircle, useCircleMembers, useCircleRounds } from "@/hooks/use-circles"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ButtonLink } from "@/components/ui/button"
import { PrintCircleTerms, PrintMembersTable, PrintRoundsTable } from "./print-tables"
import { PrintSection, PrintStat } from "./print-primitives"
import { PrintButton } from "./print-button"
import { buildCircleSummary } from "./print-summary"

/**
 * Dedicated print view for a circle.
 *
 * Reached from the circle detail page. The point of a separate route rather
 * than relying on `@media print` alone is that organizers need one clean
 * document per meeting — the on-screen page interleaves modals, skeletons and
 * interactive affordances that produce an unusable sheet. This route renders
 * only the record: terms, members with balances, and rounds.
 *
 * The page is deliberately plain. Every rule in `@media print` in globals.css
 * also applies, so printing from the browser button and hitting the URL
 * directly produce the same sheet.
 */
export default function CirclePrintPage({ params }: { params: { id: string } }) {
  const circleId = params.id
  const { data: circle, isLoading: circleLoading, isError: circleError } = useCircle(circleId)
  const { data: members = [], isLoading: membersLoading } = useCircleMembers(circleId)
  const { data: rounds = [], isLoading: roundsLoading } = useCircleRounds(circleId)

  const isLoading = circleLoading || membersLoading || roundsLoading

  if (isLoading) {
    return (
      <div className="space-y-4" data-print-content>
        <Skeleton variant="text" width="40%" height={32} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" />
        ))}
      </div>
    )
  }

  if (circleError || !circle) {
    return (
      <EmptyState
        icon={<Printer className="h-6 w-6" />}
        title="Circle unavailable"
        description="This circle could not be loaded, so there is nothing to print."
      />
    )
  }

  const summary = buildCircleSummary(circle, members, rounds)

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-black print:p-0 print:max-w-none">
      {/* Screen-only toolbar. Hidden on paper by the print rules — a printer
          button on the printed sheet would be nonsense. */}
      <div
        data-print-hide="true"
        className="mb-6 flex items-center justify-between gap-3 border-b border-black/10 pb-4"
      >
        <div>
          <h1 className="font-heading text-xl font-bold text-black">{circle.name}</h1>
          <p className="text-sm text-black/60">Printable circle summary</p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href={`/circles/${circleId}`} variant="outline" size="sm">
            Back to circle
          </ButtonLink>
          <PrintButton />
        </div>
      </div>

      {/* The document header. Repeats the identifying details on the sheet so
          a page separated from the rest is still traceable to its circle. */}
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-black text-black">{circle.name}</h1>
        {circle.description ? (
          <p className="mt-1 text-sm text-black/70">{circle.description}</p>
        ) : null}
        <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-wider text-black/60">
          Circle {circle.id} · Printed {formatDate(new Date())}
          {circle.organizerName ? ` · Organizer: ${circle.organizerName}` : ""}
        </p>
      </header>

      <PrintSection title="Circle terms">
        <PrintCircleTerms circle={circle} />
      </PrintSection>

      <PrintSection title="Totals">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <PrintStat label="Total collected" value={formatCurrency(summary.totalCollected, circle.currency)} />
          <PrintStat label="Total paid out" value={formatCurrency(summary.totalPaidOut, circle.currency)} />
          <PrintStat
            label="Balance held"
            value={formatCurrency(summary.outstandingBalance, circle.currency)}
          />
          <PrintStat label="Rounds completed" value={`${summary.roundsCompleted}`} />
          <PrintStat label="Outstanding payments" value={`${summary.roundsOutstanding}`} />
          <PrintStat label="Members" value={`${summary.members.length}`} />
        </dl>
      </PrintSection>

      <PrintMembersTable members={summary.members} />

      {/* Each major section starts a fresh sheet so a long members table never
          leaves the rounds table half-written. */}
      <PrintRoundsTable rounds={summary.rounds} currency={circle.currency} />

      <footer className="mt-8 border-t border-black/20 pt-3 text-[0.65rem] text-black/60">
        <p>
          Generated by Moistello on {formatDate(new Date())}. Figures reflect on-chain records at
          the time of printing.
        </p>
      </footer>
    </div>
  )
}
