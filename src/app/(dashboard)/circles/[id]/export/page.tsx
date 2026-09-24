"use client"

import React, { useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useCircle, useCircleMembers, useCircleRounds } from "@/hooks/use-circles"
import { useContributions } from "@/hooks/use-contributions"
import { useCirclePayouts } from "@/hooks/use-payouts"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import {
  ArrowLeft, Download, FileText, Table, Check, AlertCircle,
  Calendar, Columns, Filter, RefreshCw,
} from "lucide-react"
import { copyToClipboard } from "@/lib/clipboard"
import {
  buildCombinedCSV,
  downloadFile,
  CONTRIBUTION_COLUMNS,
  PAYOUT_COLUMNS,
  MEMBER_COLUMNS,
  type ExportScope,
  type ExportFormat,
} from "./csv-export"
import type { Contribution, Payout } from "@/types"

// ─── Column checkbox ─────────────────────────────────────────────────────────

function ColumnToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group select-none">
      <span
        className={cn(
          "h-4 w-4 rounded border transition-colors flex items-center justify-center shrink-0",
          checked
            ? "bg-aurora-violet border-aurora-violet"
            : "border-white/20 group-hover:border-aurora-violet/50",
        )}
        onClick={() => onChange(!checked)}
      >
        {checked && <Check className="h-2.5 w-2.5 text-white" />}
      </span>
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </label>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExportPage() {
  const params = useParams()
  const circleId = params.id as string

  const { data: circle } = useCircle(circleId)
  const { data: members = [] } = useCircleMembers(circleId)
  const { data: rounds = [] } = useCircleRounds(circleId)

  // Flatten real contributions/payouts from rounds (always available)
  // Plus paginated hooks for when we need ALL records with date filtering
  const { data: contribData, isFetching: contribFetching, refetch: refetchContribs } =
    useContributions({ circleId, limit: 200 })
  const { data: payoutData, isFetching: payoutFetching, refetch: refetchPayouts } =
    useCirclePayouts(circleId, { limit: 200 })

  // Merge round contributions for members/rounds data with API contributions
  const allContributions: Contribution[] = useMemo(() => {
    if (contribData?.contributions && contribData.contributions.length > 0) {
      return contribData.contributions
    }
    // Fallback: flatten from rounds
    return rounds.flatMap((r) => r.contributions)
  }, [contribData?.contributions, rounds])

  const allPayouts: Payout[] = useMemo(() => {
    if (payoutData?.payouts && payoutData.payouts.length > 0) {
      return payoutData.payouts
    }
    return rounds.flatMap((r) => (r.payout ? [r.payout] : []))
  }, [payoutData?.payouts, rounds])

  // ── UI state ──
  const [scope, setScope] = useState<ExportScope>("all")
  const [format, setFormat] = useState<ExportFormat>("csv")
  const [copied, setCopied] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showColumns, setShowColumns] = useState(false)

  // Column selection — all on by default
  const [contribCols, setContribCols] = useState<Set<string>>(
    () => new Set(CONTRIBUTION_COLUMNS.map((c) => c.key)),
  )
  const [payoutCols, setPayoutCols] = useState<Set<string>>(
    () => new Set(PAYOUT_COLUMNS.map((c) => c.key)),
  )
  const [memberCols, setMemberCols] = useState<Set<string>>(
    () => new Set(MEMBER_COLUMNS.map((c) => c.key)),
  )

  // ── Content generation ──
  const generateContent = useCallback((): string => {
    if (format === "json") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {
        circle: circle
          ? {
              id: circle.id,
              name: circle.name,
              type: circle.circleType,
              status: circle.status,
              contributionAmount: circle.contributionAmount,
              currency: circle.currency,
              frequency: circle.frequency,
              maxMembers: circle.maxMembers,
              createdAt: circle.createdAt,
            }
          : null,
        exportedAt: new Date().toISOString(),
      }
      if (scope === "all" || scope === "members") data.members = members
      if (scope === "all" || scope === "contributions") data.contributions = allContributions
      if (scope === "all" || scope === "payouts") data.payouts = allPayouts
      return JSON.stringify(data, null, 2)
    }

    return buildCombinedCSV({
      scope,
      contributions: allContributions,
      payouts: allPayouts,
      members,
      contributionColumns: [...contribCols],
      payoutColumns: [...payoutCols],
      memberColumns: [...memberCols],
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
  }, [
    format, scope, circle, members, allContributions, allPayouts,
    contribCols, payoutCols, memberCols, dateFrom, dateTo,
  ])

  const handleDownload = () => {
    const content = generateContent()
    const ext = format === "csv" ? "csv" : "json"
    const mime = format === "csv" ? "text/csv;charset=utf-8;" : "application/json"
    downloadFile(content, `${circle?.name ?? "circle"}-export.${ext}`, mime)
  }

  const handleCopy = async () => {
    const content = generateContent()
    const success = await copyToClipboard(content)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRefresh = () => {
    refetchContribs()
    refetchPayouts()
  }

  const isLoading = contribFetching || payoutFetching

  const scopes: { value: ExportScope; label: string; count: number }[] = [
    { value: "all", label: "All Data", count: allContributions.length + allPayouts.length + members.length },
    { value: "members", label: "Members", count: members.length },
    { value: "contributions", label: "Contributions", count: allContributions.length },
    { value: "payouts", label: "Payouts", count: allPayouts.length },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header with accent bar ── */}
      <div className="relative pl-5 border-l-4 border-l-aurora-violet">
        <PageHeader
          title="Export Data"
          description="Download circle data as CSV or JSON"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: circle?.name ?? "Circle", href: `/circles/${circleId}` },
            { label: "Export" },
          ]}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </button>
              <Link href={`/circles/${circleId}`}>
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Back
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
        {[
          { label: "Contributions", value: allContributions.length },
          { label: "Payouts", value: allPayouts.length },
          { label: "Members", value: members.length },
        ].map((s) => (
          <div key={s.label} className="bg-background px-4 py-3 text-center">
            <p className="text-2xl font-bold font-heading text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Scope selector — pill row ── */}
      <div>
        <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Filter className="h-3 w-3" /> Export Scope
        </p>
        <div className="flex flex-wrap gap-2">
          {scopes.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-body transition-all border",
                scope === s.value
                  ? "bg-aurora-violet/20 border-aurora-violet text-foreground"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground",
              )}
            >
              {s.label}
              <span className={cn(
                "text-xs font-mono rounded-full px-1.5 py-0.5",
                scope === s.value ? "bg-aurora-violet/30 text-foreground" : "bg-white/10",
              )}>
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Date range ── */}
      <div>
        <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Calendar className="h-3 w-3" /> Date Range (optional)
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-aurora-violet/50"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-aurora-violet/50"
            />
          </div>
          {(dateFrom || dateTo) && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo("") }}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Applies to contributions and payouts. Ignored for members and JSON format.
        </p>
      </div>

      {/* ── Column selector (CSV only) ── */}
      {format === "csv" && (
        <div>
          <button
            type="button"
            onClick={() => setShowColumns((v) => !v)}
            className="flex items-center gap-2 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <Columns className="h-3 w-3" />
            Column Selection
            <span className="text-aurora-violet text-xs normal-case font-normal">
              {showColumns ? "hide" : "show"}
            </span>
          </button>

          {showColumns && (
            <div className="mt-3 space-y-4">
              {(scope === "all" || scope === "contributions") && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Contributions</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CONTRIBUTION_COLUMNS.map((col) => (
                      <ColumnToggle
                        key={col.key}
                        label={col.label}
                        checked={contribCols.has(col.key)}
                        onChange={(v) => {
                          setContribCols((prev) => {
                            const next = new Set(prev)
                            if (v) {
                              next.add(col.key)
                            } else {
                              next.delete(col.key)
                            }
                            return next
                          })
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(scope === "all" || scope === "payouts") && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Payouts</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PAYOUT_COLUMNS.map((col) => (
                      <ColumnToggle
                        key={col.key}
                        label={col.label}
                        checked={payoutCols.has(col.key)}
                        onChange={(v) => {
                          setPayoutCols((prev) => {
                            const next = new Set(prev)
                            if (v) {
                              next.add(col.key)
                            } else {
                              next.delete(col.key)
                            }
                            return next
                          })
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(scope === "all" || scope === "members") && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Members</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MEMBER_COLUMNS.map((col) => (
                      <ColumnToggle
                        key={col.key}
                        label={col.label}
                        checked={memberCols.has(col.key)}
                        onChange={(v) => {
                          setMemberCols((prev) => {
                            const next = new Set(prev)
                            if (v) {
                              next.add(col.key)
                            } else {
                              next.delete(col.key)
                            }
                            return next
                          })
                        }}
                      />
                    ))}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Format ── */}
      <div>
        <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Format</p>
        <div className="flex gap-2">
          {([
            { value: "csv", icon: <Table className="h-4 w-4" />, label: "CSV" },
            { value: "json", icon: <FileText className="h-4 w-4" />, label: "JSON" },
          ] as const).map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value as ExportFormat)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-body transition-all border",
                format === f.value
                  ? "bg-aurora-violet/20 border-aurora-violet text-foreground"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground",
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Action buttons — full-width callout strip ── */}
      <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-5 py-4 border border-white/[0.06]">
        <Button
          variant="primary"
          size="md"
          onClick={handleDownload}
          leftIcon={<Download className="h-4 w-4" />}
          disabled={isLoading}
        >
          Download
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          disabled={isLoading}
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </Button>
        {isLoading && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Loading data…
          </span>
        )}
      </div>

      {/* ── Info notice ── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border-l-2 border-l-amber-400/40 bg-amber-400/5">
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Up to 200 most recent records are exported. For complete history, use the date range
          filter to export in batches.
        </p>
      </div>
    </div>
  )
}
