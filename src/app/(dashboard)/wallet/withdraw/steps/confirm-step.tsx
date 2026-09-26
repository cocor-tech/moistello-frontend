"use client"

import { Shield, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NIGERIAN_BANKS } from "../banks"
import type { WithdrawQuote } from "../types"

interface Props {
  quote: WithdrawQuote
  amountUsdc: string
  asset: string
  accountNumber: string
  accountName: string
  selectedBank: string
  loading: boolean
  errMsg: string
  onConfirm: () => void
  onBack: () => void
}

export function ConfirmStep({
  quote, amountUsdc, asset, accountNumber, accountName, selectedBank,
  loading, errMsg, onConfirm, onBack,
}: Props) {
  const bankName = NIGERIAN_BANKS.find((b) => b.code === selectedBank)?.name ?? ""

  return (
    <div className="space-y-5">
      {/* Shield warning */}
      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-400/20 rounded-xl px-5 py-4">
        <Shield className="h-5 w-5 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300">
          Review the details below. Withdrawals are processed by Yellow Card and
          sent to your bank account within minutes.
        </p>
      </div>

      {/* Summary */}
      <div className="border border-white/10 rounded-xl divide-y divide-dotted divide-white/[0.06]">
        <div className="flex justify-between px-5 py-4">
          <span className="text-sm text-muted-foreground">Sending</span>
          <span className="text-sm font-semibold text-foreground">
            {parseFloat(amountUsdc).toFixed(2)} {asset}
          </span>
        </div>
        <div className="flex justify-between px-5 py-4">
          <span className="text-sm text-muted-foreground">You receive</span>
          <span className="text-sm font-semibold text-emerald-400">
            ₦{quote.estimatedNgn.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between px-5 py-4">
          <span className="text-sm text-muted-foreground">Rate</span>
          <span className="text-sm text-foreground">
            1 {asset} ≈ ₦{(quote.estimatedNgn / parseFloat(amountUsdc)).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between px-5 py-4">
          <span className="text-sm text-muted-foreground">Spread</span>
          <span className="text-sm text-foreground">{quote.spread}%</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground mb-1">Destination Bank</p>
          <p className="text-sm font-medium text-foreground">{bankName}</p>
          <p className="text-sm text-foreground">{accountNumber}</p>
          <p className="text-sm text-muted-foreground">{accountName}</p>
        </div>
      </div>

      {errMsg && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {errMsg}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>
          Edit
        </Button>
        <Button variant="primary" size="lg" className="flex-1" onClick={onConfirm} isLoading={loading}>
          Confirm & Request OTP
        </Button>
      </div>
    </div>
  )
}
