"use client"

import React, { useMemo, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, TrendingUp, DollarSign, Users, Clock, Activity, Zap, Inbox } from "lucide-react"
import { useCircle, useCircleMembers, useCircleRounds } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ButtonLink } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/formatters"
import {
  DateRangePicker,
  paramsToDateRange,
  dateRangeToParams,
  filterByDateRange,
  type DateRange,
} from "@/components/shared/date-range-picker"

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass-premium rounded-2xl p-5 holo-border">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color)}>{icon}</div>
      </div>
      <p className="text-2xs text-muted-foreground font-heading tracking-wider uppercase mb-1">{label}</p>
      <p className="text-2xl font-bold font-heading gradient-text">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="font-medium text-foreground dark:text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const circleId = params.id as string

  const { data: circle, isLoading: cLoading } = useCircle(circleId)
  const { data: members = [], isLoading: mLoading } = useCircleMembers(circleId)
  const { data: rounds = [], isLoading: rLoading } = useCircleRounds(circleId)

  const dateRange = useMemo(() => paramsToDateRange(searchParams), [searchParams])

  const handleDateRangeChange = useCallback((range: DateRange) => {
    const p = dateRangeToParams(range)
    const sp = new URLSearchParams(p)
    router.replace(`?${sp.toString()}`, { scroll: false })
  }, [router])

  const stats = useMemo(() => {
    const allContribs = rounds.flatMap((r) => r.contributions)
    const filteredContribs = filterByDateRange(
      allContribs,
      dateRange,
      (c) => c.createdAt ?? c.paidAt,
    )
    const totalContributions = filteredContribs.reduce((s, c) => s + c.amount, 0)
    const completedRounds = Array.from(new Set(filteredContribs.filter((c) => c.status === "confirmed" || c.onTime).map((c) => c.roundNumber))).length
    const uniqueContributors = Array.from(new Set(filteredContribs.map((c) => c.userId))).length
    const onTimeCount = filteredContribs.filter((c) => c.onTime).length
    const onTimeRate = filteredContribs.length > 0 ? Math.round((onTimeCount / filteredContribs.length) * 100) : 0
    const activeMemberCount = members.filter((m) => m.status === "active").length

    const memberContributionMap = new Map<string, number>()
    for (const c of filteredContribs) {
      memberContributionMap.set(c.userId, (memberContributionMap.get(c.userId) ?? 0) + c.amount)
    }
    const topContributors = Array.from(memberContributionMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, amount]) => ({ userId, amount }))

    return { totalContributions, completedRounds, uniqueContributors, onTimeCount, onTimeRate, activeMemberCount, topContributors, totalRounds: rounds.length }
  }, [members, rounds, dateRange])

  if (cLoading || mLoading || rLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" breadcrumbs={[{ label: "Circles", href: "/circles" }, { label: "Circle", href: `/circles/${circleId}` }, { label: "Analytics" }]} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" className="h-28 rounded-2xl" />)}</div>
      </div>
    )
  }

  if (!circle) {
    return <div className="space-y-6"><PageHeader title="Analytics" /><EmptyState icon={<Inbox className="h-6 w-6" />} title="Circle not found" description="This circle may have been deleted." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Performance metrics for ${circle.name}`}
        breadcrumbs={[{ label: "Circles", href: "/circles" }, { label: circle.name, href: `/circles/${circleId}` }, { label: "Analytics" }]}
        action={
          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
            <ButtonLink href={`/circles/${circleId}`} variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</ButtonLink>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} color="bg-emerald-500/20 text-emerald-400" label="Total Saved" value={formatCurrency(stats.totalContributions, circle.currency)} sub={`Across ${stats.totalRounds} round${stats.totalRounds !== 1 ? "s" : ""}`} />
        <StatCard icon={<Users className="h-5 w-5" />} color="bg-blue-500/20 text-blue-400" label="Active Members" value={String(stats.activeMemberCount)} sub={`${stats.uniqueContributors} unique contributors`} />
        <StatCard icon={<Activity className="h-5 w-5" />} color="bg-purple-500/20 text-purple-400" label="On-Time Rate" value={`${stats.onTimeRate}%`} sub={`${stats.onTimeCount} of ${stats.totalRounds} on time`} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} color="bg-amber-500/20 text-amber-400" label="Rounds Completed" value={String(stats.completedRounds)} sub={`of ${circle.maxMembers} total rounds`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-premium rounded-2xl p-5 holo-border">
          <h3 className="text-sm font-heading font-semibold text-foreground dark:text-white mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" />Top Contributors</h3>
          {stats.topContributors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contributions yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topContributors.map((tc, i) => (
                <div key={tc.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-sm text-foreground dark:text-white font-mono truncate max-w-[180px]">{tc.userId.slice(0, 10)}...</span>
                  </div>
                  <span className="text-sm gradient-text font-bold">{formatCurrency(tc.amount, circle.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-premium rounded-2xl p-5 holo-border">
          <h3 className="text-sm font-heading font-semibold text-foreground dark:text-white mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-400" />Round Progress</h3>
          <div className="space-y-3">
            <MiniBar label="Current Round" value={circle.currentRound} max={circle.maxMembers} color="bg-gradient-to-r from-cyan-500 to-blue-500" />
            <MiniBar label="Members Filled" value={stats.activeMemberCount} max={circle.maxMembers} color="bg-gradient-to-r from-emerald-500 to-green-500" />
            <MiniBar label="On-Time Rate" value={stats.onTimeRate} max={100} color="bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
