"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, ScanFace, CircleCheck, CircleAlert, LoaderCircle } from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { post } from "@/lib/api-client"

export default function PasskeySetupPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  
  const [step, setStep] = useState<"intro" | "registering" | "success" | "error">("intro")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if not authenticated
  useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) {
      router.replace("/login")
    }
  }, [router])

  const handleRegisterPasskey = useCallback(async () => {
    setLoading(true)
    setError("")
    setStep("registering")
    
    try {
      const adapter = (await import("@/lib/wallet/registry")).getWalletRegistry().getAdapter("passkey")
      if (!adapter) {
        throw new Error("Passkey not available")
      }

      adapter.reset?.()
      const result = await adapter.connect()
      const { publicKey, credentialId } = result as { publicKey: string; credentialId: string }
      
      if (!publicKey || !credentialId) {
        throw new Error("Failed to register passkey")
      }

      // Register with backend
      const res = await post<{ data?: Record<string, unknown> } & Record<string, unknown>>("/auth/passkey/register", {
        credentialId,
        publicKey,
        userId: user?.id,
      })
      
      const body = res?.data ?? res as Record<string, unknown>
      if (body?.success) {
        setStep("success")
        addToast({ type: "success", title: "Passkey registered successfully" })
      } else {
        throw new Error(typeof body?.error === "string" ? body.error : "Registration failed")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Passkey registration failed"
      setError(msg)
      setStep("error")
    } finally {
      setLoading(false)
    }
  }, [router, addToast, user])

  const handleContinue = () => {
    router.replace("/")
  }

  return (
    <AuthLayout title="Setup Passkey">
      <div className="space-y-6">
        {step === "intro" && (
          <>
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-aurora-violet/20">
                <ScanFace className="h-8 w-8 text-aurora-violet" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  Biometric Authentication
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Set up a passkey to sign in instantly using your device&apos;s biometric (Face ID, Touch ID, or fingerprint).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <CircleCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">No passwords to remember</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Your device securely stores your credentials</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CircleCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Phishing-resistant</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Passkeys can&apos;t be stolen or reused</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CircleCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Cross-device sync</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Use your passkey on any signed-in device</p>
                </div>
              </div>
            </div>

            <Button
              variant="premium"
              size="lg"
              className="w-full"
              onClick={handleRegisterPasskey}
              isLoading={loading}
              leftIcon={<Shield className="h-4 w-4" />}
            >
              Register Passkey
            </Button>

            <button
              type="button"
              onClick={() => router.back()}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </>
        )}

        {step === "registering" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <LoaderCircle className="h-12 w-12 animate-spin text-aurora-violet" />
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                Registering Passkey...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Follow your device&apos;s prompts to complete registration
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CircleCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Passkey Registered!
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                You can now sign in instantly using your device&apos;s biometric authentication.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleContinue}
            >
              Continue to Dashboard
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <CircleAlert className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Registration Failed
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {error || "Something went wrong. Please try again."}
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setStep("intro")
                  setError("")
                }}
              >
                Try Again
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="flex-1"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
