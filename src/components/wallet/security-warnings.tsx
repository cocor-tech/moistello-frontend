"use client"

import { TriangleAlert, ShieldAlert, Info, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/cn"

interface WarningProps {
  type: "danger" | "warning" | "info"
  title: string
  message: string
  action?: { label: string; onClick: () => void }
  className?: string
}

const STYLES = {
  danger: {
    border: "border-red-500/25",
    bg: "bg-red-500/8",
    icon: "text-red-400",
    title: "text-red-400",
    text: "text-red-300/80",
  },
  warning: {
    border: "border-amber-500/25",
    bg: "bg-amber-500/8",
    icon: "text-amber-400",
    title: "text-amber-400",
    text: "text-amber-300/80",
  },
  info: {
    border: "border-aurora-violet/25",
    bg: "bg-aurora-violet/8",
    icon: "text-aurora-violet",
    title: "text-aurora-violet",
    text: "text-muted-foreground",
  },
}

export function SecurityWarning({ type, title, message, action, className }: WarningProps) {
  const s = STYLES[type]
  const Icon = type === "danger" ? ShieldAlert : type === "info" ? Info : TriangleAlert

  return (
    <div className={cn("border rounded-xl p-4 space-y-2", s.border, s.bg, className)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", s.icon)} />
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", s.title)}>{title}</p>
          <p className={cn("text-xs mt-1 leading-relaxed", s.text)}>{message}</p>
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={cn("inline-flex items-center gap-1 text-xs font-medium hover:underline", s.icon)}
        >
          {action.label} <ArrowUpRight className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
