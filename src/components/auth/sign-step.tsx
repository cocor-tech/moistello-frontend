"use client"

import { logger } from "@/lib/logger"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, CheckCircle, Clock, FileSignature, Loader2 } from "lucide-react"
import { ConnectedBadge } from "./connected-badge"
import { ErrorDisplay } from "./error-display"
import type { AuthErrorCode, AuthFlowStatus } from "@/stores/auth-flow-store"
import { useTranslate } from "@/lib/locale/context"

interface ConnectionInfo {
  walletId: string | null
  address: string | null
}

interface ProfileInfo {
  displayName: string
  countryCode: string
  language: string
}

interface RateLimitState {
  remainingAttempts: number
  cooldownUntil: number | null
  lastAttemptAt: number | null
}

interface SignStepProps {
  mode: "login" | "register"
  connection: ConnectionInfo
  profile: ProfileInfo
  auth: { nonce: string | null; signature: string | null; nonceTimestamp: number | null }
  status: AuthFlowStatus
  error: { code: AuthErrorCode | null; message: string | null } | null
  rateLimit?: RateLimitState
  onSign: () => Promise<void>
  onBack: () => void
}

const FIVE_MINUTES = 5 * 60 * 1000

export function SignStep({
  mode,
  connection,
  profile,
  auth,
  status,
  error,
  rateLimit,
  onSign,
  onBack,
}: SignStepProps) {
  const { t, locale } = useTranslate()
  const [isSigning, setIsSigning] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isSigned = status.status === "signed"
  const isAuthenticated = status.status === "authenticated"
  const isError = status.status === "error"

  useEffect(() => {
    if (!rateLimit?.cooldownUntil || rateLimit.cooldownUntil <= Date.now()) {
      setCooldownLeft(0)
      return
    }

    const cooldownUntil = rateLimit.cooldownUntil

    function update() {
      const remaining = Math.max(0, Math.floor((cooldownUntil - Date.now()) / 1000))
      setCooldownLeft(remaining)
      if (remaining <= 0 && cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
    }

    update()
    cooldownTimerRef.current = setInterval(update, 1000)
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [rateLimit?.cooldownUntil])

  const isOnCooldown = cooldownLeft > 0

  const isNonceStale = useCallback(() => {
    if (!auth.nonceTimestamp) return true
    return Date.now() - auth.nonceTimestamp > FIVE_MINUTES
  }, [auth.nonceTimestamp])

  const countryLabel = profile.countryCode
    ? (new Intl.DisplayNames([locale || "en"], { type: "region" }).of(profile.countryCode) ??
      profile.countryCode)
    : ""

  useEffect(() => {
    if (isSigned && !isNonceStale()) {
      setIsSigning(false)
    }
  }, [isSigned, isNonceStale])

  const handleSign = useCallback(async () => {
    setIsSigning(true)
    try {
      await onSign()
    } catch (e) {
      logger.error("[sign-step] Sign failed:", e)
      setIsSigning(false)
    }
  }, [onSign])

  const handleRetry = useCallback(async () => {
    setIsSigning(true)
    try {
      await onSign()
    } catch (e) {
      logger.error("[sign-step] Sign retry failed:", e)
      setIsSigning(false)
    }
  }, [onSign])

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 py-8" role="status" aria-live="polite">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle className="h-7 w-7 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {mode === "login" ? t("auth.sign.welcomeBack") : t("auth.sign.welcomeToMoistello")}
        </p>
        <p className="text-xs text-muted-foreground">{t("auth.sign.redirecting")}</p>
        <Loader2 className="h-5 w-5 animate-spin text-aurora-violet" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("auth.sign.back")}
      </button>

      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-aurora-violet/20">
            <FileSignature className="h-6 w-6 text-aurora-violet" />
          </div>
        </div>
        <p className="font-heading text-lg font-medium text-foreground">
          {mode === "login" ? t("auth.login.signInTitle") : t("auth.sign.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {mode === "login" ? t("auth.login.signInDescription") : t("auth.sign.description")}
        </p>
      </div>

      <div className="space-y-3">
        {connection.walletId && connection.address && (
          <ConnectedBadge
            walletName={connection.walletId}
            address={connection.address}
          />
        )}

        {mode === "register" && profile.displayName && (
          <div className="rounded-xl glass border border-white/10 px-4 py-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">{t("auth.sign.profile")}</p>
            <p className="text-sm font-medium text-foreground">{profile.displayName}</p>
            {countryLabel && (
              <p className="text-xs text-muted-foreground">{countryLabel}</p>
            )}
          </div>
        )}
      </div>

      {(error || isError) && (
        <ErrorDisplay
          code={error?.code ?? "internal_error"}
          message={error?.message ?? "An unexpected error occurred."}
          canRetry={
            error?.code === "connection_timeout" ||
            error?.code === "auth_server_error" ||
            error?.code === "internal_error" ||
            !error?.code
          }
          onRetry={handleRetry}
        />
      )}

      <div className="space-y-3">
        {isOnCooldown && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400" role="status">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{t("auth.sign.cooldown")}{Math.floor(cooldownLeft / 60)}:{String(cooldownLeft % 60).padStart(2, "0")}</span>
          </div>
        )}

        {rateLimit && rateLimit.remainingAttempts < 5 && rateLimit.remainingAttempts > 0 && !isOnCooldown && (
          <p className="text-center text-xs text-muted-foreground">
            {rateLimit.remainingAttempts} {t("auth.sign.attemptsRemaining")}
          </p>
        )}

        {!isSigned ? (
          <button
            type="button"
            onClick={handleSign}
            disabled={isSigning || isOnCooldown}
            className="w-full h-11 rounded-xl gradient-bg text-white text-sm font-heading font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isSigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status.status === "signing" ? t("auth.sign.signing") : t("auth.sign.preparing")}
              </>
            ) : isOnCooldown ? (
              `Wait ${cooldownLeft}s`
            ) : (
              mode === "login" ? "Sign In" : t("auth.sign.createAccount")
            )}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            {t("auth.sign.messageSigned")}
          </div>
        )}

        <p className="text-center text-2xs text-muted-foreground">
          {t("auth.sign.terms")}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-aurora-cyan hover:underline">
            {t("auth.sign.termsLink")}
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-aurora-cyan hover:underline">
            {t("auth.sign.privacyLink")}
          </a>
        </p>
      </div>
    </div>
  )
}
