"use client"

import { CheckCircle, ExternalLink } from "lucide-react"
import { ButtonLink } from "@/components/ui/button"
import { NIGERIAN_BANKS } from "../banks"
import type { WithdrawQuote } from "../types"

interface Props {
  quote: WithdrawQuote
  amountUsdc: string
  asset: string
  accountNumber: string
  selectedBank: string
}

export function SuccessStep({ quote, amountUsdc, asset, accountNumber, selectedBank }: Props) {
  const bankName = NIGERIAN_BANKS.find((b) => b.code === selectedBank)?.name ?? ""

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-400/5 to-background border border-emerald-500/25 p-8 text-center space-y-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold gradient-text-extended">Withdrawal Complete</p>
            <p className="text-lg font-semibold text-foreground mt-2">
              ₦{quote.estimatedNgn.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              sent to {bankName} • {accountNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] rounded-xl divide-y divide-dotted divide-white/[0.06]">
        <div className="flex justify-between px-5 py-3.5 text-sm">
          <span className="text-muted-foreground">Amount sent</span>
          <span className="text-foreground">{parseFloat(amountUsdc).toFixed(2)} {asset}</span>
        </div>
        <div className="flex justify-between px-5 py-3.5 text-sm">
          <span className="text-muted-foreground">You received</span>
          <span className="text-emerald-400 font-medium">₦{quote.estimatedNgn.toLocaleString()}</span>
        </div>
        <div className="flex justify-between px-5 py-3.5 text-sm">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs text-foreground">{quote.withdrawId}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <ButtonLink href="/wallet" variant="primary" size="lg" className="flex-1 w-full">Back to Wallet</ButtonLink>
        <ButtonLink href="/wallet/transactions" variant="outline" size="lg" className="flex-1 w-full" leftIcon={<ExternalLink className="h-4 w-4" />}>
          View History
        </ButtonLink>
      </div>
    </div>
  )
}
