"use client"

import React from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Inbox,
  RotateCw,
  WalletCards,
} from "lucide-react"
import { useCircle, useCircleRounds } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatAddress, formatCurrency, formatDate } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import type { ContributionStatus } from "@/types"
import { calculateRoundTotals } from "./round-totals"

const statusStyles: Record<
  ContributionStatus,
  { variant: "success" | "warning" | "destructive" | "default" }
> = {
  confirmed: { variant: "success" },
  pending: { variant: "warning" },
  failed: { variant: "destructive" },
  late: { variant: "destructive" },
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const roundItem = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export default function CircleRoundsPage() {
  const params = useParams()
  const circleId = params.id as string

  const { data: circle } = useCircle(circleId)
  const { data: rounds = [], isLoading, isError } = useCircleRounds(circleId)

  const groupedRounds = [...rounds]
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .map((round) => ({
      ...round,
      isCurrent: round.roundNumber === (circle?.currentRound ?? 0),
      isCompleted: round.roundNumber < (circle?.currentRound ?? 0),
      isUpcoming: round.roundNumber > (circle?.currentRound ?? 0),
    }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rounds"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "Circle", href: `/circles/${circleId}` },
            { label: "Rounds" },
          ]}
          action={
            <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </ButtonLink>
          }
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-40 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rounds"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "Circle", href: `/circles/${circleId}` },
            { label: "Rounds" },
          ]}
          action={
            <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </ButtonLink>
          }
        />
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Failed to load rounds"
          description="Something went wrong. Please try again."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rounds"
        description="Round history and contribution tracking"
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: circle?.name ?? "Circle", href: `/circles/${circleId}` },
          { label: "Rounds" },
        ]}
        action={
          <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Circle
            </ButtonLink>
        }
      />

      {groupedRounds.length === 0 ? (
        <EmptyState
          icon={<RotateCw className="h-6 w-6" />}
          title="No rounds yet"
          description="Round data will appear here once the circle starts."
        />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {groupedRounds.map((round) => (
            <motion.div
              key={round.roundNumber}
              variants={roundItem}
              className={cn(
                "glass-premium rounded-2xl p-5 md:p-6",
                round.isCurrent && "holo-border",
              )}
            >
              {(() => {
                const totals = calculateRoundTotals(round.contributions)
                const expectedTotal =
                  (circle?.contributionAmount ?? 0) * (circle?.maxMembers ?? 0)

                return (
                  <>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-heading font-semibold",
                      round.isCompleted && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
                      round.isCurrent && "gradient-bg text-white animate-pulse-glow shadow-xl",
                      round.isUpcoming && "glass text-muted-foreground",
                    )}
                  >
                    {round.isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      round.roundNumber
                    )}
                  </motion.div>
                  <div>
                    <p className="font-heading font-semibold text-foreground dark:text-white text-base">
                      Round {round.roundNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {round.isCompleted
                        ? "Completed"
                        : round.isCurrent
                          ? "In Progress"
                          : "Upcoming"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    round.isCompleted
                      ? "success"
                      : round.isCurrent
                        ? "primary"
                        : "default"
                  }
                  size="sm"
                >
                  {round.isCompleted ? "Completed" : round.isCurrent ? "Current" : "Upcoming"}
                </Badge>
              </div>

              <div className="mb-5 grid gap-px overflow-hidden border-y border-border bg-border sm:grid-cols-3">
                <div className="bg-background/80 px-4 py-3">
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">Settled total</p>
                  <p className="mt-1 font-heading text-xl font-bold text-foreground">
                    {formatCurrency(totals.settledAmount, circle?.currency ?? "USDC")}
                  </p>
                </div>
                <div className="bg-background/80 px-4 py-3">
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">Expected pool</p>
                  <p className="mt-1 font-heading text-xl font-bold text-foreground">
                    {formatCurrency(expectedTotal, circle?.currency ?? "USDC")}
                  </p>
                </div>
                <div className="bg-background/80 px-4 py-3">
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">Contributors settled</p>
                  <p className="mt-1 font-mono text-xl font-bold text-foreground">
                    {totals.settledCount}/{circle?.maxMembers ?? 0}
                  </p>
                </div>
              </div>

              {round.payout && (
                <div className="mb-5 border-l-4 border-l-emerald-400 bg-emerald-500/[0.06] px-4 py-4">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-start gap-3">
                      <WalletCards className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-2xs uppercase tracking-wider text-emerald-400">Payout completed</p>
                        <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                          {formatCurrency(round.payout.amount, circle?.currency ?? "USDC")}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          Recipient {formatAddress(round.payout.recipientId)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:text-right">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(round.payout.feeAmount ?? 0, circle?.currency ?? "USDC")}
                      </span>
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-foreground">{formatDate(round.payout.createdAt)}</span>
                      {round.payout.txnHash && (
                        <>
                          <span className="text-muted-foreground">Transaction</span>
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${round.payout.txnHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-end gap-1 font-mono text-xs text-aurora-cyan hover:underline"
                          >
                            {formatAddress(round.payout.txnHash ?? "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {round.contributions.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="glass-strong">
                        <th className="px-4 py-2.5 text-left text-2xs font-heading tracking-wider uppercase text-muted-foreground">
                          Contributor
                        </th>
                        <th className="px-4 py-2.5 text-left text-2xs font-heading tracking-wider uppercase text-muted-foreground">
                          Amount
                        </th>
                        <th className="px-4 py-2.5 text-right text-2xs font-heading tracking-wider uppercase text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {round.contributions.map((c) => {
                        const st = statusStyles[c.status] || statusStyles.pending
                        const label = c.onTime && c.status === "confirmed" ? "On Time" : c.status
                        return (
                          <tr
                            key={c.id}
                            className="hover:glass-whisper transition-colors"
                          >
                            <td className="px-4 py-2.5 font-mono text-xs text-foreground dark:text-white">
                              {c.userId.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-2.5 text-sm gradient-text font-bold font-heading">
                              {formatCurrency(c.amount, circle?.currency ?? "USDC")}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <Badge
                                variant={c.onTime && c.status === "confirmed" ? "success" : st.variant}
                                size="sm"
                              >
                                {label}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {round.contributions.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">
                  No contributions recorded for this round yet.
                </p>
              )}
                  </>
                )
              })()}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
