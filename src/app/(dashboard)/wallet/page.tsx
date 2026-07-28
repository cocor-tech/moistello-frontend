"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpRight, ArrowDownRight, ArrowDownLeft, Wallet as WalletIcon, Settings, Clock, ArrowRight, ListOrdered, BookCopy, ExternalLink, QrCode, Copy, Check, Landmark, Banknote } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { CopyButton } from "@/components/shared/copy-button"
import { Button } from "@/components/ui/button"
import { WalletSettings } from "@/components/wallet/wallet-settings"
import { get } from "@/lib/api-client"
import { useTranslate } from "@/lib/locale/context"
import { formatAddress } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import { useMultiWallet } from "@/hooks/use-multi-wallet"
import { useUIStore } from "@/stores/ui-store"
import { copyToClipboard } from "@/lib/clipboard"

interface BalanceInfo {
  xlm: string
  usdc: string
}

interface TransactionItem {
  id: string
  type: "sent" | "received"
  amount: number
  description: string
  createdAt: string
  txnHash?: string
}

const STELLAR_EXPLORER_TX = "https://stellar.expert/explorer/testnet/tx"

export default function WalletPage() {
  const { t } = useTranslate()
  const { address, activeWalletId, wallets, refreshBalance } = useMultiWallet()
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showReceive, setShowReceive] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wallet, setWallet] = useState<{ publicKey: string } | null>(null)
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [balanceRes, contribRes, payoutRes] = await Promise.allSettled([
          get("/wallets/balance"),
          get("/contributions?limit=5"),
          get("/payouts?limit=5"),
        ])

        if (balanceRes.status === "fulfilled") {
          const bd = (balanceRes.value as Record<string, unknown>)?.data as Record<string, unknown> ?? balanceRes.value as Record<string, unknown>
          const b = (bd?.balance ?? {}) as BalanceInfo
          setBalance(b)
        }

        const all: TransactionItem[] = []

        if (contribRes.status === "fulfilled") {
          const cd = (contribRes.value as Record<string, unknown>)?.data as Record<string, unknown> ?? contribRes.value as Record<string, unknown>
          const list = (cd?.contributions ?? []) as { id: string; amount: number; createdAt: string; circleId: string; txnHash?: string }[]
          list.forEach((c) => {
            all.push({ id: "c-" + c.id, type: "sent", amount: c.amount, description: "Contribution", createdAt: c.createdAt, txnHash: c.txnHash })
          })
        }

        if (payoutRes.status === "fulfilled") {
          const pd = (payoutRes.value as Record<string, unknown>)?.data as Record<string, unknown> ?? payoutRes.value as Record<string, unknown>
          const list = (pd?.payouts ?? []) as { id: string; amount: number; createdAt: string; circleId: string; txnHash?: string }[]
          list.forEach((p) => {
            all.push({ id: "p-" + p.id, type: "received", amount: p.amount, description: "Payout", createdAt: p.createdAt, txnHash: p.txnHash })
          })
        }

        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setTransactions(all.slice(0, 10))
      } catch (e) {
        console.error("[wallet] Failed to load wallet data:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
    // Also fetch wallet info for receive modal
    get("/wallets").then((res) => {
      const d = (res as Record<string, unknown>)?.data as Record<string, unknown> ?? res as Record<string, unknown>
      const list = (d?.wallets ?? []) as { publicKey: string }[]
      if (list.length > 0) setWallet(list[0])
    }).catch(() => {})
  }, [])

  const walletId = address ?? ""
  const activeWallet = activeWalletId ? wallets[activeWalletId] : null

  const copyKey = async () => {
    if (!wallet) return
    const success = await copyToClipboard(wallet.publicKey)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast({ type: "info", title: "Address copied" })
    } else {
      addToast({ type: "error", title: "Failed to copy address" })
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Wallet" description="Manage your Stellar wallet." />

      {/* Receive modal */}
      {showReceive && wallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowReceive(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-[rgb(var(--background))] border border-white/15 p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-foreground">Receive</h3>
              <button onClick={() => setShowReceive(false)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <div className="inline-flex items-center justify-center w-40 h-40 bg-white rounded-xl mx-auto">
              <QrCode className="h-16 w-16 text-black/80" />
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <code className="text-sm font-mono text-foreground break-all">{wallet.publicKey}</code>
            </div>
            <Button variant="primary" size="md" onClick={copyKey} leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} className="w-full">
              {copied ? "Copied!" : "Copy Address"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Send only USDC or XLM to this address. Verify the network is Stellar.
            </p>
          </div>
        </div>
      )}

      {/* Wallet Identity — full-width accent bar style */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-aurora-violet to-aurora-indigo rounded-full" />
        <div className="pl-6 py-5">
          {loading && !activeWallet ? (
            <div className="space-y-2">
              <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-72 bg-white/10 rounded animate-pulse" />
            </div>
          ) : activeWallet ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <WalletIcon className="h-4 w-4 text-aurora-violet" />
                <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  {activeWallet.adapter.meta.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <CopyButton text={walletId} label={formatAddress(walletId)} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("auth.register.securityNote")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet found.</p>
          )}
        </div>
      </div>

      {/* Balance area — two tiles side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-aurora-violet/10 to-aurora-indigo/5 border border-aurora-violet/15 p-6">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-aurora-violet/5 blur-2xl pointer-events-none" />
          <p className="text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider mb-1">XLM</p>
          <p className="text-3xl font-bold font-heading text-foreground">
            {loading ? <span className="inline-block w-24 h-8 bg-white/10 rounded animate-pulse align-middle" /> : formatBalance(balance?.xlm)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Stellar Lumens</p>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-aurora-cyan/5 border border-emerald-500/15 p-6">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
          <p className="text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider mb-1">USDC</p>
          <p className="text-3xl font-bold font-heading text-foreground">
            {loading ? <span className="inline-block w-24 h-8 bg-white/10 rounded animate-pulse align-middle" /> : formatBalance(balance?.usdc)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">USD Coin</p>
        </div>
      </div>

      {/* Action buttons — inline pill style */}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" size="md" onClick={() => setShowReceive(true)} leftIcon={<ArrowDownRight className="h-4 w-4" />}>
          Receive
        </Button>
        <Link href="/wallet/deposit">
          <Button variant="outline" size="md" leftIcon={<ArrowDownLeft className="h-4 w-4" />}>
            Deposit
          </Button>
        </Link>
        <Link href="/wallet/withdraw">
          <Button variant="outline" size="md" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
            Withdraw
          </Button>
        </Link>
        <Link href="/wallet/settings">
          <Button variant="outline" size="md" leftIcon={<Settings className="h-4 w-4" />}>
            Settings
          </Button>
        </Link>
      </div>

      {/* Recent Transactions — timeline style */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-aurora-violet" />
            Recent Activity
          </h3>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <Link href="/contributions" className="hover:text-foreground transition-colors">Contributions</Link>
            <Link href="/payouts" className="hover:text-foreground transition-colors">Payouts</Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-white/10 animate-pulse" />
                <div className="flex-1 h-10 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
            <div className="space-y-0">
              {transactions.map((tx) => (
                <div key={tx.id} className="relative flex items-start gap-4 pb-5 pl-1">
                  <div className={cn(
                    "relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 shrink-0",
                    tx.type === "received"
                      ? "border-emerald-400 bg-emerald-500/20"
                      : "border-aurora-violet bg-aurora-violet/20",
                  )} />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-sm font-semibold font-heading whitespace-nowrap",
                        tx.type === "received" ? "text-emerald-400" : "text-muted-foreground",
                      )}>
                        {tx.type === "received" ? "+" : "-"}{formatAmount(tx.amount)} USDC
                      </span>
                      {tx.txnHash && (
                        <a
                          href={`${STELLAR_EXPLORER_TX}/${tx.txnHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-aurora-cyan transition-colors"
                          title="View on Stellar.Expert"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation links to sub-pages */}
      <div className="border-t border-white/[0.06] pt-6 space-y-2">
        <Link href="/wallet/deposit" className="flex items-center justify-between px-1 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <span className="flex items-center gap-3">
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            Deposit via Bank Transfer
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link href="/wallet/withdraw" className="flex items-center justify-between px-1 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors group border-t border-white/[0.04]">
          <span className="flex items-center gap-3">
            <ArrowUpRight className="h-4 w-4 text-amber-400" />
            Withdraw to Bank
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link href="/wallet/transactions" className="flex items-center justify-between px-1 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors group border-t border-white/[0.04]">
          <span className="flex items-center gap-3">
            <ListOrdered className="h-4 w-4" />
            Transactions
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link href="/wallet/addresses" className="flex items-center justify-between px-1 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors group border-t border-white/[0.04]">
          <span className="flex items-center gap-3">
            <BookCopy className="h-4 w-4" />
            Addresses
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Multi-Wallet Settings */}
      <div className="border-t border-white/[0.06] pt-6">
        <WalletSettings />
      </div>
    </div>
  )
}

function formatBalance(val?: string): string {
  if (!val) return "0.0000"
  const n = parseFloat(val)
  if (isNaN(n)) return "0.0000"
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

function formatAmount(val: number): string {
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}