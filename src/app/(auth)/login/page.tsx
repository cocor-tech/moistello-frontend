"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthLayout } from "@/components/auth/auth-layout"
import { WalletSelector } from "@/components/wallet/wallet-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { post } from "@/lib/api-client"

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const addToast = useUIStore((s) => s.addToast)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await post<{ token?: string; user?: any }>("/auth/login", { email, password })
      if (res?.token) {
        login(res.token, res.user)
        addToast({ type: "success", title: "Welcome back!" })
        router.replace("/")
      } else {
        throw new Error("Invalid login response")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed"
      addToast({ type: "error", title: msg })
    } finally {
      setLoading(false)
    }
  }, [email, password, login, addToast, router])

  return (
    <AuthLayout title="Sign in to Moistello">
      <div className="space-y-6">
        <form onSubmit={handleEmailLogin} className="space-y-4" aria-label="Email login form">
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
            Sign In with Email
          </Button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/10" />
          <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">Or connect wallet</span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        <WalletSelector />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-aurora-violet">
            Register
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
