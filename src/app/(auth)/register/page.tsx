"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { registerSchema, zodResolver, type RegisterInput } from "@/lib/validation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import { post } from "@/lib/api-client"

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  })

  const onSubmit = useCallback(
    async (values: RegisterInput) => {
      setLoading(true)
      try {
        const res = await post<{ token?: string; user?: unknown }>("/auth/register", values)
        if (res?.token) {
          login(res.token, res.user)
          toast.success("Account created successfully!")
          router.replace("/passkey-setup")
        } else {
          throw new Error("Registration failed")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Registration failed"
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    },
    [login, toast, router],
  )

  return (
    <AuthLayout title="Create an Account">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Registration form">
          <Input
            id="name"
            type="text"
            label="Full Name"
            placeholder="Jane Doe"
            autoComplete="name"
            error={errors.name?.message}
            {...register("name")}
          />
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
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
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