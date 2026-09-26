"use client"

import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/cn"

interface WalletInfo {
  id: string
  name: string
  category: string
  icon: React.ReactNode
  description: string
  isRecommended?: boolean
  installUrl?: string
  status?: "detected" | "not_detected"
}

interface AuthWalletCardProps {
  wallet: WalletInfo
  state?: "idle" | "connecting" | "connected" | "error"
  isConnecting?: boolean
  onSelect?: () => void
  disabled?: boolean
}

export function AuthWalletCard({
  wallet,
  state = "idle",
  isConnecting = false,
  onSelect,
  disabled = false,
}: AuthWalletCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || isConnecting || wallet.status !== "detected"}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 glass rounded-2xl p-4 min-h-[100px] transition-all border",
        "hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-aurora-violet/50",
        wallet.status !== "detected" && "opacity-40 pointer-events-none border-white/10",
        wallet.status === "detected" && "border-white/10 hover:border-aurora-violet/40",
        wallet.isRecommended && "border-aurora-violet/20 hover:border-aurora-violet/40",
        state === "connecting" && "animate-pulse",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {state === "connecting" && (
        <div className="absolute inset-0 rounded-2xl bg-background/80 flex items-center justify-center z-10">
          <LoaderCircle className="h-5 w-5 animate-spin text-aurora-violet" />
        </div>
      )}

      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
          wallet.isRecommended
            ? "bg-aurora-violet/20 text-aurora-violet"
            : wallet.id === "walletconnect"
              ? "bg-aurora-violet/20 text-aurora-violet"
              : wallet.id === "ledger"
                ? "bg-premium-gold/20 text-premium-gold"
                : "bg-white/10 text-aurora-cyan"
        )}
      >
        {wallet.icon}
      </span>

      <span className="text-xs font-heading font-medium text-center leading-tight text-foreground">
        {wallet.name}
      </span>

      {wallet.description && (
        <span className="text-[10px] text-muted-foreground text-center leading-tight">
          {wallet.description}
        </span>
      )}

      {wallet.status !== "detected" && wallet.status && (
        <span className="text-[10px] text-muted-foreground">Not installed</span>
      )}

      {wallet.isRecommended && (
        <span className="absolute -top-2 -right-2 text-2xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
          Recommended
        </span>
      )}
    </button>
  )
}