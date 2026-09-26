"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { TriangleAlert, LogOut } from "lucide-react"

export function SessionTimeoutBanner() {
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!tokenExpiresAt || !isAuthenticated) {
      setTimeLeft(null)
      return
    }

    function update() {
      setTimeLeft(Math.max(0, Math.floor((tokenExpiresAt! - Date.now()) / 1000)))
    }

    update()
    const interval = setInterval(update, 10000)
    return () => clearInterval(interval)
  }, [tokenExpiresAt, isAuthenticated])

  if (timeLeft === null || timeLeft > 300) return null

  if (timeLeft <= 0) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        role="alert"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Session expired. Please sign in again.</span>
      </div>
    )
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400"
      role="status"
    >
      <TriangleAlert className="h-4 w-4 shrink-0" />
      <span>
        Session expires in {minutes}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  )
}
