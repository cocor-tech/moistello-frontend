"use client"

import React, { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Inbox, DollarSign, UserPlus, Settings, Award, Clock } from "lucide-react"
import { useCircle, useCircleMembers, useCircleRounds } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ButtonLink } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/formatters"

type ActivityType = "all" | "member" | "contribution" | "payout" | "round" | "settings"

interface Activity {
  id: string
  type: ActivityType
  description: string
  amount?: number
  currency?: string
  timestamp: string
  userId?: string
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  all: <Clock className="h-4 w-4" />,
  member: <UserPlus className="h-4 w-4" />,
  contribution: <DollarSign className="h-4 w-4" />,
  payout: <Award className="h-4 w-4" />,
  round: <Clock className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
}

const activityColors: Record<ActivityType, string> = {
  all: "bg-blue-500/20 text-blue-400",
  member: "bg-emerald-500/20 text-emerald-400",
  contribution: "bg-amber-500/20 text-amber-400",
  payout: "bg-purple-500/20 text-purple-400",
  round: "bg-cyan-500/20 text-cyan-400",
  settings: "bg-gray-500/20 text-gray-400",
}

const typeFilters: { value: ActivityType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "contribution", label: "Contributions" },
  { value: "payout", label: "Payouts" },
  { value: "member", label: "Members" },
  { value: "round", label: "Rounds" },
  { value: "settings", label: "Settings" },
]

export default function ActivityPage() {
  const params = useParams()
  const circleId = params.id as string

  const { data: circle } = useCircle(circleId)
  const { data: members = [] } = useCircleMembers(circleId)
  const { data: rounds = [] } = useCircleRounds(circleId)

  const [typeFilter, setTypeFilter] = useState<ActivityType>("all")

  const activities: Activity[] = useMemo(() => {
    const items: Activity[] = []

    for (const m of members) {
      items.push({
        id: `member-${m.id}`,
        type: "member",
        description: `${m.userName || "A member"} joined the circle`,
        timestamp: m.joinedAt,
        userId: m.userId,
      })
    }

    for (const r of rounds) {
      for (const contrib of r.contributions) {
        items.push({
          id: `contrib-${contrib.id}`,
          type: "contribution",
          description: `Round ${r.roundNumber} contribution recorded`,
          amount: contrib.amount,
          timestamp: contrib.createdAt,
          userId: contrib.userId,
        })
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (items.length === 0) {
      items.push({
        id: "created",
        type: "settings",
        description: `Circle "${circle?.name ?? "Untitled"}" was created`,
        timestamp: circle?.createdAt ?? new Date().toISOString(),
      })
    }

    return items
  }, [members, rounds, circle])

  const filtered = typeFilter === "all" ? activities : activities.filter((a) => a.type === typeFilter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description={`${activities.length} event${activities.length !== 1 ? "s" : ""}`}
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: circle?.name ?? "Circle", href: `/circles/${circleId}` },
          { label: "Activity" },
        ]}
        action={
          <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</ButtonLink>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={typeFilter === f.value}
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-body font-medium transition-all",
              typeFilter === f.value ? "gradient-bg-extended text-white shadow-lg" : "glass-whisper text-muted-foreground hover:text-foreground",
            )}
          >
            {activityIcons[f.value]}
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="No activity yet" description="Activity will appear as members join and contributions are made." />
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-1">
            {filtered.map((event) => (
              <div key={event.id} className="relative flex items-start gap-4 py-2 group">
                <div className={cn("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", activityColors[event.type])}>
                  {activityIcons[event.type]}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-sm text-foreground dark:text-white">{event.description}</p>
                  {event.amount != null && (
                    <p className="text-xs gradient-text font-bold mt-0.5">{formatCurrency(event.amount, event.currency ?? "USDC")}</p>
                  )}
                  <p className="text-2xs text-muted-foreground mt-0.5">{new Date(event.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
