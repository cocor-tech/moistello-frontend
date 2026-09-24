import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"
import { Activity, CheckCircle, Clock } from "lucide-react"

export const metadata: Metadata = {
  title: "System Status - Moistello",
  description: "Moistello system status. Real-time uptime and response time for frontend, passkey authentication, API, and database services on Stellar blockchain.",
  keywords: "moistello, status, uptime, system status, stellar, API, frontend, database, monitoring, passkey, auto-wallet, WebAuthn",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Moistello",
  publisher: "Moistello",
  alternates: { canonical: "/status" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com/status",
    siteName: "Moistello",
    title: "System Status - Moistello",
    description: "Real-time status for Moistello passkey savings services. Check uptime and response times.",
    images: [{ url: "/logo.jpg", width: 1200, height: 630, alt: "System Status - Moistello" }],
  },
  twitter: { card: "summary_large_image", title: "System Status - Moistello", description: "Check real-time uptime for Moistello passkey savings platform, API, and database.", images: ["/logo.jpg"] },
}

const STATUS_DATA = {
  frontend: { status: "operational", uptime: "99.9%", responseTime: "42ms" },
  api: { status: "operational", uptime: "99.8%", responseTime: "87ms" },
  database: { status: "operational", uptime: "99.9%", responseTime: "12ms" },
}

import { StatusContent } from "./components/status-content"

export default function StatusPage() {
  return (
    <PublicLayout>
      <StatusContent />
    </PublicLayout>
  )
}