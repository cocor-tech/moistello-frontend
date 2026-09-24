import Link from "next/link"
import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = {
  title: "FAQ - Moistello",
  description: "Frequently asked questions about Moistello. Passkey-based authentication, auto-created Stellar wallets, USDC contributions, MoiScore reputation, and zero platform fees — no KYC, no email needed.",
  keywords: "moistello, stellar, savings circles, FAQ, questions, passkey, biometric, auto-wallet, WebAuthn, USDC, XLM, MoiScore, reputation, smart contracts",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/faq" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/faq",
    siteName: "Moistello",
    title: "Moistello FAQ - All Questions Answered",
    description: "Answers to common questions about passkey savings circles, auto-wallet creation, USDC, MoiScore reputation, and zero-fee platform on Stellar.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "Moistello FAQ - Questions Answered" }],
  },
  twitter: { card: "summary_large_image", title: "FAQ - Moistello", description: "FAQ about passkey savings circles on Stellar. Auto-wallet, zero fees, no KYC.", images: ["/logo.jpg"] },
}

import { FAQContent } from "./components/faq-content"

export default function FAQPage() {
  return (
    <PublicLayout>
      <FAQContent />
    </PublicLayout>
  );
}