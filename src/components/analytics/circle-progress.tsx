"use client"

import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { Target } from "lucide-react"

export interface CircleProgressItem {
  label: string
  current: number
  max: number
  color: string
  icon?: React.ReactNode
}

interface CircleProgressProps {
  items?: CircleProgressItem[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  size?: number
}

function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color,
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference - progress * circumference
  const center = size / 2

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgb(var(--space-200) / 0.3)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-premium"
      />
    </svg>
  )
}

export function CircleProgress({
  items = [],
  isLoading = false,
  error = null,
  onRetry,
  size = 120,
}: CircleProgressProps) {
  if (error) {
    return (
      <div className="glass rounded-2xl p-5 holo-border flex flex-col items-center justify-center text-center gap-3">
        <Target className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load progress data.</p>
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
        <Skeleton variant="text" className="h-4 w-40 mb-6" />
        <div className="flex flex-wrap justify-center gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <Skeleton variant="circular" className="rounded-full" style={{ width: size, height: size }} />
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 holo-border">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Progress</h3>
        </div>
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="No progress data"
          description="Circle progress will appear here once available."
          className="max-w-xs mx-auto py-8"
        />
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5 holo-border">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-4 w-4 text-aurora-violet" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Progress</h3>
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {items.map((item, i) => {
          const pct = item.max > 0 ? Math.round((item.current / item.max) * 100) : 0
          return (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="relative">
                <CircularProgress
                  value={item.current}
                  max={item.max}
                  size={size}
                  color={item.color}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-heading text-lg font-bold text-foreground">
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.current} / {item.max}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
