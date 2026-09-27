"use client"

import React, { useMemo } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Clock, Inbox, CheckCircle, Circle } from "lucide-react"
import { useCircle, useCircleRounds } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/formatters"

function getNextDate(frequency: string, from: Date): Date {
  const d = new Date(from)
  switch (frequency) {
    case "daily": d.setDate(d.getDate() + 1); break
    case "weekly": d.setDate(d.getDate() + 7); break
    case "biweekly": d.setDate(d.getDate() + 14); break
    case "monthly": d.setMonth(d.getMonth() + 1); break
  }
  return d
}

export default function SchedulePage() {
  const params = useParams()
  const circleId = params.id as string

  const { data: circle, isLoading: cLoading } = useCircle(circleId)
  const { data: rounds = [], isLoading: rLoading } = useCircleRounds(circleId)

  const schedule = useMemo(() => {
    if (!circle) return []

    const startDate = circle.startDate ? new Date(circle.startDate) : new Date()
    const items: { round: number; date: Date; isPast: boolean; isCurrent: boolean; amount: number }[] = []

    for (let i = 0; i < circle.maxMembers; i++) {
      const roundNum = i + 1
      const date = i === 0 ? startDate : getNextDate(circle.frequency, items[i - 1].date)
      const completedRound = rounds.find((r) => r.roundNumber === roundNum)
      const isPast = roundNum < circle.currentRound
      const isCurrent = roundNum === circle.currentRound

      items.push({
        round: roundNum,
        date,
        isPast: !!completedRound || isPast,
        isCurrent,
        amount: circle.contributionAmount,
      })
    }

    return items
  }, [circle, rounds])

  if (cLoading || rLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Schedule" breadcrumbs={[{ label: "Circles", href: "/circles" }, { label: "Circle", href: `/circles/${circleId}` }, { label: "Schedule" }]} />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="card" className="h-16 rounded-xl" />)}
      </div>
    )
  }

  if (!circle) {
    return <div className="space-y-6"><PageHeader title="Schedule" /><EmptyState icon={<Inbox className="h-6 w-6" />} title="Circle not found" /></div>
  }

  const upcoming = schedule.filter((s) => !s.isPast)
  const nextRound = upcoming[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description={`${schedule.length} rounds · ${circle.frequency}`}
        breadcrumbs={[{ label: "Circles", href: "/circles" }, { label: circle.name, href: `/circles/${circleId}` }, { label: "Schedule" }]}
        action={<ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</ButtonLink>}
      />

      {nextRound && (
        <div className="glass-premium rounded-2xl p-5 holo-border bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xs text-muted-foreground font-heading tracking-wider uppercase">Next Round</p>
              <p className="text-xl font-bold font-heading gradient-text mt-1">Round {nextRound.round}</p>
              <p className="text-sm text-muted-foreground mt-1">{nextRound.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-heading gradient-text">{formatCurrency(nextRound.amount, circle.currency)}</p>
              <p className="text-xs text-muted-foreground">due this round</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {schedule.map((s) => (
          <div
            key={s.round}
            className={cn(
              "flex items-center justify-between rounded-xl px-4 py-3 transition-all",
              s.isCurrent && "glass-premium holo-border",
              s.isPast && !s.isCurrent && "opacity-50",
              !s.isPast && !s.isCurrent && "glass-whisper hover:glass-premium",
            )}
          >
            <div className="flex items-center gap-3">
              {s.isPast ? (
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : s.isCurrent ? (
                <Clock className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className={cn("text-sm font-heading font-semibold", s.isCurrent ? "text-foreground dark:text-white" : "text-muted-foreground")}>
                  Round {s.round}
                </p>
                <p className="text-xs text-muted-foreground">{s.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-bold", s.isCurrent ? "gradient-text" : "text-muted-foreground")}>{formatCurrency(s.amount, circle.currency)}</p>
              <Badge variant={s.isPast ? "success" : s.isCurrent ? "primary" : "default"} size="sm">{s.isPast ? "Completed" : s.isCurrent ? "Current" : "Upcoming"}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
