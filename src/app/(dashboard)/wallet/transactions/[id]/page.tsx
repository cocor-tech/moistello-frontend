"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Copy, Check, ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { get } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import { formatAddress } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import { copyToClipboard } from "@/lib/clipboard"

interface TxDetail {
  id: string
  type: "sent" | "received"
  amount: number
  description: string
  createdAt: string
  txnHash: string
  source: "contribution" | "payout"
}

export default function TransactionDetailPage() {
  const params = useParams()
  const txId = params.id as string
  const addToast = useUIStore((s) => s.addToast)
  const [tx, setTx] = useState<TxDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Try contribution first, then payout
        let found: TxDetail | null = null
        try {
          const cRes = await get(`/contributions/${txId}`)
          const d = (cRes as Record<string, unknown>)?.data as Record<string, unknown> ?? cRes as Record<string, unknown>
          const c = d?.contribution as Record<string, unknown> ?? d as Record<string, unknown>
          if (c?.id) {
            found = {
              id: String(c.id),
              type: "sent",
              amount: Number(c.amount ?? 0),
              description: "Contribution",
              createdAt: String(c.createdAt ?? ""),
              txnHash: String(c.txnHash ?? ""),
              source: "contribution",
            }
          }
        } catch (e) {
          logger.warn("[tx-detail] Contribution fetch failed, trying payout:", e)
        }

        try {
          const pRes = await get(`/payouts/${txId}`)
          const d = (pRes as Record<string, unknown>)?.data as Record<string, unknown> ?? pRes as Record<string, unknown>
          const p = d?.payout as Record<string, unknown> ?? d as Record<string, unknown>
          if (p?.id) {
            found = {
              id: String(p.id),
              type: "received",
              amount: Number(p.amount ?? 0),
              description: "Payout",
              createdAt: String(p.createdAt ?? ""),
              txnHash: String(p.txnHash ?? ""),
              source: "payout",
            }
          }
        } catch (e) {
          logger.warn("[tx-detail] Payout not found:", e)
        }

        setTx(found)
      } catch (e) {
        logger.error("[tx-detail] Failed to load transaction:", e)
      }
      setLoading(false)
    }
    load()
  }, [txId])

  const copyHash = async () => {
    if (!tx?.txnHash) return
    const success = await copyToClipboard(tx.txnHash)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast({ type: "info", title: "Copied" })
    } else {
      addToast({ type: "error", title: "Failed to copy transaction hash" })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transaction" />
        <div className="max-w-lg space-y-4">
          <Skeleton variant="card" className="h-48 rounded-xl" />
          <Skeleton variant="card" className="h-32 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transaction" />
        <EmptyState icon={<ArrowUpCircle className="h-6 w-6" />} title="Transaction not found" description="This transaction does not exist." />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/wallet/transactions" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to all transactions">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Transaction</h1>
          <p className="text-sm text-muted-foreground font-mono truncate">{formatAddress(tx.id)}</p>
        </div>
      </div>

      {/* Type badge + amount hero */}
      <div className={cn(
        "rounded-xl border p-8 text-center space-y-4",
        tx.type === "received" ? "border-emerald-500/20 bg-emerald-500/5" : "border-aurora-violet/20 bg-aurora-violet/5",
      )}>
        <div className={cn(
          "inline-flex h-14 w-14 items-center justify-center rounded-full",
          tx.type === "received" ? "bg-emerald-500/15 text-emerald-400" : "bg-aurora-violet/15 text-aurora-violet",
        )}>
          {tx.type === "received" ? <ArrowDownCircle className="h-7 w-7" /> : <ArrowUpCircle className="h-7 w-7" />}
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{tx.type === "received" ? "Received" : "Sent"}</p>
        <p className={cn("text-4xl font-bold font-heading", tx.type === "received" ? "text-emerald-400" : "text-foreground")}>
          {tx.type === "received" ? "+" : "-"}${tx.amount.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground">{tx.description}</p>
      </div>

      {/* Details */}
      <div className="border border-white/10 rounded-xl divide-y divide-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-muted-foreground">Date</span>
          <span className="text-sm text-foreground">{new Date(tx.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-muted-foreground">Type</span>
          <span className="text-sm text-foreground capitalize">{tx.source}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className={cn("text-sm font-semibold", tx.type === "received" ? "text-emerald-400" : "text-foreground")}>
            {tx.type === "received" ? "+" : "-"}${tx.amount.toFixed(2)} USDC
          </span>
        </div>
        {tx.txnHash && (
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-muted-foreground">Transaction Hash</span>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-aurora-cyan">{formatAddress(tx.txnHash)}</code>
              <button type="button" onClick={copyHash} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={copied ? "Transaction hash copied" : "Copy transaction hash"}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a href={`https://stellar.expert/explorer/testnet/tx/${tx.txnHash}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-aurora-cyan transition-colors" aria-label="Open transaction in Stellar Explorer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      <Link href="/wallet/transactions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> All Transactions
      </Link>
    </div>
  )
}
