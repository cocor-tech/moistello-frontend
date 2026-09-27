import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "Developers - Moistello",
  description: "Moistello developer platform. Build on Stellar with passkey-based authentication, auto-created wallets, and our complete API documentation. 27 endpoints, 7 Soroban contracts, zero platform fees, no KYC.",
  keywords: "moistello, developers, API, stellar, soroban, smart contracts, open source, typescript, react, rest API, blockchain, passkey, biometric, auto-wallet, WebAuthn",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/developers" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/developers",
    siteName: "Moistello",
    title: "Developers - Moistello",
    description: "Build on Moistello's Stellar savings platform. Passkey auth, auto-wallet, zero fees. Full API docs and smart contracts for developers.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "Developers - Moistello" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developers - Moistello",
    description: "Build on Moistello — passkey auth, auto-wallet, zero fees on Stellar.",
    images: ["/logo.jpg"],
  },
}

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
