'use client'

import { useMemo, useState, useEffect } from 'react'
import { Calendar, Inbox } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import type { Payout } from '@/types'

interface PayoutTimelineChartProps {
  payouts: Payout[]
}

/**
 * Payout timeline chart showing scheduled payouts over time
 * Visualizes payout distribution and amounts
 */
export function PayoutTimelineChart({ payouts }: PayoutTimelineChartProps) {
  const [isClient, setIsClient] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const chartData = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; payouts: Payout[] }>()
    const now = Date.now()

    for (const p of payouts) {
      const date = new Date(p.createdAt)
      // Only include future payouts
      if (date.getTime() >= now) {
        const day = date.toISOString().slice(0, 10)
        const existing = map.get(day) || { amount: 0, count: 0, payouts: [] }
        map.set(day, {
          amount: existing.amount + p.amount,
          count: existing.count + 1,
          payouts: [...existing.payouts, p],
        })
      }
    }

    // Get next 60 days
    const days = []
    const startDate = new Date()
    for (let i = 0; i < 60; i++) {
      const current = new Date(startDate)
      current.setDate(startDate.getDate() + i)
      const dayStr = current.toISOString().slice(0, 10)
      const data = map.get(dayStr)
      days.push({
        date: dayStr,
        label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: data?.amount || 0,
        count: data?.count || 0,
        payouts: data?.payouts || [],
      })
    }

    return days.filter((d) => d.amount > 0)
  }, [payouts])

  const stats = useMemo(() => {
    const total = chartData.reduce((sum, d) => sum + d.amount, 0)
    const upcoming = chartData.length
    const avgPerDay = upcoming > 0 ? total / upcoming : 0
    return { total, upcoming, avgPerDay }
  }, [chartData])

  if (!isClient || chartData.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 holo-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Payout Timeline</h3>
        </div>
        <div className="py-10 text-center space-y-2">
          <Inbox className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-body">No upcoming payouts</p>
          <p className="text-2xs text-muted-foreground">Scheduled payouts will appear here</p>
        </div>
      </div>
    )
  }

  // Responsive chart dimensions
  const height = 120
  const padding = { top: 8, right: 8, bottom: 28, left: 8 }
  const chartHeight = height - padding.top - padding.bottom

  // Calculate dimensions based on container width
  const effectiveWidth = containerWidth > 0 ? containerWidth : 600
  const chartWidth = effectiveWidth - padding.left - padding.right
  const pointSpacing = chartData.length > 1 ? chartWidth / (chartData.length - 1) : chartWidth
  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1)

  const points = chartData
    .map((item, idx) => {
      const x = padding.left + idx * pointSpacing
      const y = padding.top + chartHeight - (item.amount / maxAmount) * chartHeight
      return `${x},${y}`
    })
    .join(' ')

  const areaPoints = `${padding.left},${height - padding.bottom} ${points} ${effectiveWidth - padding.right},${height - padding.bottom}`

  // Determine label frequency for readability
  const labelStep = chartData.length <= 4 ? 1 : Math.ceil(chartData.length / 4)

  return (
    <div 
      ref={containerRef}
      className="glass rounded-2xl p-5 holo-border min-w-0"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-emerald-400" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Payout Timeline</h3>
      </div>

      <div className="depth-4 rounded-xl bg-white/[0.02] p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${effectiveWidth} ${height}`} className="w-full h-auto" style={{ minWidth: '100%', minHeight: `${height}px` }}>
          {/* Area fill */}
          <defs>
            <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--emerald-500) / 0.25)" />
              <stop offset="100%" stopColor="rgb(var(--emerald-500) / 0)" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#payoutGradient)" />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="rgb(var(--emerald-500) / 0.8)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.map((item, idx) => {
            const x = padding.left + idx * pointSpacing
            const y = padding.top + chartHeight - (item.amount / maxAmount) * chartHeight
            return (
              <g key={`point-${idx}`}>
                <circle cx={x} cy={y} r="3" fill="rgb(var(--emerald-500))" opacity="0.8" />
              </g>
            )
          })}

          {/* X-axis labels */}
          {chartData.map((item, idx) => {
            const showLabel = idx === 0 || idx === chartData.length - 1 || idx % labelStep === 0
            if (showLabel) {
              const x = padding.left + idx * pointSpacing
              return (
                <text
                  key={`label-${idx}`}
                  x={x}
                  y={height - 8}
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
          <p className="text-2xs text-muted-foreground uppercase tracking-wide">Total Due</p>
          <p className="font-heading text-lg font-bold gradient-text">{formatCurrency(stats.total, 'USDC')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xs text-muted-foreground uppercase tracking-wide">Upcoming</p>
          <p className="font-heading text-lg font-bold text-foreground">{stats.upcoming}</p>
        </div>
        <div className="text-center">
          <p className="text-2xs text-muted-foreground uppercase tracking-wide">Average</p>
          <p className="font-heading text-lg font-bold text-foreground">{formatCurrency(stats.avgPerDay, 'USDC')}</p>
        </div>
      </div>
    </div>
  )
}
