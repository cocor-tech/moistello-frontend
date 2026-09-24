import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"
import { SupportContent } from "./components/support-content"

export const metadata: Metadata = {
  title: "Support - Moistello",
  description: "Moistello support center. Get help with passkey sign-in, auto-created Stellar wallets, savings circles, USDC contributions, and MoiScore reputation. Zero fees, no KYC required.",
  keywords: "moistello, support, help, stellar, passkey, biometric, auto-wallet, WebAuthn, savings circles, USDC, MoiScore, contact, ticket, FAQ",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/support" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/support",
    siteName: "Moistello",
    title: "Support - Moistello",
    description: "Get help with Moistello's passkey-based savings circles, auto-wallet, and USDC contributions on Stellar blockchain.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "Support - Moistello" }],
  },
  twitter: { card: "summary_large_image", title: "Support - Moistello", description: "Get help with Moistello passkey savings platform on Stellar.", images: ["/logo.jpg"] },
}

export default function SupportPage() {
  return (
    <PublicLayout>
      <SupportContent />
    </PublicLayout>
  )
}