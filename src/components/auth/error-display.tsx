"use client"

import { CircleAlert, RefreshCw } from "lucide-react"
import { cn } from "@/lib/cn"
import type { AuthErrorCode } from "@/stores/auth-flow-store"

interface ErrorDisplayProps {
  code: AuthErrorCode | null
  message: string | null
  canRetry?: boolean
  onRetry?: () => void
  className?: string
}

const errorLabels: Partial<Record<AuthErrorCode, string>> = {
  connection_timeout: "Connection Timeout",
  connection_rejected: "Connection Rejected",
  relay_down: "Relay Unavailable",
  network_mismatch: "Network Mismatch",
  auth_server_error: "Server Error",
  validation_error: "Invalid Input",
  internal_error: "Unexpected Error",
}

export function ErrorDisplay({
  code,
  message,
  canRetry = false,
  onRetry,
  className,
}: ErrorDisplayProps) {
  if (!code && !message) return null

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl glass border border-red-500/30 p-4",
        className
      )}
      role="alert"
    >
      <CircleAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-red-400">
          {code ? (errorLabels[code] ?? "Error") : "Error"}
        </p>
        {message && (
          <p className="text-xs text-muted-foreground">{message}</p>
        )}
      </div>

      {canRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium glass hover:bg-white/[0.06] transition-colors text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  )
}
