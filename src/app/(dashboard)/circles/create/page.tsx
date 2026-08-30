"use client"

import { PageHeader } from "@/components/shared/page-header"
import CreateCircleWizard from "@/components/circles/create-circle-wizard"

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
