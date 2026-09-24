import Link from "next/link"
import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"
import { Dices, ListOrdered, Gavel, Vote } from "lucide-react"

export const metadata: Metadata = {
  title: "How It Works - Moistello",
  description: "Learn how Moistello's decentralized savings circles work. Sign in with passkey (Face ID / fingerprint) — your Stellar wallet is created automatically. Contribute USDC, receive payouts, and build on-chain reputation. Zero platform fees, no KYC, no email required.",
  keywords: "moistello, stellar, savings circles, how it works, passkey, biometric, auto-wallet, WebAuthn, contribute, payout, reputation, MoiScore, USDC, XLM, Soroban, ROSCA",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/how-it-works" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/how-it-works",
    siteName: "Moistello",
    title: "How Moistello Savings Circles Work - Complete Guide",
    description: "Step-by-step guide to passkey-based savings circles on Stellar. Auto-wallet creation, USDC contributions, payout types, and MoiScore reputation. Zero fees, no KYC.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "How Moistello Works - Step by Step Guide" }],
  },
  twitter: { card: "summary_large_image", title: "How It Works - Moistello", description: "How passkey savings circles work on Stellar. Auto-wallet, zero fees, no KYC or email.", images: ["/logo.jpg"] },
}

import { HowItWorksContent } from "./components/how-it-works-content"

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      <HowItWorksContent />
    </PublicLayout>
  );
}