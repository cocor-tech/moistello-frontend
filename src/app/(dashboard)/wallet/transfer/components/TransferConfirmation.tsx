"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CircleCheckBig,
  Clock,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
} from "lucide-react"
import { ButtonLink } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { getExplorerTxUrl } from "@/lib/explorer"
import { STELLAR_NETWORK } from "@/lib/constants"
import { formatAddress } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import { useTransferPoll, type TxStatus } from "../hooks/useTransferPoll"

interface TransferConfirmationProps {
  txnHash: string
  amount: string
  currency: "USDC" | "XLM"
  recipient: string
  networkFee: number
}

const STATUS_META: Record<
  TxStatus,
  { label: string; sublabel: string; iconClass: string; ringClass: string }
> = {
  pending: {
    label: "Confirming on Stellar…",
    sublabel: "Usually takes a few seconds. Stay on this page.",
    iconClass: "text-amber-400",
    ringClass: "bg-amber-400/10 border-amber-400/20",
  },
  finalized: {
    label: "Transfer Confirmed",
    sublabel: "Your funds have been delivered on-chain.",
    iconClass: "text-emerald-400",
    ringClass: "bg-emerald-500/10 border-emerald-500/20",
  },
  failed: {
    label: "Transaction Failed",
    sublabel: "The Stellar network rejected this transaction.",
    iconClass: "text-red-400",
    ringClass: "bg-red-500/10 border-red-500/20",
  },
  timeout: {
    label: "Confirmation Timed Out",
    sublabel: "The transaction may still complete. Check the explorer.",
    iconClass: "text-amber-400",
    ringClass: "bg-amber-400/10 border-amber-400/20",
  },
}

function StatusIcon({ status }: { status: TxStatus }) {
  const cls = "w-8 h-8"
  if (status === "finalized") return <CircleCheckBig className={cls} />
  if (status === "failed") return <XCircle className={cls} />
  return <Clock className={cn(cls, "animate-pulse")} />
}

export function TransferConfirmation({
  txnHash,
  amount,
  currency,
  recipient,
  networkFee,
}: TransferConfirmationProps) {
  const { status, attempts } = useTransferPoll(txnHash)
  const meta = STATUS_META[status]
  const explorerUrl = getExplorerTxUrl(txnHash, STELLAR_NETWORK)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(txnHash)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const networkLabel = STELLAR_NETWORK === "mainnet" ? "Mainnet" : "Testnet"

  return (
    <div
      data-testid="transfer-confirmation"
      className="space-y-0"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* ── Full-bleed status strip ── */}
      <div
        className={cn(
          "relative w-full border-y px-8 py-10 text-center transition-all duration-500",
          meta.ringClass,
        )}
      >
        {/* Network badge — top-right pill */}
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full border border-border/50 bg-card px-3 py-1 text-xs font-mono text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              STELLAR_NETWORK === "mainnet" ? "bg-emerald-400" : "bg-amber-400",
            )}
          />
          {networkLabel}
        </span>

        {/* Icon */}
        <div
          className={cn(
            "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2",
            meta.ringClass,
            meta.iconClass,
          )}
        >
          <StatusIcon status={status} />
        </div>

        {/* Giant amount — visual anchor */}
        <p
          className={cn(
            "font-heading text-5xl font-bold tracking-tight",
            status === "finalized" ? "text-emerald-400" : "text-foreground",
          )}
        >
          {amount}{" "}
          <span className="text-3xl text-muted-foreground">{currency}</span>
        </p>

        <p className="mt-2 text-lg font-semibold text-foreground">{meta.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{meta.sublabel}</p>

        {/* Pending dot-pulse progress indicator */}
        {status === "pending" && (
          <div
            className="mt-4 flex items-center justify-center gap-1"
            role="progressbar"
            aria-label={`Polling attempt ${attempts + 1} of 20`}
            aria-valuenow={attempts + 1}
            aria-valuemin={1}
            aria-valuemax={20}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full bg-amber-400 opacity-30 transition-opacity",
                  i === attempts % 5 && "animate-pulse-glow opacity-100",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Transaction detail rows ── */}
      <div className="divide-y divide-border/50 border-b border-border/50">
        {/* Destination */}
        <div className="flex items-center justify-between px-8 py-4">
          <span className="text-sm text-muted-foreground">Destination</span>
          <span className="font-mono text-sm text-foreground" title={recipient}>
            {formatAddress(recipient)}
          </span>
        </div>

        {/* Network fee */}
        <div className="flex items-center justify-between px-8 py-4">
          <span className="text-sm text-muted-foreground">Network Fee</span>
          <span className="text-sm text-foreground">
            {networkFee} {currency}
          </span>
        </div>

        {/* TX Hash with copy + explorer link */}
        <div className="flex items-start justify-between gap-4 px-8 py-4">
          <span className="shrink-0 text-sm text-muted-foreground">Tx Hash</span>
          <div className="flex min-w-0 items-center gap-2">
            <code className="truncate font-mono text-xs text-aurora-cyan">
              {formatAddress(txnHash)}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? "Transaction hash copied" : "Copy transaction hash"}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View transaction on Stellar Explorer"
              className="shrink-0 text-muted-foreground transition-colors hover:text-aurora-cyan"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col gap-3 px-8 pt-6">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-aurora-violet/40 hover:text-aurora-violet"
        >
          View on Stellar Explorer
          <ExternalLink className="h-4 w-4" />
        </a>

        <ButtonLink href="/wallet" variant="ghost" className="w-full">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to Wallet
        </ButtonLink>
      </div>

      {/* ── Deep-link to transaction detail page (once finalized) ── */}
      {status === "finalized" && (
        <div className="px-8 pb-6 pt-2 text-center">
          <Link
            href={`/wallet/transactions/${txnHash}`}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            View full transaction details →
          </Link>
        </div>
      )}
    </div>
  )
}
