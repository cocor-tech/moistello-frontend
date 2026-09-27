"use client"

import dynamic from "next/dynamic"
import { PageHeader } from "@/components/shared/page-header"

const CreateCircleWizard = dynamic(
  () => import("@/components/circles/create-circle-wizard"),
  { ssr: false }
)

export default function CreateCirclePage() {
  return (
    <main className="space-y-6" aria-label="Create circle main content">
      <PageHeader
        title="Create Savings Circle"
        description="Set up a new rotating savings and credit association circle."
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: "Create" },
        ]}
      />
      <CreateCircleWizard />
    </main>
  )
}
