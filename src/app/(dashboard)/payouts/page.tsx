"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowDownCircle,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api-client"
import { usePayouts } from "@/hooks/use-payouts"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LiveRegion } from "@/components/shared/live-region"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate, formatAddress } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import type { ApiResponse, Circle } from "@/types"
import { getCurrentPagePayoutTotal } from "./payout-summary"

function TransactionLink({ hash }: { hash: string }) {
  return (
    <a
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-aurora-cyan hover:underline font-mono"
    >
      {formatAddress(hash)}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
}

function SummaryCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string
  value: string
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.25 } }}
      className="glass rounded-2xl p-5 tilt-hover depth-2"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-2xs tracking-wider uppercase text-muted-foreground font-body">
            {label}
          </p>
          <p className="font-heading text-3xl font-bold gradient-text-extended bg-clip-text text-transparent">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br",
            gradient,
            "shadow-lg",
          )}
        >
          <span className="text-white">{icon}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function PayoutsPage() {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<"createdAt" | "amount" | "roundNumber">("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [circleId, setCircleId] = useState("")
  const [payoutType, setPayoutType] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const limit = 20

  const { data, isLoading, isError } = usePayouts({
    page,
    limit,
    sortBy,
    sortDir,
    circleId,
    payoutType: payoutType as "all" | "random" | "fixed" | "auction" | "vote",
    dateFrom,
    dateTo,
  })

  const { data: circlesData } = useQuery({
    queryKey: ["circles", "payouts-filter"],
    queryFn: async () => {
      const response = await get<ApiResponse<{ circles: Circle[] }>>("/circles?limit=100")
      return response.data?.circles ?? []
    },
  })

  const circles = circlesData ?? []
  const payouts = data?.payouts ?? []
  const meta = data?.meta
  const hasNext = meta ? meta.page < meta.totalPages : false
  const hasPrev = page > 1

  const currentPageTotal = getCurrentPagePayoutTotal(payouts)

  const getCircleName = (circleId: string): string =>
    circles.find((c) => c.id === circleId)?.name ?? "Unknown"

  // ── Meaningful status announcements for assistive tech ──
  const statusMessage = useMemo(() => {
    if (isLoading) return "Loading payouts…"
    if (isError) return "Failed to load payouts. Please try again later."
    if (payouts.length === 0) return "No payouts received yet."
    const pageInfo = meta ? ` (page ${meta.page} of ${meta.totalPages})` : ""
    return `Loaded ${payouts.length} payout${payouts.length === 1 ? "" : "s"}${pageInfo}.`
  }, [isLoading, isError, payouts.length, meta])

  const resetPage = <T,>(setter: (value: T) => void, value: T) => {
    setter(value)
    setPage(1)
  }

  const toggleSort = (field: "createdAt" | "amount" | "roundNumber") => {
    setPage(1)
    if (sortBy === field) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortDir(field === "createdAt" ? "desc" : "asc")
    }
  }

  return (
    <div className="space-y-6">
      <LiveRegion message={statusMessage} />
      <PageHeader
        title="Payouts Received"
        description="Track the payouts you've received from your savings circles."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard
          label="Total on This Page"
          value={formatCurrency(currentPageTotal, "USDC")}
          icon={<DollarSign className="h-6 w-6" />}
          gradient="from-emerald-500 to-aurora-cyan"
        />
        <SummaryCard
          label="Number of Payouts"
          value={String(meta?.total ?? payouts.length)}
          icon={<TrendingUp className="h-6 w-6" />}
          gradient="from-aurora-indigo to-aurora-violet"
        />
      </div>

      <div className="glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <label className="space-y-1 text-xs font-heading tracking-wider uppercase text-muted-foreground">
          Circle
          <select
            value={circleId}
            onChange={(event) => resetPage(setCircleId, event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case text-foreground"
          >
            <option value="">All circles</option>
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-heading tracking-wider uppercase text-muted-foreground">
          Type
          <select
            value={payoutType}
            onChange={(event) => resetPage(setPayoutType, event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case text-foreground"
          >
            <option value="all">All types</option>
            <option value="fixed">Fixed</option>
            <option value="random">Random</option>
            <option value="auction">Auction</option>
            <option value="vote">Vote</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-heading tracking-wider uppercase text-muted-foreground">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => resetPage(setDateFrom, event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case text-foreground"
          />
        </label>
        <label className="space-y-1 text-xs font-heading tracking-wider uppercase text-muted-foreground">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(event) => resetPage(setDateTo, event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case text-foreground"
          />
        </label>
        <Button
          variant="outline"
          className="self-end"
          onClick={() => {
            setCircleId("")
            setPayoutType("all")
            setDateFrom("")
            setDateTo("")
            setSortBy("createdAt")
            setSortDir("desc")
            setPage(1)
          }}
        >
          Reset
        </Button>
      </div>

      {isLoading ? (
        <div className="glass-premium rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton variant="text" width="25%" />
                <Skeleton variant="text" width="8%" />
                <Skeleton variant="text" width="15%" />
                <Skeleton variant="text" width="12%" />
                <Skeleton variant="text" width="15%" />
                <Skeleton variant="text" width="18%" />
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          title="Failed to load payouts"
          description="Something went wrong. Please try again later."
        />
      ) : payouts.length === 0 ? (
        <EmptyState
          icon={<ArrowDownCircle className="h-6 w-6" />}
          title="No payouts received yet"
          description="You'll receive payouts when it's your turn in a savings circle."
          action={{
            label: "Browse Circles",
            onClick: () => (window.location.href = "/circles"),
          }}
        />
      ) : (
        <div className="glass-premium rounded-2xl overflow-hidden holo-border">
          <div className="hidden md:flex items-center gap-4 border-b border-border glass-strong px-5 py-3">
            <div className="flex-1 text-2xs font-heading tracking-wider uppercase text-muted-foreground">
              Circle
            </div>
            <button
              type="button"
              onClick={() => toggleSort("roundNumber")}
              className="w-16 inline-flex items-center gap-1 text-left text-2xs font-heading tracking-wider uppercase text-muted-foreground"
            >
              Round
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => toggleSort("amount")}
              className="w-28 inline-flex items-center gap-1 text-left text-2xs font-heading tracking-wider uppercase text-muted-foreground"
            >
              Amount
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <div className="w-24 text-2xs font-heading tracking-wider uppercase text-muted-foreground">
              Fee
            </div>
            <button
              type="button"
              onClick={() => toggleSort("createdAt")}
              className="w-28 inline-flex items-center gap-1 text-left text-2xs font-heading tracking-wider uppercase text-muted-foreground"
            >
              Date
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <div className="w-36 text-2xs font-heading tracking-wider uppercase text-muted-foreground">
              Transaction
            </div>
          </div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.03 } } }}
            className="divide-y divide-border"
          >
            {payouts.map((payout) => (
              <motion.div
                key={payout.id}
                variants={rowVariants}
                className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:gap-4 hover:glass-whisper transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/circles/${payout.circleId}`}
                    className="text-sm font-medium text-foreground dark:text-white hover:gradient-text transition-colors truncate block font-heading"
                  >
                    {getCircleName(payout.circleId)}
                  </Link>
                </div>
                <div className="hidden md:block w-16 text-sm text-muted-foreground font-mono">
                  #{payout.roundNumber}
                </div>
                <div className="w-28 text-sm font-bold gradient-text font-heading">
                  +{formatCurrency(payout.amount, "USDC")}
                </div>
                <div className="w-24 text-sm text-muted-foreground font-body">
                  {payout.feeAmount != null && payout.feeAmount > 0
                    ? formatCurrency(payout.feeAmount, "USDC")
                    : "—"}
                </div>
                <div className="w-28 text-sm text-muted-foreground font-body">
                  {formatDate(payout.createdAt)}
                </div>
                <div className="w-36">
                  {payout.txnHash ? (
                    <TransactionLink hash={payout.txnHash} />
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">—</span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-body">
            Page {meta.page} of {meta.totalPages} ({meta.total} payouts)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
