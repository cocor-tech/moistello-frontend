"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Check, Trash2, Edit3, X, CheckCircle, Wallet as WalletIcon, Shield, Clock } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { get, del, patch } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { useUIStore } from "@/stores/ui-store"
import { formatAddress } from "@/lib/formatters"
import { copyToClipboard } from "@/lib/clipboard"

interface StoredWallet {
  id: string
  publicKey: string
  walletType: string
  createdAt: string
}

export default function WalletSettingsPage() {
  const { user } = useAuth()
  const addToast = useUIStore((s) => s.addToast)
  const [wallet, setWallet] = useState<StoredWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState("")
  const [editingNickname, setEditingNickname] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingNickname, setSavingNickname] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    get("/wallets").then((res) => {
      const d = (res as Record<string, unknown>)?.data as Record<string, unknown> ?? res as Record<string, unknown>
      const list = (d?.wallets ?? []) as StoredWallet[]
      if (list.length > 0) {
        setWallet(list[0])
        const stored = localStorage.getItem("wallet_nickname") || ""
        setNickname(stored)
      }
    }).catch((e) => { logger.warn("[wallet-settings] Failed to load wallet:", e) }).finally(() => setLoading(false))
  }, [])

  const copyKey = async () => {
    if (!wallet) return
    const success = await copyToClipboard(wallet.publicKey)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast({ type: "info", title: "Copied", description: "Public key copied to clipboard." })
    } else {
      addToast({ type: "error", title: "Failed to copy address" })
    }
  }

  const saveNickname = async () => {
    if (!wallet) return
    setSavingNickname(true)
    try {
      await patch(`/wallets/${wallet.id}`, { nickname })
      localStorage.setItem("wallet_nickname", nickname)
      setEditingNickname(false)
      addToast({ type: "success", title: "Saved", description: "Wallet nickname updated." })
    } catch (e) {
      logger.error("[wallet-settings] Failed to update nickname:", e)
      addToast({ type: "error", title: "Failed", description: "Could not update nickname." })
    } finally {
      setSavingNickname(false)
    }
  }

  const handleDelete = async () => {
    if (!wallet || deleteConfirm !== (user?.displayName ?? "")) return
    setDeleting(true)
    try {
      await del(`/wallets/${wallet.id}`)
      addToast({ type: "success", title: "Deleted", description: "Wallet has been deleted." })
      setWallet(null)
    } catch (e) {
      logger.error("[wallet-settings] Failed to delete wallet:", e)
      addToast({ type: "error", title: "Failed", description: "Could not delete wallet." })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Wallet Settings" description="Manage your Stellar wallet." />

      {/* Wallet identity — accent bar style */}
      <div className="relative">
        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-gradient-to-b from-aurora-violet to-aurora-indigo rounded-full" />
        <div className="pl-6">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-64 bg-white/10 rounded animate-pulse" />
            </div>
          ) : wallet ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <WalletIcon className="h-4 w-4 text-aurora-violet" />
                <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Auto-Created Wallet</span>
              </div>
              <div className="flex items-center gap-2">
                {editingNickname ? (
                  <div className="flex items-center gap-2">
                    <Input label="Wallet nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname" className="w-40 h-8 text-sm" />
                    <button type="button" onClick={saveNickname} disabled={savingNickname} className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50" aria-label="Save wallet nickname">
                      {savingNickname ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => setEditingNickname(false)} disabled={savingNickname} className="text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Cancel editing wallet nickname"><X className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-foreground">{nickname || "My Wallet"}</span>
                    <button type="button" onClick={() => setEditingNickname(true)} className="text-muted-foreground hover:text-foreground" aria-label="Edit wallet nickname"><Edit3 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-foreground bg-white/5 px-2 py-1 rounded">{formatAddress(wallet.publicKey)}</code>
                <button type="button" onClick={copyKey} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={copied ? "Wallet public key copied" : "Copy wallet public key"}>
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Created {new Date(wallet.createdAt).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet found.</p>
          )}
        </div>
      </div>

      {/* Info cards — horizontal strip layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-xl p-5 space-y-2">
          <Shield className="h-5 w-5 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Passkey Secured</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">Your wallet is secured by your device biometrics. No private keys leave your device.</p>
        </div>
        <div className="border border-white/10 rounded-xl p-5 space-y-2">
          <WalletIcon className="h-5 w-5 text-emerald-400" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Auto-Funded</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">Your wallet was automatically funded with XLM. No manual setup needed.</p>
        </div>
      </div>

      {/* Delete wallet */}
      <div className="border border-red-500/20 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-400" />
          <h3 className="font-heading text-sm font-semibold text-red-400">Delete Wallet</h3>
        </div>
        <p className="text-xs text-muted-foreground">Permanently delete this wallet. Type your display name to confirm.</p>
        <div className="flex gap-2">
          <Input label="Type your display name to confirm deletion" placeholder={user?.displayName ?? "Type your name"} value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="flex-1" />
          <Button variant="destructive" size="md" onClick={handleDelete} isLoading={deleting} disabled={deleteConfirm !== (user?.displayName ?? "")}>
            Delete
          </Button>
        </div>
      </div>

      {/* Back link */}
      <Link href="/wallet" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Wallet
      </Link>
    </div>
  )
}
