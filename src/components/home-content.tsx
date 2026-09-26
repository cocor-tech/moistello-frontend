"use client"

import { PublicLayout } from "@/components/layout/public-layout"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { LandingContent } from "@/components/landing/landing-content"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { useAuthStore } from "@/stores/auth-store"

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
