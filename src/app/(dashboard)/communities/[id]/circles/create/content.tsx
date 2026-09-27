"use client"

import React from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { PageHeader } from "@/components/shared/page-header"

const CreateCircleWizard = dynamic(
  () => import("@/components/circles/create-circle-wizard"),
  { ssr: false }
)

export default function CommunityCreateCircleContent() {
  const params = useParams()
  const communityId = params.id as string

  return (
    <div className="space-y-6">
      <PageHeader title="Create Circle" description="Set up a savings circle for this community"
        breadcrumbs={[
          { label: "Communities", href: "/communities" },
          { label: "Community", href: `/communities/${communityId}` },
          { label: "Circles", href: `/communities/${communityId}/circles` },
          { label: "Create" },
        ]} />
      <CreateCircleWizard communityId={communityId} />
    </div>
  )
}
