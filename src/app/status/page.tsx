import { Metadata } from "next"
import { PublicLayout } from "@/components/layout/public-layout"
import { StatusContent } from "./components/status-content"

export const metadata: Metadata = {
  title: "System Status - Moistello",
  description: "Moistello system status. Real-time uptime and response time for frontend, passkey authentication, API, and database services on Stellar blockchain.",
}

export default function StatusPage() {
  return (
    <PublicLayout>
      <StatusContent />
    </PublicLayout>
  )
}