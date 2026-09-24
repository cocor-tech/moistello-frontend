"use client"

import { logger } from "@/lib/logger"
import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react"
import { cn } from "@/lib/cn"
import { Loader2, Check, X, ShieldAlert } from "lucide-react"

const MAX_RETRIES = 3

interface HCaptchaCaptchaProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (error: string) => void
  onFocusNext?: () => void
  className?: string
}

export interface HCaptchaCaptchaHandle {
  reset: () => void
}

type CaptchaState = "unloaded" | "loading" | "ready" | "verifying" | "verified" | "expired" | "error" | "init_failed"

interface HCaptchaAPI {
  render: (container: string | HTMLElement, options: Record<string, unknown>) => string
  execute: (widgetId: string) => Promise<void>
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
  getResponse: (widgetId: string) => string
}

declare global {
  interface Window {
    hcaptcha?: HCaptchaAPI
    onCaptchaReady?: () => void
  }
}

function getSiteKey(): string {
  try {
    return process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ""
  } catch {
    return ""
  }
}

const SCRIPT_ID = "hcaptcha-sdk"

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID)) {
      if (window.hcaptcha) {
        resolve()
        return
      }
      window.onCaptchaReady = resolve
      return
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load hCaptcha script"))
    document.head.appendChild(script)
  })
}

export const HCaptchaCaptcha = forwardRef<HCaptchaCaptchaHandle, HCaptchaCaptchaProps>(
  function HCaptchaCaptcha({ onVerify, onExpire, onError, onFocusNext, className }, ref) {
    const invisibleContainerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const retryCountRef = useRef(0)
    const [state, setState] = useState<CaptchaState>("unloaded")
    const [retryKey, setRetryKey] = useState(0)
    const siteKey = getSiteKey()

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.hcaptcha) {
          window.hcaptcha.reset(widgetIdRef.current)
        }
        setState("ready")
      },
    }), [])

    useEffect(() => {
      if (!siteKey) {
        setState("error")
        return
      }

      let mounted = true

      async function init() {
        try {
          setState("loading")
          await loadScript()

          if (!mounted || !window.hcaptcha || !invisibleContainerRef.current) return

          if (widgetIdRef.current) {
            try { window.hcaptcha.remove(widgetIdRef.current) } catch (e) { logger.warn("[hcaptcha] Failed to remove widget:", e) }
            widgetIdRef.current = null
          }

          const widgetId = window.hcaptcha.render(invisibleContainerRef.current, {
            sitekey: siteKey,
            size: "invisible",
            callback: (token: string) => {
              if (!mounted) return
              setState("verified")
              onVerify(token)
              onFocusNext?.()
            },
            "expired-callback": () => {
              if (!mounted) return
              setState("expired")
              onExpire?.()
            },
            "error-callback": (error: string) => {
              if (!mounted) return
              setState("error")
              onError?.(error)
            },
          })

          widgetIdRef.current = widgetId
          retryCountRef.current = 0
          setState("ready")
        } catch {
          if (mounted) {
            retryCountRef.current++
            if (retryCountRef.current >= MAX_RETRIES) {
              setState("init_failed")
            } else {
              setState("error")
            }
            onError?.("Failed to load hCaptcha")
          }
        }
      }

      init()

      return () => {
        mounted = false
        if (widgetIdRef.current && window.hcaptcha) {
          try {
            window.hcaptcha.remove(widgetIdRef.current)
          } catch (e) {
            logger.warn("[hcaptcha] Cleanup failed:", e)
          }
          widgetIdRef.current = null
        }
      }
    }, [siteKey, onVerify, onExpire, onError, onFocusNext, retryKey])

    const handleClick = useCallback(async () => {
      if (!widgetIdRef.current || !window.hcaptcha) return
      if (state !== "ready") return
      setState("verifying")
      try {
        await window.hcaptcha.execute(widgetIdRef.current)
      } catch {
        setState("error")
        onError?.("hCaptcha challenge failed")
      }
    }, [state, onError])

    const handleRetry = useCallback(() => {
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current)
        } catch (e) {
          logger.warn("[hcaptcha] Failed to remove widget on retry:", e)
        }
        widgetIdRef.current = null
      }
      setState("unloaded")
      setRetryKey((k) => k + 1)
    }, [])

    if (!siteKey) {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-background/30 px-4 py-3",
            className
          )}
        >
          <p className="text-xs text-muted-foreground">CAPTCHA not configured</p>
        </div>
      )
    }

    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="flex items-center gap-3">
          {state === "unloaded" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading verification...
            </div>
          )}

          {state === "loading" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading verification...
            </div>
          )}

          {state === "ready" && (
            <button
              type="button"
              onClick={handleClick}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-background/50 px-3 py-2 text-xs text-muted-foreground hover:border-aurora-violet/40 hover:text-foreground transition-all"
              aria-label="Verify you are human"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded border border-white/30 bg-transparent" aria-hidden="true" />
              Verify you are human
            </button>
          )}

          {state === "verifying" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-aurora-violet" aria-hidden="true" />
              Verifying...
            </div>
          )}

          {state === "verified" && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500/20">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              Verified
            </div>
          )}

          {state === "expired" && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Verification expired
              <button
                type="button"
                onClick={() => {
                  if (widgetIdRef.current && window.hcaptcha) {
                    window.hcaptcha.reset(widgetIdRef.current)
                  }
                  setState("ready")
                }}
                className="ml-1 text-aurora-cyan hover:underline"
                ref={(el) => el?.focus()}
              >
                Retry
              </button>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-center gap-2 text-xs text-red-400" role="alert">
              <X className="h-4 w-4" aria-hidden="true" />
              Verification unavailable
              <button
                type="button"
                onClick={handleRetry}
                className="ml-1 text-aurora-cyan hover:underline"
                autoFocus
              >
                Retry
              </button>
            </div>
          )}

          {state === "init_failed" && (
            <div className="flex items-center gap-2 text-xs text-red-400" role="alert">
              <X className="h-4 w-4" aria-hidden="true" />
              Unable to load captcha. Disable ad blocker or try a different browser.
              <button
                type="button"
                onClick={handleRetry}
                className="ml-1 text-aurora-cyan hover:underline"
                autoFocus
              >
                Try Again
              </button>
            </div>
          )}

          <div ref={invisibleContainerRef} className="hidden" aria-hidden="true" />
        </div>
      </div>
    )
  }
)
