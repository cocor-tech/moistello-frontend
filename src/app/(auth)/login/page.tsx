"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { loginSchema, zodResolver, type LoginInput } from "@/lib/validation"
import { useAuthStore } from "@/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import { post } from "@/lib/api-client"
import { AuthLayout } from "@/components/auth/auth-layout"
import { WalletSelector } from "@/components/wallet/wallet-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  })

  const onSubmit = useCallback(
    async (values: LoginInput) => {
      setLoading(true)
      try {
        const res = await post<{ token?: string; user?: any }>("/auth/login", values)
        if (res?.token) {
          login(res.token, res.user)
          toast.success("Welcome back!")
          router.replace("/")
        } else {
          throw new Error("Invalid login response")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Login failed"
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    },
    [login, toast, router],
  )

  return (
    <AuthLayout title="Sign in to Moistello">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Email login form">
          <Input
            id="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
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