"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Trash2, AlertTriangle, Copy, CheckCircle, RefreshCw, Edit3, X } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatAddress } from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { useMultiWallet } from "@/hooks/use-multi-wallet"
import { copyToClipboard } from "@/lib/clipboard"

export function WalletSettings() {
  const { wallets, detectedWallets, disconnect, refreshBalance, switchWallet, activeWalletId } = useMultiWallet()
  const [showDisconnectAll, setShowDisconnectAll] = useState(false)
  const [confirmDisconnectAll, setConfirmDisconnectAll] = useState(false)
  const [aliases, setAliases] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {}
    try { return JSON.parse(localStorage.getItem("moistello_wallet_aliases") || "{}") } catch { return {} }
  })
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const connectedWallets = Object.entries(wallets).filter(([, w]) => w.status === "connected")
  const otherWallets = Object.entries(wallets).filter(([, w]) => w.status !== "connected")

  const saveAlias = (walletId: string, alias: string) => {
    const updated = { ...aliases, [walletId]: alias }
    setAliases(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("moistello_wallet_aliases", JSON.stringify(updated))
    }
    setRenamingId(null)
  }

  const handleDisconnectAll = async () => {
    for (const [id] of connectedWallets) {
      await disconnect(id)
    }
    setShowDisconnectAll(false)
    setConfirmDisconnectAll(false)
  }

  const copyKey = async (key: string) => {
    const success = await copyToClipboard(key)
    if (success) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  const getWalletName = (id: string) => {
    if (aliases[id]) return aliases[id]
    return detectedWallets.find((w) => w.id === id)?.name || id
  }

  return (
    <div className="space-y-6">
      {/* Connected Wallets */}
      <div className="glass-premium rounded-2xl p-6 holo-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg gradient-text">Connected Wallets</h2>
          <span className="text-xs text-muted-foreground">{connectedWallets.length} connected</span>
        </div>

        {connectedWallets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No wallets connected</p>
        ) : (
          <div className="space-y-2">
            {connectedWallets.map(([id, w]) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  {/* Wallet info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        id === activeWalletId
                          ? "bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153/0.5)]"
                          : "bg-muted-foreground",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {renamingId === id ? (
                          <div className="flex items-center gap-1">
                            <input
                              aria-label="Wallet nickname"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-sm w-32"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveAlias(id, renameValue)
                                if (e.key === "Escape") setRenamingId(null)
                              }}
                            />
                            <button
                              type="button"
                              aria-label="Save wallet nickname"
                              onClick={() => saveAlias(id, renameValue)}
                              className="text-emerald-400"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" aria-label="Cancel editing wallet nickname" onClick={() => setRenamingId(null)} className="text-red-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-heading text-sm">{getWalletName(id)}</span>
                            <button
                              type="button"
                              aria-label="Edit wallet nickname"
                              onClick={() => {
                                setRenamingId(id)
                                setRenameValue(getWalletName(id))
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Copy public key for ${getWalletName(id)}`}
                        onClick={() => copyKey(w.publicKey)}
                        className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        {formatAddress(w.publicKey)}
                        {copiedKey === w.publicKey ? (
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label={`Refresh balance for ${getWalletName(id)}`}
                      onClick={() => refreshBalance(id)}
                      className="glass-whisper rounded-lg p-2 hover:text-foreground transition-colors"
                      title="Refresh balance"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    {id !== activeWalletId && (
                      <button
                        type="button"
                        onClick={() => switchWallet(id)}
                        className="glass-whisper rounded-lg px-3 py-1.5 text-xs hover:text-foreground transition-colors"
                      >
                        Switch
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Disconnect ${getWalletName(id)}`}
                      onClick={() => disconnect(id)}
                      className="glass-whisper rounded-lg p-2 hover:text-red-400 transition-colors"
                      title="Disconnect"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Balance row */}
                <div className="flex gap-4 mt-2 ml-[22px]">
                  <span className="text-[10px] text-muted-foreground">
                    XLM: <span className="text-foreground">{w.balance?.xlm || "—"}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    USDC: <span className="text-foreground">{w.balance?.usdc || "—"}</span>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Other Wallets (disconnected/reconnecting/error) */}
      {otherWallets.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="font-heading text-sm text-muted-foreground mb-3">Other Wallets</h3>
          <div className="space-y-2">
            {otherWallets.map(([id, w]) => (
              <div
                key={id}
                className="glass-whisper rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      w.status === "error"
                        ? "bg-red-400"
                        : w.status === "reconnecting"
                          ? "bg-amber-400"
                          : "bg-muted-foreground",
                    )}
                  />
                  <span className="text-sm">{getWalletName(id)}</span>
                  <span className="text-[10px] text-muted-foreground">{w.status}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => disconnect(id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="glass rounded-2xl p-6 border border-red-500/20">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading text-sm text-red-400">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Disconnect all wallets and clear session data. You will need to reconnect to use
              Moistello.
            </p>
          </div>
        </div>

        {!showDisconnectAll ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDisconnectAll(true)}
            className="rounded-lg"
          >
            Disconnect All Wallets
          </Button>
        ) : !confirmDisconnectAll ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-400">Are you sure? This cannot be undone.</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDisconnectAll(true)}
              className="rounded-lg"
            >
              Yes, Disconnect All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnectAll(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnectAll}
              className="rounded-lg"
            >
              Confirm Disconnect All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDisconnectAll(false)
                setConfirmDisconnectAll(false)
              }}
              className="rounded-lg"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
