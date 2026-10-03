"use client"

import { Badge } from "@/components/ui/badge"
import { TableScrollRegion } from "@/components/shared/table-scroll-region"
import {
  TableCaption,
  TableCell,
  TableHeadCell,
  TableRow,
} from "@/components/shared/responsive-table"
import { formatCurrency } from "@/lib/formatters"
import type { Contribution, ContributionStatus } from "@/types"

const statusStyles: Record<
  ContributionStatus,
  { variant: "success" | "warning" | "destructive" | "default" }
> = {
  confirmed: { variant: "success" },
  pending: { variant: "warning" },
  failed: { variant: "destructive" },
  late: { variant: "destructive" },
}

interface RoundContributionsTableProps {
  roundNumber: number
  contributions: Contribution[]
  currency: string
}

/**
 * Per-round contribution table.
 *
 * Three columns is few enough that stacking them below `sm` costs nothing: the
 * column names move inline next to each value, so no cell is ever reachable only
 * by horizontal scroll. The scroll region is still named and focusable for the
 * cases where the row content (a truncated user id, a long currency amount)
 * genuinely needs more width than a phone has.
 */
export function RoundContributionsTable({
  roundNumber,
  contributions,
  currency,
}: RoundContributionsTableProps) {
  if (contributions.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No contributions recorded for this round yet.
      </p>
    )
  }

  return (
    <TableScrollRegion
      label={`Round ${roundNumber} contributions`}
      className="overflow-hidden rounded-xl border border-border"
    >
      <table className="w-full text-sm">
        <TableCaption>Contributions recorded in round {roundNumber}.</TableCaption>
        <thead>
          <tr>
            <TableHeadCell label="Contributor" className="text-left">
              Contributor
            </TableHeadCell>
            <TableHeadCell label="Amount" className="text-left">
              Amount
            </TableHeadCell>
            <TableHeadCell label="Status" className="text-right">
              Status
            </TableHeadCell>
          </tr>
        </thead>
        <tbody>
          {contributions.map((contribution) => {
            const style = statusStyles[contribution.status] || statusStyles.pending
            const isOnTime = contribution.onTime && contribution.status === "confirmed"

            return (
              <TableRow key={contribution.id} className="transition-colors">
                <TableCell
                  label="Contributor"
                  primary
                  className="font-mono text-xs text-foreground dark:text-white"
                >
                  {contribution.userId.slice(0, 8)}...
                </TableCell>
                <TableCell
                  label="Amount"
                  className="font-heading text-sm font-bold gradient-text"
                >
                  {formatCurrency(contribution.amount, currency)}
                </TableCell>
                <TableCell label="Status" className="text-right">
                  <Badge variant={isOnTime ? "success" : style.variant} size="sm">
                    {isOnTime ? "On Time" : contribution.status}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </tbody>
      </table>
    </TableScrollRegion>
  )
}
