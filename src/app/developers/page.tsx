import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"
import { DeveloperApiReference } from "./components/DeveloperApiReference"
import { DeveloperCommitment } from "./components/DeveloperCommitment"
import { DeveloperContributors } from "./components/DeveloperContributors"
import { DeveloperContracts } from "./components/DeveloperContracts"
import { DeveloperErrorCodes } from "./components/DeveloperErrorCodes"
import { DeveloperHero } from "./components/DeveloperHero"
import { DeveloperQuickStart } from "./components/DeveloperQuickStart"
import { DeveloperResources } from "./components/DeveloperResources"
import { DeveloperStats } from "./components/DeveloperStats"

export const metadata: Metadata = buildRouteMetadata("/developers")

export default function DevelopersPage() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        <DeveloperHero />
        <DeveloperStats />
        <section className="container-premium pb-20" aria-label="Developer resources and API reference">
          <div className="hidden md:block space-y-8">
            <DeveloperQuickStart />
            <DeveloperApiReference />
            <DeveloperContracts headingId="contracts-title-desktop" />
            <DeveloperErrorCodes />
            <DeveloperResources headingId="resources-title-desktop" />
          </div>
          <div className="md:hidden space-y-6">
            <DeveloperQuickStart mobile />
            <DeveloperContracts mobile headingId="contracts-title-mobile" />
            <DeveloperResources mobile headingId="resources-title-mobile" />
          </div>
        </section>
        <DeveloperContributors />
        <DeveloperCommitment />
      </div>
    </PublicLayout>
  )
}
