"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, LogIn, Shield, Lock, ArrowLeft, Wallet } from "lucide-react"
import { post } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WalletSelector } from "@/components/wallet/wallet-selector"

export default function LoginPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (useAuthStore.getState().isAuthenticated) {
      router.replace("/")
    }
  }, [router])

  const [method, setMethod] = useState<"password" | "otp" | "passkey" | "wallet">("wallet")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handlePasswordLogin = useCallback(async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setError("")
    try {
      const res: any = await post("/auth/login", { email: email.trim(), password })
      const body = res?.data ?? res

      if (body?.needsVerification) {
        setMethod("otp")
        setCooldown(60)
        addToast({ type: "info", title: "Verify your email", description: "Code sent to your email." })
        return
      }

      if (body?.token) {
        // Awaited so the session cookie exists before the middleware sees the
        // navigation below and bounces us back to /login.
        await useAuthStore.getState().setTokens(body.token, body.refreshToken ?? "", body.user)
        addToast({ type: "success", title: "Welcome back" })
        router.replace("/")
      } else {
        setError("Invalid response")
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed")
    } finally {
      setLoading(false)
    }
  }, [email, password, router, addToast])

  const handlePasskeyLogin = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const adapter = (await import("@/lib/wallet/registry")).getWalletRegistry().getAdapter("passkey")
      if (!adapter) { setError("Passkey not available"); return }

      adapter.reset?.()
      const result = await adapter.connect()
      // After connect, we need to verify with the server
      const { credentialId } = result as any
      if (!credentialId) { setError("No credential"); return }

      const nonceRes: any = await post("/auth/passkey/nonce", { credentialId })
      const nonceBody = nonceRes?.data ?? nonceRes
      if (!nonceBody?.nonce) { setError("Failed to get nonce"); return }

      // Sign the nonce (simplified — in production the passkey adapter handles this)
      const { signature } = await adapter.signMessage?.(nonceBody.nonce) || {}
      if (!signature) { setError("Failed to sign"); return }

      const verifyRes: any = await post("/auth/passkey/verify", { credentialId, signature })
      const verifyBody = verifyRes?.data ?? verifyRes
      if (verifyBody?.token) {
        await useAuthStore.getState().setTokens(verifyBody.token, verifyBody.refreshToken ?? "", verifyBody.user)
        addToast({ type: "success", title: "Welcome back" })
        router.replace("/")
      }
    } catch (err: any) {
      setError(err?.message || "Passkey login failed")
    } finally {
      setLoading(false)
    }
  }, [router, addToast])

  return (
    <AuthLayout title="Sign In">
      <div className="space-y-5">
        {method === "otp" ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setMethod("password")}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            </div>
            <p className="text-sm text-muted-foreground -mt-2 mb-2">
              Code sent to <strong className="text-foreground">{email}</strong>
            </p>
            <Input label="6-digit verification code" placeholder="000000" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
              className="text-center text-2xl tracking-[0.5em] font-mono" error={error} />
            <Button variant="primary" size="lg" className="w-full" onClick={handlePasswordLogin}
              isLoading={loading} disabled={code.length !== 6} leftIcon={<LogIn className="h-4 w-4" />}>
              Verify & Sign In
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setMethod("wallet")}
                className={`flex-1 rounded-xl py-2 text-sm font-heading font-medium transition-all ${method === "wallet" ? "gradient-bg-extended text-white" : "glass text-muted-foreground"}`}>
                Wallet
              </button>
              <button type="button" onClick={() => setMethod("password")}
                className={`flex-1 rounded-xl py-2 text-sm font-heading font-medium transition-all ${method === "password" ? "gradient-bg-extended text-white" : "glass text-muted-foreground"}`}>
                Password
              </button>
              <button type="button" onClick={() => setMethod("passkey")}
                className={`flex-1 rounded-xl py-2 text-sm font-heading font-medium transition-all ${method === "passkey" ? "gradient-bg-extended text-white" : "glass text-muted-foreground"}`}>
                Passkey
              </button>
            </div>

            {method === "wallet" ? (
              <WalletSelector variant="overlay" />
            ) : method === "password" ? (
              <>
                <Input label="Email" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="h-4 w-4" />}
                  error={error} />
                <Input label="Password" type="password" placeholder="Enter your password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                  leftIcon={<Lock className="h-4 w-4" />} />
                <Button variant="primary" size="lg" className="w-full" onClick={handlePasswordLogin}
                  isLoading={loading} disabled={!email.trim() || !password}
                  leftIcon={<LogIn className="h-4 w-4" />}>
                  Sign In
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                  <Shield className="h-12 w-12 text-aurora-violet" />
                  <p className="text-sm text-muted-foreground">
                    Use your device&apos;s biometric to sign in instantly.
                  </p>
                </div>
                <Button variant="premium" size="lg" className="w-full" onClick={handlePasskeyLogin}
                  isLoading={loading}>
                  Sign in with Passkey
                </Button>
              </>
            )}

            <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="gradient-text font-semibold hover:underline">Create one</Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
