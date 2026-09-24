import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = {
  title: "About - Moistello",
  description: "Moistello brings traditional savings circles to the Stellar blockchain. Sign in with passkey (Face ID / fingerprint) — no email, no password, no wallet setup. Your Stellar wallet is auto-created. Zero platform fees, no KYC needed. Pure coordination software for trustless savings.",
  keywords: "moistello, stellar, savings circles, soroban, blockchain, unbanked, financial inclusion, esusu, passkey, biometric, auto-wallet, WebAuthn",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/about",
    siteName: "Moistello",
    title: "About Moistello - Financial Inclusion on Stellar",
    description: "Learn about Moistello's mission to bring trustless savings circles to 1.3 billion unbanked adults. Passkey-based auth, auto-created Stellar wallets, zero fees, no KYC — pure coordination software.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "About Moistello - Our Mission" }],
  },
  twitter: { card: "summary_large_image", title: "About - Moistello", description: "Moistello brings passkey savings to Stellar. Auto-wallet, zero fees, no KYC/email. Pure coordination software.", images: ["/logo.jpg"] },
}

import { AboutContent } from "./components/about-content"

export default function AboutPage() {
  return (
    <PublicLayout>
      <AboutContent />
    </PublicLayout>
  );
}