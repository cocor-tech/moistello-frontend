import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = {
  title: "Terms of Service - Moistello",
  description: "Moistello Terms of Service. Legal agreement covering passkey-based authentication, auto-created Stellar wallets, smart contract risks, liability limitations, and user responsibilities.",
  keywords: "moistello, terms, service, legal, agreement, stellar, smart contracts, liability, passkey, biometric, auto-wallet, WebAuthn, ROSCA, soroban",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/terms",
    siteName: "Moistello",
    title: "Terms of Service - Moistello",
    description: "Legal terms for passkey-based decentralized savings circles on Stellar. Auto-wallet creation, smart contract risks, and user responsibilities.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "Terms of Service - Moistello" }],
  },
  twitter: { card: "summary_large_image", title: "Terms of Service - Moistello", description: "Terms for Moistello passkey savings circles on Stellar. Auto-wallet, smart contract risks.", images: ["/logo.jpg"] },
}

import { TermsContent } from "./components/terms-content"

export default function TermsPage() {
  return (
    <PublicLayout>
      <TermsContent />
    </PublicLayout>
  );
}