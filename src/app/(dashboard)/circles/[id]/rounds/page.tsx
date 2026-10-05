"use client"

import React from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Inbox } from "lucide-react"
import { useCircle, useCircleMembers, useCircleRounds } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ButtonLink } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RoundHistoryTimeline } from "./round-history-timeline"

export default function CircleRoundsPage() {
  const params = useParams()
  const circleId = params.id as string

  const { data: circle } = useCircle(circleId)
  // Member names are needed to label each contribution; without them the
  // detail rows would show raw user ids.
  const { data: members = [] } = useCircleMembers(circleId)
  const { data: rounds = [], isLoading, isError } = useCircleRounds(circleId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rounds"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "Circle", href: `/circles/${circleId}` },
            { label: "Rounds" },
          ]}
          action={
            <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </ButtonLink>
          }
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-40 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rounds"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "Circle", href: `/circles/${circleId}` },
            { label: "Rounds" },
          ]}
          action={
            <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </ButtonLink>
          }
        />
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Failed to load rounds"
          description="Something went wrong. Please try again."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rounds"
        description="Round history and contribution tracking"
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: circle?.name ?? "Circle", href: `/circles/${circleId}` },
          { label: "Rounds" },
        ]}
        action={
          <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Circle
            </ButtonLink>
        }
      />

      <RoundHistoryTimeline
        rounds={rounds}
        members={members}
        maxMembers={circle?.maxMembers ?? 0}
        contributionAmount={circle?.contributionAmount ?? 0}
        currentRound={circle?.currentRound ?? 0}
        currency={circle?.currency ?? "USDC"}
        circleName={circle?.name ?? "This circle"}
      />
    </div>
  )
}
