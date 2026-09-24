"use client"

import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { WalletOption } from "../types"

interface Props {
  wallets: WalletOption[]
  selectedWallet: string
  onSelect: (id: string, asset: string) => void
  onNext: () => void
}

export function WalletStep({ wallets, selectedWallet, onSelect, onNext }: Props) {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-xl border border-white/10">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-aurora-violet/8 blur-2xl pointer-events-none" />
        <div className="relative z-10 p-6 space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Select Source
          </p>
          {wallets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2" role="group" aria-label="Source wallet">
              {wallets.map((w) => (
                <button
                  type="button"
                  key={w.id}
                  aria-pressed={selectedWallet === w.id}
                  onClick={() => onSelect(w.id, w.asset)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                    selectedWallet === w.id
                      ? "bg-aurora-violet/10 border-aurora-violet/30"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl text-lg",
                      w.asset === "USDC" ? "bg-emerald-500/15" : "bg-aurora-violet/15",
                    )}>
                      {w.asset === "USDC" ? "💵" : "✨"}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{w.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {w.balance.toFixed(4)} {w.asset}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                    selectedWallet === w.id
                      ? "border-aurora-violet bg-aurora-violet"
                      : "border-white/20",
                  )}>
                    {selectedWallet === w.id && <Check className="h-3 w-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onNext}
        disabled={!selectedWallet}
      >
        Continue
      </Button>
    </div>
  )
}
