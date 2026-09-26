import type { Metadata } from "next"
import { HomeContent } from "@/components/home-content"

export const metadata: Metadata = {
  title: "Moistello — Stellar Savings Circles",
  description: "Decentralized savings circles on Stellar. Sign in with passkey (Face ID / fingerprint) — your Stellar wallet is created automatically. Zero platform fees, no KYC, no email. Pure coordination software for the next billion.",
  openGraph: {
    type: "website", locale: "en_US", url: "https://moistello.com", siteName: "Moistello",
    title: "Moistello — Decentralized Savings Circles on Stellar",
    description: "Join trustless passkey savings circles with zero intermediaries. Auto-created wallet, zero fees, no KYC. Built on Stellar for true financial sovereignty.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "Moistello - Decentralized Stellar Savings Platform" }],
  },
}

export default function House() {
  return <HomeContent />
}
