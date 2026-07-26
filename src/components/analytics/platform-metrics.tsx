"use client"

import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { Globe, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/cn"

export interface PlatformMetricItem {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
  trend?: { value: number; label: string }
}

interface PlatformMetricsProps {
  metrics?: PlatformMetricItem[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  columns?: 2 | 3 | 4
}

const metricLoadingSkeletons = (count: number) =>
  Array.from({ length: count }).map((_, i) => (
    <div key={i} className="glass-premium rounded-2xl p-5 holo-border">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="rectangular" className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1">
          <Skeleton variant="text" className="h-3 w-24 mb-2" />
          <Skeleton variant="heading" className="h-6 w-16" />
        </div>
      </div>
      <Skeleton variant="text" className="h-3 w-32 mt-2" />
    </div>
  ))

export function PlatformMetrics({
  metrics = [],
  isLoading = false,
  error = null,
  onRetry,
  columns = 4,
}: PlatformMetricsProps) {
  if (error) {
    return (
      <div className="glass-premium rounded-2xl p-8 holo-border flex flex-col items-center justify-center text-center gap-3">
        <Globe className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load platform metrics.</p>
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
        {metricLoadingSkeletons(columns === 2 ? 2 : columns === 3 ? 3 : 4)}
      </div>
    )
  }

  if (metrics.length === 0) {
    return (
      <EmptyState
        icon={<Globe className="h-6 w-6" />}
        title="No metrics yet"
        description="Platform metrics will appear here once data is available."
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
      {metrics.map((metric, i) => (
        <div key={i} className="glass-premium rounded-2xl p-5 holo-border">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", metric.color)}>
              {metric.icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xs text-muted-foreground font-heading tracking-wider uppercase">
                {metric.label}
              </p>
              <p className="text-xl font-bold font-heading gradient-text truncate">{metric.value}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            {metric.sub && (
              <p className="text-xs text-muted-foreground truncate">{metric.sub}</p>
            )}
            {metric.trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium shrink-0 ml-2",
                  metric.trend.value >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                <ArrowUpRight className="h-3 w-3" />
                {Math.abs(metric.trend.value)}%
                <span className="text-muted-foreground ml-1">{metric.trend.label}</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
