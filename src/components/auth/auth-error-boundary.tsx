"use client"

import { CircleAlert, RefreshCw, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/cn"

interface AuthErrorBoundaryProps {
  error: {
    code: string | null
    message: string | null
  } | null
  onRetry?: () => void
  onBack?: () => void
  className?: string
}

export function AuthErrorBoundary({
  error,
  onRetry,
  onBack,
  className,
}: AuthErrorBoundaryProps) {
  if (!error?.code || !error?.message) return null

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl glass border border-red-500/30",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <CircleAlert className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-400 mb-1 capitalize">
          {error.code.replace(/_/g, " ")}
        </p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        {(onRetry || onBack) && (
          <div className="flex gap-2 mt-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg glass hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg glass hover:bg-white/[0.06] transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}