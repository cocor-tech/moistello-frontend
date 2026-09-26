'use client'

import { useMemo, useState, useEffect } from 'react'
import { TrendingUp, BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import type { Contribution } from '@/types'

interface ContributionHistoryChartProps {
  contributions: Contribution[]
  period?: 'week' | 'month' | 'all'
}

/**
 * Enhanced contribution history chart showing contribution amounts and frequency
 * Displays data points for the last 14 days by default
 */
export function ContributionHistoryChart({
  contributions,
  period = 'month',
}: ContributionHistoryChartProps) {
  const [isClient, setIsClient] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  useEffect(() => { setIsClient(true) }, [])

  const chartData = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>()
    const now = new Date()

    for (const c of contributions) {
      const date = new Date(c.createdAt)
      const day = date.toISOString().slice(0, 10)
      const existing = map.get(day) || { amount: 0, count: 0 }
      map.set(day, {
        amount: existing.amount + c.amount,
        count: existing.count + 1,
      })
    }

    // Get date range based on period
    const startDate = new Date(now)
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      startDate.setDate(now.getDate() - 30)
    }

    const days = []
    const current = new Date(startDate)
    while (current <= now) {
      const dayStr = current.toISOString().slice(0, 10)
      const data = map.get(dayStr)
      days.push({
        date: dayStr,
        label: new Date(dayStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: data?.amount || 0,
        count: data?.count || 0,
      })
      current.setDate(current.getDate() + 1)
    }

    return days
  }, [contributions, period])

  const stats = useMemo(() => {
    const total = chartData.reduce((sum, d) => sum + d.amount, 0)
    const avg = chartData.length > 0 ? total / chartData.length : 0
    const max = Math.max(...chartData.map((d) => d.amount), 0)
    return { total, avg, max }
  }, [chartData])

  if (!isClient || chartData.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 holo-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Contribution History</h3>
        </div>
        <div className="py-10 text-center space-y-2">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-body">No contributions yet</p>
          <p className="text-2xs text-muted-foreground">Your history will appear after your first contribution</p>
        </div>
      </div>
    )
  }

  // Responsive chart dimensions
  const height = 200
  const padding = { top: 12, right: 12, bottom: 28, left: 12 }
  const chartHeight = height - padding.top - padding.bottom

  // Calculate dimensions based on container width
  const effectiveWidth = containerWidth > 0 ? containerWidth : 600
  const chartWidth = effectiveWidth - padding.left - padding.right
  const barWidth = Math.max(4, (chartWidth / chartData.length) * 0.7)
  const gap = chartWidth / chartData.length

  // Determine label frequency for readability
  const labelStep = chartData.length <= 14 ? 1 : chartData.length <= 30 ? 2 : 7

  return (
    <div 
      className="glass rounded-2xl p-5 holo-border min-w-0"
      onResize={(e) => setContainerWidth((e.target as HTMLDivElement).clientWidth)}
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-aurora-violet" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Contribution History</h3>
      </div>

      <div className="depth-4 rounded-xl bg-white/[0.02] p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${effectiveWidth} ${height}`} className="w-full h-auto" style={{ minWidth: '100%', minHeight: `${height}px` }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + (1 - pct) * chartHeight
            return (
              <line
                key={`grid-${pct}`}
                x1={padding.left}
                y1={y}
                x2={effectiveWidth - padding.right}
                y2={y}
                stroke="rgb(var(--muted-foreground) / 0.1)"
                strokeWidth="1"
              />
            )
          })}

          {/* Bars */}
          {chartData.map((item, idx) => {
            const x = padding.left + idx * gap + (gap - barWidth) / 2
            const barHeight = stats.max > 0 ? (item.amount / stats.max) * chartHeight : 0
            const y = padding.top + chartHeight - barHeight
            return (
              <g key={`bar-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="2"
                />
              </g>
            )
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--aurora-violet))" />
              <stop offset="100%" stopColor="rgb(var(--aurora-indigo))" />
            </linearGradient>
          </defs>

          {/* X-axis labels */}
          {chartData.map((item, idx) => {
            if (idx % labelStep === 0 || idx === chartData.length - 1) {
              const x = padding.left + idx * gap + gap / 2
              return (
                <text
                  key={`label-${idx}`}
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgb(var(--muted-foreground) / 0.7)"
                >
                  {item.label}
                </text>
              )
            }
            return null
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="text-center">
          <p className="text-2xs text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="font-heading text-lg font-bold gradient-text">{formatCurrency(stats.total, 'USDC')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xs text-muted-foreground uppercase tracking-wide">Average</p>
          <p className="font-heading text-lg font-bold text-foreground">{formatCurrency(stats.avg, 'USDC')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xs text-muted-foreground uppercase tracking-wide">Peak</p>
          <p className="font-heading text-lg font-bold text-foreground">{formatCurrency(stats.max, 'USDC')}</p>
        </div>
      </div>
    </div>
  )
}
