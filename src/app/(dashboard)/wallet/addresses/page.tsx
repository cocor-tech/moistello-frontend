"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Check, Plus, Trash2, Wallet as WalletIcon, Star, ExternalLink, Send } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { get } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import { formatAddress } from "@/lib/formatters"
import { copyToClipboard } from "@/lib/clipboard"

interface StoredWallet {
  id: string
  publicKey: string
  walletType: string
  isPrimary: boolean
}

interface SavedAddress {
  id: string
  label: string
  publicKey: string
}

export default function AddressesPage() {
  const addToast = useUIStore((s) => s.addToast)
  const [wallets, setWallets] = useState<StoredWallet[]>([])
  const [loading, setLoading] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newKey, setNewKey] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    get("/wallets").then((res) => {
      const d = (res as Record<string, unknown>)?.data as Record<string, unknown> ?? res as Record<string, unknown>
      setWallets((d?.wallets ?? []) as StoredWallet[])
    }).catch((e) => { logger.warn("[addresses] Failed to load wallets:", e) }).finally(() => setLoading(false))

    try {
      const stored = JSON.parse(localStorage.getItem("saved_addresses") || "[]") as SavedAddress[]
      setSavedAddresses(stored)
    } catch (e) {
      logger.warn("[addresses] Failed to load saved addresses:", e)
    }
  }, [])

  const saveAddresses = (list: SavedAddress[]) => {
    setSavedAddresses(list)
    localStorage.setItem("saved_addresses", JSON.stringify(list))
  }

  const addAddress = () => {
    if (!newLabel.trim() || !newKey.trim()) return
    saveAddresses([...savedAddresses, { id: crypto.randomUUID?.() ?? String(Date.now()), label: newLabel.trim(), publicKey: newKey.trim() }])
    setNewLabel("")
    setNewKey("")
    setShowForm(false)
    addToast({ type: "success", title: "Added", description: "Address saved." })
  }

  const removeAddress = (id: string) => {
    saveAddresses(savedAddresses.filter((a) => a.id !== id))
    addToast({ type: "info", title: "Removed" })
  }

  const copyAddr = async (key: string) => {
    const success = await copyToClipboard(key)
    if (success) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
      addToast({ type: "info", title: "Copied" })
    } else {
      addToast({ type: "error", title: "Failed to copy address" })
    }
  }

  const autoWallet = wallets.find((w) => w.walletType === "auto" || w.walletType === "passkey")

  return (
    <div className="space-y-8">
      <PageHeader title="Addresses" description="Manage your Stellar addresses." />

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => <div key={n} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Primary wallet — accent bar */}
          {autoWallet && (
            <div className="relative">
              <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-gradient-to-b from-aurora-violet to-aurora-indigo rounded-full" />
              <div className="pl-6 py-1">
                <div className="flex items-center gap-2 mb-2">
                  <WalletIcon className="h-4 w-4 text-aurora-violet" />
                  <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Primary Wallet</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Star className="h-2.5 w-2.5" /> Auto
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-foreground bg-white/5 px-2 py-1 rounded">{formatAddress(autoWallet.publicKey)}</code>
                  <button type="button" onClick={() => copyAddr(autoWallet.publicKey)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Copy primary wallet public key">
                    {copiedKey === autoWallet.publicKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a href={`https://stellar.expert/explorer/testnet/account/${autoWallet.publicKey}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-aurora-cyan transition-colors" aria-label="Open primary wallet in Stellar Explorer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Saved addresses */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">Saved Addresses</h3>
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>Add Address</Button>
            </div>

            {savedAddresses.length === 0 && !showForm ? (
              <div className="border border-white/10 rounded-xl py-8 text-center">
                <p className="text-sm text-muted-foreground">No saved addresses.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Save external Stellar addresses for quick access.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedAddresses.map((addr) => (
                  <div key={addr.id} className="flex items-center justify-between border border-white/10 rounded-xl px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{addr.label}</p>
                      <code className="text-xs font-mono text-muted-foreground">{formatAddress(addr.publicKey)}</code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/wallet/withdraw?address=${encodeURIComponent(addr.publicKey)}&label=${encodeURIComponent(addr.label)}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors" aria-label={`Send funds to ${addr.label}`}>
                        <Send className="h-3 w-3" aria-hidden="true" /> Send
                      </Link>
                      <button type="button" onClick={() => copyAddr(addr.publicKey)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={`Copy ${addr.label} address`}>
                        {copiedKey === addr.publicKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={() => removeAddress(addr.id)} className="text-muted-foreground hover:text-red-400 transition-colors" aria-label={`Remove saved address ${addr.label}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showForm && (
              <div className="mt-4 border border-white/10 rounded-xl p-5 space-y-3">
                <h4 className="text-sm font-medium text-foreground">New Address</h4>
                <Input label="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. My Savings" />
                <Input label="Stellar Public Key" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="G..." />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={addAddress} disabled={!newLabel.trim() || !newKey.trim()}>Save</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Link href="/wallet" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Wallet
      </Link>
    </div>
  )
}
