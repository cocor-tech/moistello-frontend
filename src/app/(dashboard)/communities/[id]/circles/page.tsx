"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Shield, Plus, CircleDot, DollarSign } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button"
import { get } from "@/lib/api-client"
import { formatCurrency } from "@/lib/formatters"

interface CommunityCircle {
  id: string
  name: string
  status: string
  contributionAmount: number
  currency: string
  frequency: string
  maxMembers: number
  currentRound: number
  memberCount?: number
  minMoiScore?: number
  requiresInvite?: boolean
}

export default function CommunityCirclesPage() {
  const params = useParams()
  const communityId = params.id as string
  const [circles, setCircles] = useState<CommunityCircle[]>([])
  const [communityName, setCommunityName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [cRes, circlesRes] = await Promise.allSettled([
          get(`/communities/${communityId}`),
          get(`/circles?communityId=${communityId}`),
        ])

        if (cRes.status === "fulfilled") {
          const d = (cRes.value as Record<string, unknown>)?.data as Record<string, unknown> ?? cRes.value as Record<string, unknown>
          const com = d?.community as Record<string, unknown> ?? {}
          setCommunityName(String(com?.name ?? ""))
        }

        if (circlesRes.status === "fulfilled") {
          const d = (circlesRes.value as Record<string, unknown>)?.data as Record<string, unknown> ?? circlesRes.value as Record<string, unknown>
          setCircles((d?.circles ?? []) as CommunityCircle[])
        }
      } catch (e) {
        logger.error("[community-circles] Failed to load data:", e)
      }
      setLoading(false)
    }
    load()
  }, [communityId])

  const statusColor: Record<string, "success" | "warning" | "default"> = {
    active: "success",
    pending: "warning",
    completed: "default",
    cancelled: "default",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/communities/${communityId}`} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to community">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            {communityName || "Community"} Circles
          </h1>
          <p className="text-sm text-muted-foreground">Savings circles in this community</p>
        </div>
      </div>

      <div className="flex justify-end">
        <ButtonLink href={`/communities/${communityId}/circles/create`} variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
          Create Circle
        </ButtonLink>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : circles.length === 0 ? (
        <EmptyState
          icon={<CircleDot className="h-6 w-6" />}
          title="No circles yet"
          description="Be the first to create a savings circle in this community."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {circles.map((c) => (
            <Link key={c.id} href={`/circles/${c.id}`}>
              <div className="border border-white/10 rounded-xl p-5 hover:bg-white/[0.02] transition-colors space-y-3 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-sm font-semibold text-foreground truncate">{c.name}</h3>
                        {c.requiresInvite && <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                      </div>
                    </div>
                    <Badge variant={statusColor[c.status] ?? "default"} size="sm">{c.status}</Badge>
                  </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(c.contributionAmount, c.currency)} / {c.frequency}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {c.memberCount ?? 0}/{c.maxMembers}
                  </span>
                  {c.minMoiScore != null && c.minMoiScore > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Shield className="h-3 w-3" /> {c.minMoiScore}+
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link href={`/communities/${communityId}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Community
      </Link>
    </div>
  )
}
