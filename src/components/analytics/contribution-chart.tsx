"use client"

import React, { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"

export interface ContributionDataPoint {
  label: string
  value: number
}

interface ContributionChartProps {
  data?: ContributionDataPoint[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  currency?: string
  height?: number
}

const SparkBar = ({
  points,
  height = 180,
}: {
  points: { x: number; y: number; value: number }[]
  height: number
}) => {
  const width = 600
  const padding = 16
  const maxVal = Math.max(...points.map((p) => p.value), 1)
  const barWidth = Math.max(4, (width - padding * 2) / points.length - 6)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--aurora-violet) / 0.9)" />
          <stop offset="100%" stopColor="rgb(var(--aurora-violet) / 0.35)" />
        </linearGradient>
      </defs>
      {points.map((p, i) => {
        const barHeight = maxVal > 0 ? (p.value / maxVal) * (height - padding * 2) : 0
        const x = padding + i * ((width - padding * 2) / points.length) + 3
        const y = height - padding - barHeight
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill="url(#barGrad)"
            rx={2}
            ry={2}
          />
        )
      })}
    </svg>
  )
}

export function ContributionChart({
  data = [],
  isLoading = false,
  error = null,
  onRetry,
  currency = "USDC",
  height = 180,
}: ContributionChartProps) {
  const totals = useMemo(() => {
    const sum = data.reduce((acc, d) => acc + d.value, 0)
    const peak = Math.max(...data.map((d) => d.value), 0)
    return { sum, peak, count: data.length }
  }, [data])

  if (error) {
    return (
      <div className="glass rounded-2xl p-5 holo-border flex flex-col items-center justify-center text-center gap-3">
        <BarChart3 className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load contribution chart.</p>
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
      <div className="glass rounded-2xl p-5 holo-border">
        <Skeleton variant="text" className="h-4 w-40 mb-4" />
        <Skeleton variant="rectangular" className="w-full rounded-xl" style={{ height }} />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 holo-border">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Contribution trend</h3>
        </div>
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No data"
          description="Contributions will appear here once available."
          className="max-w-xs mx-auto py-8"
        />
      </div>
    )
  }

  const points = data.map((d) => ({
    x: 0,
    y: 0,
    value: d.value,
    label: d.label,
  }))

  return (
    <div className="glass rounded-2xl p-5 holo-border relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Contribution trend</h3>
        </div>
        <span className="text-2xs text-muted-foreground font-body">
          {data.length} {data.length === 1 ? "period" : "periods"}
        </span>
      </div>

      <div className="depth-4 rounded-xl bg-white/[0.02] p-3">
        <SparkBar points={points} height={height} />
        <div className="flex items-end justify-between mt-3 px-1">
          <div>
            <p className="text-2xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="font-heading text-lg font-bold gradient-text">
              {formatCurrency(totals.sum, currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xs text-muted-foreground uppercase tracking-wide">Peak</p>
            <p className="font-heading text-lg font-bold text-foreground">
              {formatCurrency(totals.peak, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
