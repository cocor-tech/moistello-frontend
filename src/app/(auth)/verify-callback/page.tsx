"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { waitForSessionEstablished } from "@/lib/wait-for-session"

/**
 * Lands here after email verification. Waits for the session cookie to be
 * established (bounded retries) before redirecting, instead of redirecting
 * immediately and bouncing back here when the cookie isn't set yet
 * (issue #494).
 */
export default function VerifyCallbackPage() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        return res.ok
      } catch {
        return false
      }
    }

    void waitForSessionEstablished(checkSession).then((established) => {
      if (cancelled) return
      if (established) router.replace("/")
      else setFailed(true)
    })

    return () => {
      cancelled = true
    }
  }, [router])

  if (failed) {
    return (
      <AuthLayout title="Couldn't sign you in">
        <p className="text-sm text-muted-foreground mb-4">
          Verification succeeded, but we couldn&apos;t establish your session in time.
        </p>
        <Button variant="primary" size="md" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Signing you in…">
      <p className="text-sm text-muted-foreground">Just a moment.</p>
    </AuthLayout>
  )
}
