"use client"

import dynamic from "next/dynamic"
import { useAuthStore } from "@/stores/auth-store"

const PublicLayout = dynamic(
  () => import("@/components/layout/public-layout").then((m) => m.PublicLayout),
  { ssr: true }
)

const LandingContent = dynamic(
  () => import("@/components/landing/landing-content").then((m) => m.LandingContent),
  { ssr: true }
)

const DashboardLayout = dynamic(
  () => import("@/components/layout/dashboard-layout").then((m) => m.DashboardLayout),
  { ssr: false }
)

const DashboardContent = dynamic(
  () => import("@/components/dashboard/dashboard-content").then((m) => m.DashboardContent),
  { ssr: false }
)

export function HomeContent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const token = useAuthStore((s) => s.token)

  // If we have a token but auth hasn't resolved yet, show nothing (not the landing page)
  if (token && isLoading) return null

  // Auth resolved and user is authenticated
  if (isAuthenticated) {
    return (
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    )
  }

  // Auth resolved and user is NOT authenticated — only then show landing page
  if (!isLoading) {
    return (
      <PublicLayout>
        <LandingContent />
      </PublicLayout>
    )
  }

  // Still loading with no token — wait
  return null
}
