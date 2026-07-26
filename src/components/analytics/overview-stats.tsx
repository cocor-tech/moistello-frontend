"use client"

import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { TrendingUp, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/cn"

export interface OverviewStat {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
  trend?: { value: number; label: string }
}

interface OverviewStatsProps {
  stats?: OverviewStat[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  columns?: 2 | 3 | 4
}

const loadingSkeletons = (count: number) =>
  Array.from({ length: count }).map((_, i) => (
    <div key={i} className="glass-premium rounded-2xl p-5 holo-border">
      <Skeleton variant="rectangular" className="h-10 w-10 rounded-xl mb-3" />
      <Skeleton variant="text" className="h-3 w-20 mb-2" />
      <Skeleton variant="heading" className="h-7 w-24" />
    </div>
  ))

export function OverviewStats({
  stats = [],
  isLoading = false,
  error = null,
  onRetry,
  columns = 4,
}: OverviewStatsProps) {
  if (error) {
    return (
      <div className="glass-premium rounded-2xl p-8 holo-border flex flex-col items-center justify-center text-center gap-3">
        <Activity className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load overview stats.</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs text-aurora-violet hover:underline">
            Retry
          </button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-2 sm:grid-cols-3",
          columns === 4 && "grid-cols-2 sm:grid-cols-4",
        )}
      >
        {loadingSkeletons(columns === 2 ? 2 : columns === 3 ? 3 : 4)}
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-6 w-6" />}
        title="No stats yet"
        description="Overview statistics will appear here once data is available."
      />
    )
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {stats.map((stat, i) => (
        <div key={i} className="glass-premium rounded-2xl p-5 holo-border">
          <div className="flex items-start justify-between mb-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.color)}>
              {stat.icon}
            </div>
            {stat.trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  stat.trend.value >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {stat.trend.value >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(stat.trend.value)}%
              </span>
            )}
          </div>
          <p className="text-2xs text-muted-foreground font-heading tracking-wider uppercase mb-1">
            {stat.label}
          </p>
          <p className="text-2xl font-bold font-heading gradient-text">{stat.value}</p>
          {stat.sub && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
        </div>
      ))}
    </div>
  )
}
