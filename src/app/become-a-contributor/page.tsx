import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"
import { ContributorContent } from "./components/contributor-content"

export const metadata: Metadata = {
  title: "Become a Contributor - Moistello",
  description: "Join Moistello's mission to build financial coordination tools. Passkey-based auth, auto-created Stellar wallets, zero platform fees, no KYC. We welcome developers, designers, writers, and community builders.",
  keywords: "moistello, contribute, open source, stellar, blockchain, developer, contributor, financial inclusion, soroban, typescript, react, passkey, biometric, auto-wallet, WebAuthn",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/become-a-contributor" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/become-a-contributor",
    siteName: "Moistello",
    title: "Become a Contributor - Join Moistello's Mission",
    description: "Build passkey-based financial coordination on Stellar. Auto-wallet, zero fees, no KYC. Apply to contribute as developer, designer, or writer.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "Become a Contributor - Moistello" }],
  },
  twitter: { card: "summary_large_image", title: "Become a Contributor - Moistello", description: "Join Moistello's passkey savings mission on Stellar. Auto-wallet, zero fees, no KYC.", images: ["/logo.jpg"] },
}

export default function BecomeAContributorPage() {
  return (
    <PublicLayout>
      <ContributorContent />
    </PublicLayout>
  )
}