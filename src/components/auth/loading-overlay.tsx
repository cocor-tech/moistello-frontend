"use client"

import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/cn"

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message = "Loading...", className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl",
        "bg-background/80 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora-violet/30" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-aurora-violet/30 border-t-aurora-violet">
          <LoaderCircle className="h-6 w-6 animate-spin text-aurora-violet" />
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-foreground">{message}</p>
      <div className="mt-3 flex gap-1">
        <span className="h-1 w-1 animate-bounce rounded-full bg-aurora-violet/60 [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-aurora-violet/60 [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-aurora-violet/60 [animation-delay:300ms]" />
      </div>
    </div>
  )
}
