"use client"

import React from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useCircles } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/formatters"
import { Users, Clock, Shield, Plus, Inbox, Swords, Settings } from "lucide-react"
import type { CircleType } from "@/types"

const typeAccentColors: Record<CircleType, string> = {
  public: "from-emerald-500 to-cyan-400",
  private: "from-indigo-500 to-violet-400",
  community: "from-amber-400 to-violet-500",
  premium: "from-violet-500 to-fuchsia-400",
}

export default function OrganizingPage() {
  const { user } = useAuth()
  const { data, isLoading, isError } = useCircles({ limit: 50, organizerId: user?.id })
  const circles = data?.circles ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circles You Organize"
        description="Manage your circles, invite members, and track progress."
        action={
          <ButtonLink href="/circles/create"  variant="premium" size="md" leftIcon={<Plus className="h-4 w-4" />}>
              Create Circle
            </ButtonLink>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="Failed to load" description="Something went wrong." />
      ) : circles.length === 0 ? (
        <EmptyState
          icon={<Swords className="h-6 w-6" />}
          title="No circles organized yet"
          description="Circles you create will appear here."
          action={{ label: "Create Your First Circle", onClick: () => window.location.href = "/circles/create" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {circles.map((circle) => {
            const freqLabel = circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1)
            const memberCount = circle.memberCount ?? 0
            const progressPct = Math.min(100, Math.round((circle.currentRound / (circle.maxMembers || 1)) * 100))
            const accentGradient = typeAccentColors[circle.circleType] ?? typeAccentColors.public

            return (
              <div key={circle.id} className="glass-premium rounded-2xl overflow-hidden holo-border relative group">
                <div className={cn("h-[3px] w-full bg-gradient-to-r", accentGradient)} />
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-heading text-lg font-semibold text-foreground dark:text-white truncate">{circle.name}</h4>
                      <p className="text-2xs text-muted-foreground mt-0.5 capitalize">{circle.circleType}</p>
                    </div>
                    <Badge variant={circle.status === "active" ? "success" : circle.status === "pending" ? "warning" : "default"} size="sm" className="shrink-0 ml-2">{circle.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="gradient-text font-bold font-heading">{formatCurrency(circle.contributionAmount, circle.currency)}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{freqLabel}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{memberCount}/{circle.maxMembers}</span>
                    {circle.minMoiScore != null && circle.minMoiScore > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-xs"><Shield className="h-3 w-3" />{circle.minMoiScore}+</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-2xs text-muted-foreground">
                      <span>Round Progress</span><span>{circle.currentRound}/{circle.maxMembers}</span>
                    </div>
                    <Progress aria-label="Circle contribution progress" value={progressPct} size="sm" variant={progressPct >= 80 ? "success" : "primary"} />
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <Link href={`/circles/${circle.id}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body">View Details &rarr;</Link>
                    <Link href={`/circles/${circle.id}/settings`} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-1"><Settings className="h-3 w-3" />Manage</Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
