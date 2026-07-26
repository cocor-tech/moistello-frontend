"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Mail, Shield, CheckCircle } from "lucide-react"
import { useAuthFlowStore } from "@/stores/auth-flow-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface VerifyEmailStepProps {
  onVerified: () => void
  onBack: () => void
}

export function VerifyEmailStep({ onVerified, onBack }: VerifyEmailStepProps) {
  // Individual selectors — each subscription is scoped to a single slice so this
  // component only re-renders when the specific field it uses actually changes.
  const status = useAuthFlowStore((s) => s.status)
  const emailVerification = useAuthFlowStore((s) => s.emailVerification)
  const sendVerificationCode = useAuthFlowStore((s) => s.sendVerificationCode)
  const verifyCode = useAuthFlowStore((s) => s.verifyCode)
  const resendCode = useAuthFlowStore((s) => s.resendCode)
  const clearEmailVerification = useAuthFlowStore((s) => s.clearEmailVerification)

  const [emailInput, setEmailInput] = useState(emailVerification.email || "")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [cooldown, setCooldown] = useState(0)

  const isSendingCode = status.status === "sending_code"
  const isCodeSent = status.status === "code_sent" || emailVerification.codeSent
  const isVerifying = status.status === "signing"
  const isVerified = emailVerification.codeVerified

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (isVerified) {
      const t = setTimeout(() => onVerified(), 600)
      return () => clearTimeout(t)
    }
  }, [isVerified, onVerified])

  useEffect(() => {
    if (status.status === "error") {
      setError(status.message)
    }
  }, [status])

  const handleSendCode = useCallback(async () => {
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) return
    setError("")
    try {
      await sendVerificationCode(emailInput.trim())
      setCooldown(60)
    } catch {
      // error surfaced via store status
    }
  }, [emailInput, sendVerificationCode])

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return
    setError("")
    try {
      await verifyCode(code)
    } catch {
      // error surfaced via store status
    }
  }, [code, verifyCode])

  const handleResend = useCallback(async () => {
    setError("")
    try {
      await resendCode()
      setCooldown(60)
    } catch {
      // error surfaced via store status
    }
  }, [resendCode])

  const handleBackToEmail = useCallback(() => {
    clearEmailVerification()
    setCode("")
    setError("")
  }, [clearEmailVerification])

  if (isVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle className="h-7 w-7 text-emerald-400" />
        </div>
        <p className="font-heading text-lg font-semibold text-foreground">Email verified!</p>
      </div>
    )
  }

  if (isCodeSent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToEmail}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Change email
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          We sent a code to{" "}
          <strong className="text-foreground">{emailVerification.email}</strong>
        </p>
        <Input
          label="6-digit verification code"
          placeholder="000000"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            setError("")
          }}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          className="text-center text-2xl tracking-[0.5em] font-mono"
          error={error}
        />
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleVerify}
          isLoading={isVerifying}
          disabled={code.length !== 6}
          leftIcon={<Shield className="h-4 w-4" />}
        >
          Verify Code
        </Button>
        <div className="text-center">
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={handleResend}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't receive it? Resend"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to wallet options
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
        <Mail className="h-10 w-10 text-aurora-violet" />
        <div>
          <p className="font-heading text-lg font-semibold text-foreground">Verify Your Email</p>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email to get a verification code.
          </p>
        </div>
      </div>
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={emailInput}
        onChange={(e) => {
          setEmailInput(e.target.value)
          setError("")
        }}
        onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
        leftIcon={<Mail className="h-4 w-4" />}
        error={error}
      />
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleSendCode}
        isLoading={isSendingCode}
        disabled={
          !emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)
        }
        leftIcon={<ArrowLeft className="h-4 w-4 rotate-180" />}
      >
        Send Code
      </Button>
    </div>
  )
}
