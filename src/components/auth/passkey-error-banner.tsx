"use client"

import { AlertTriangle, RefreshCw, WifiOff, ShieldAlert, Fingerprint, Clock } from "lucide-react"
import type { PasskeyErrorKind } from "@/lib/passkey/error-messages"
import { Button } from "@/components/ui/button"

interface PasskeyErrorBannerProps {
  title: string
  description: string
  kind: PasskeyErrorKind
  canRetry: boolean
  onRetry?: () => void
  onSwitchMethod?: () => void
}

const KIND_ICON: Record<PasskeyErrorKind, React.ElementType> = {
  cancelled: RefreshCw,
  unsupported_device: ShieldAlert,
  security_error: ShieldAlert,
  invalid_state: Fingerprint,
  not_readable: Fingerprint,
  constraint: ShieldAlert,
  network: WifiOff,
  timeout: Clock,
  unknown: AlertTriangle,
}

export function PasskeyErrorBanner({
  title,
  description,
  kind,
  canRetry,
  onRetry,
  onSwitchMethod,
}: PasskeyErrorBannerProps) {
  const Icon = KIND_ICON[kind] ?? AlertTriangle

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
          <Icon className="h-4 w-4 text-red-400" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-400">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {(canRetry || onSwitchMethod) && (
        <div className="flex flex-wrap items-center gap-2 pl-11">
          {canRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Try again
            </Button>
          )}
          {onSwitchMethod && (
            <button
              type="button"
              onClick={onSwitchMethod}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Use a different method
            </button>
          )}
        </div>
      )}
    </div>
  )
}
