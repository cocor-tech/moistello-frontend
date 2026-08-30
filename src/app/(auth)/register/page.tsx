"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { post } from "@/lib/api-client"

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const addToast = useUIStore((s) => s.addToast)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await post<{ token?: string; user?: any }>("/auth/register", { name, email, password })
      if (res?.token) {
        login(res.token, res.user)
        addToast({ type: "success", title: "Account created successfully!" })
        router.replace("/passkey-setup")
      } else {
        throw new Error("Registration failed")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed"
      addToast({ type: "error", title: msg })
    } finally {
      setLoading(false)
    }
  }, [name, email, password, login, addToast, router])

  return (
    <AuthLayout title="Create an Account">
      <div className="space-y-6">
        <form onSubmit={handleRegister} className="space-y-4" aria-label="Registration form">
          <Input
            id="name"
            name="name"
            type="text"
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            autoComplete="name"
            required
          />
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
            autoComplete="new-password"
            required
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
            Continue to Passkey Setup
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-aurora-violet hover:underline focus:outline-none focus:ring-2 focus:ring-aurora-violet">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
