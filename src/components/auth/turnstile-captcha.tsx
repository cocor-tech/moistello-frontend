"use client"

import { logger } from "@/lib/logger"
import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/cn"
import { Loader2, Check, X } from "lucide-react"

const MAX_RETRIES = 3

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void
  onError?: () => void
  className?: string
}

type CaptchaState = "loading" | "verified" | "error"

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

function getSiteKey(): string {
  try {
    return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
  } catch {
    return ""
  }
}

const SCRIPT_ID = "cf-turnstile-sdk"

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(SCRIPT_ID)) {
      if (window.turnstile) { resolve(); return }
      const check = setInterval(() => {
        if (window.turnstile) { clearInterval(check); resolve() }
      }, 100)
      return
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

export function TurnstileCaptcha({ onVerify, onError, className }: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const retryCountRef = useRef(0)
  const [state, setState] = useState<CaptchaState>("loading")
  const [retryKey, setRetryKey] = useState(0)
  const siteKey = getSiteKey()

  // Store callbacks in refs to prevent re-render cycles
  const onVerifyRef = useRef(onVerify)
  onVerifyRef.current = onVerify
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Init: load script, render managed Turnstile widget
  useEffect(() => {
    if (!siteKey) { setState("error"); return }

    let cancelled = false

    async function init() {
      try {
        setState("loading")
        await loadScript()

        if (cancelled || !window.turnstile || !containerRef.current) return

        if (widgetIdRef.current) {
          try { window.turnstile.remove(widgetIdRef.current) } catch (e) { logger.warn("[turnstile] Failed to remove widget:", e) }
          widgetIdRef.current = null
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (cancelled) return
            setState("verified")
            onVerifyRef.current(token)
          },
          "expired-callback": () => {
            if (cancelled) return
            setState("error")
            onErrorRef.current?.()
          },
          "error-callback": () => {
            if (cancelled) return
            setState("error")
            onErrorRef.current?.()
          },
        })

        retryCountRef.current = 0
      } catch {
        if (cancelled) return
        retryCountRef.current++
        if (retryCountRef.current >= MAX_RETRIES) {
          setState("error")
        } else {
          setRetryKey((k) => k + 1)
        }
        onErrorRef.current?.()
      }
    }

    init()

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch (e) { logger.warn("[turnstile] Cleanup failed:", e) }
        widgetIdRef.current = null
      }
    }
  }, [siteKey, retryKey])

  const handleRetry = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.remove(widgetIdRef.current) } catch (e) { logger.warn("[turnstile] Failed to remove widget on retry:", e) }
      widgetIdRef.current = null
    }
    setState("loading")
    setRetryKey((k) => k + 1)
  }, [])

  if (!siteKey) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl border border-dashed border-white/10 px-4 py-3", className)}>
        <p className="text-xs text-muted-foreground">CAPTCHA not configured</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {state === "loading" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading verification...
        </div>
      )}

      <div ref={containerRef} style={{ minHeight: 65 }} />

      {state === "verified" && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500/20">
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
          Verified
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
    </div>
  )
}
