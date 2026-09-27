"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, ButtonLink } from "@/components/ui/button"
import { Bookmark, Clock, Users, ExternalLink, Trash2 } from "lucide-react"
import { useCircle } from "@/hooks/use-circles"
import { formatCurrency } from "@/lib/formatters"

const SAVED_KEY = "moistello_saved_circles"

function getSavedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]") } catch { return [] }
}

function SavedCircleCard({ id, onRemove }: { id: string; onRemove: (id: string) => void }) {
  const { data: circle, isLoading } = useCircle(id)

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl p-5 holo-border animate-pulse">
        <div className="h-5 w-3/4 bg-white/10 rounded mb-3" />
        <div className="h-4 w-1/2 bg-white/10 rounded" />
      </div>
    )
  }
  if (!circle) return null

  const freqLabel = circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1)
  const memberCount = circle.memberCount ?? 0

  return (
    <div className="glass-premium rounded-2xl p-5 holo-border relative group">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <Link href={`/circles/${circle.id}`} className="font-heading text-lg font-semibold text-foreground dark:text-white truncate hover:underline block">
            {circle.name}
          </Link>
          <p className="text-2xs text-muted-foreground mt-0.5 capitalize">{circle.circleType}</p>
        </div>
        <Badge variant={circle.status === "active" ? "success" : circle.status === "pending" ? "warning" : "default"} size="sm" className="shrink-0 ml-2">{circle.status}</Badge>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <span className="gradient-text font-bold font-heading">{formatCurrency(circle.contributionAmount, circle.currency)}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{freqLabel}</span>
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{memberCount}/{circle.maxMembers}</span>
      </div>
      <div className="flex items-center gap-2">
        <ButtonLink href={`/circles/${circle.id}`}  variant="outline" size="xs" leftIcon={<ExternalLink className="h-3 w-3" />}>Open</ButtonLink>
        <Button variant="ghost" size="xs" onClick={() => onRemove(id)} leftIcon={<Trash2 className="h-3 w-3" />} className="text-red-400 hover:text-red-300">Remove</Button>
      </div>
    </div>
  )
}

export default function SavedCirclesPage() {
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => { setSavedIds(getSavedIds()) }, [])

  const handleRemove = (id: string) => {
    const next = savedIds.filter((x) => x !== id)
    setSavedIds(next)
    localStorage.setItem(SAVED_KEY, JSON.stringify(next))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved Circles"
        description="Circles you've bookmarked for quick access."
      />

      {savedIds.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="No saved circles"
          description="Bookmark circles you're interested in by clicking the bookmark icon on any circle."
          action={{ label: "Browse Circles", onClick: () => window.location.href = "/circles" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedIds.map((id) => (
            <SavedCircleCard key={id} id={id} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  )
}
