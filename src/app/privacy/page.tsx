import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = {
  title: "Privacy Policy - Moistello",
  description: "Moistello privacy policy. Learn how we handle passkey credentials, auto-created Stellar wallets, on-chain activity, and your rights. No email, no KYC data collected.",
  keywords: "moistello, privacy, policy, data, passkey, biometric, auto-wallet, WebAuthn, stellar, blockchain, MoiScore, unbanked",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/privacy",
    siteName: "Moistello",
    title: "Privacy Policy - Moistello",
    description: "Our privacy policy covers passkey credentials, auto-created Stellar wallets, on-chain data, and user rights. No email or KYC storage.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "Privacy Policy - Moistello" }],
  },
  twitter: { card: "summary_large_image", title: "Privacy Policy - Moistello", description: "Moistello privacy — passkey-only, auto-wallet, no email or KYC data.", images: ["/logo.jpg"] },
}

import { PrivacyContent } from "./components/privacy-content"

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <PrivacyContent />
    </PublicLayout>
  );
}