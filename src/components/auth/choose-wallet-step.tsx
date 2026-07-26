"use client"

import { useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { Wallet, Loader2, Shield } from "lucide-react"
import { WalletGrid } from "./wallet-grid"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"

const AuthConnectionState = dynamic(
  () => import("./auth-connection-state").then((m) => m.AuthConnectionState),
  { ssr: false }
)

interface ChooseWalletStepProps {
  mode: "login" | "register"
  /** Optional passkey login handler (login mode only). */
  onPasskeyLogin?: () => void
}

export function ChooseWalletStep({ mode, onPasskeyLogin }: ChooseWalletStepProps) {
  /* Read only the slices this component needs from the store directly,
     eliminating 11+ props that were previously drilled from parent layers. */
  const detectedWallets = useMultiWalletStore((s) => s.detectedWallets)
  const isScanning = useMultiWalletStore((s) => s.isScanning)
  const connectingWalletId = useMultiWalletStore((s) => s.connectingWalletId)
  const wc2PairingUri = useMultiWalletStore((s) => s.wc2PairingUri)
  const wc2PairingState = useMultiWalletStore((s) => s.wc2PairingState)
  const wc2PairingError = useMultiWalletStore((s) => s.wc2PairingError)
  const wc2QrExpiresAt = useMultiWalletStore((s) => s.wc2QrExpiresAt)
  const resetWc2Pairing = useMultiWalletStore((s) => s.resetWc2Pairing)
  const connect = useMultiWalletStore((s) => s.connect)

  const isWc2Active = wc2PairingState !== "idle" && wc2PairingState !== "approved"

  const handleSelect = useCallback(
    (walletId: string) => {
      if (connectingWalletId) return
      connect(walletId as Parameters<typeof connect>[0])
    },
    [connectingWalletId, connect]
  )

  const hasPasskey = useMemo(() => {
    return detectedWallets.some((w) => w.id === "passkey" && w.status === "detected")
  }, [detectedWallets])

  if (isWc2Active) {
    return (
      <div className="space-y-4">
        <AuthConnectionState
          pairingUri={wc2PairingUri}
          pairingState={wc2PairingState as "idle" | "pairing" | "awaiting_approval" | "approved" | "rejected" | "timeout" | "error"}
          error={wc2PairingError}
          onRetry={resetWc2Pairing}
          onCancel={resetWc2Pairing}
          expiresAt={wc2QrExpiresAt}
        />
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="flex flex-col items-center gap-4 py-8" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-aurora-violet" />
        <p className="text-sm text-muted-foreground">Detecting wallets...</p>
      </div>
    )
  }

  const extensions = detectedWallets.filter((w) => w.category === "extension" || w.category === "mobile")
  const hardware = detectedWallets.filter((w) => w.category === "hardware")
  const passkeyWallet = detectedWallets.find((w) => w.id === "passkey")

  /* Map store wallet shape to the shape WalletGrid expects */
  const gridWallets = extensions.map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    icon: w.icon as unknown as React.ReactNode,
    description: w.description,
    installUrl: w.installUrl,
    status: w.status,
  }))

  return (
    <div className="space-y-4">
      {passkeyWallet && (
        <div className="space-y-3">
          {mode === "login" && hasPasskey && onPasskeyLogin && (
            <button
              type="button"
              onClick={onPasskeyLogin}
              className="w-full flex items-center gap-3 rounded-xl holo-border px-4 py-3 text-left transition-all hover:bg-white/[0.06]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aurora-violet/20 text-aurora-violet">
                <Shield className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Sign in with Passkey</p>
                  <span className="text-2xs rounded-full bg-emerald-500/20 px-1.5 py-0.5 font-medium text-emerald-400">
                    Detected
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-muted-foreground">{passkeyWallet.description}</p>
              </div>
            </button>
          )}

          {mode === "register" && (
            <button
              type="button"
              onClick={() => handleSelect("passkey")}
              disabled={!!connectingWalletId}
              className="w-full flex items-center gap-3 rounded-xl holo-border px-4 py-3 text-left transition-all hover:bg-white/[0.06] disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aurora-violet/20 text-aurora-violet">
                <Shield className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Passkey</p>
                  <span className="text-2xs rounded-full bg-aurora-violet/20 px-1.5 py-0.5 font-medium text-aurora-violet">
                    Recommended
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  {passkeyWallet?.description ?? "Fast, secure, no password needed"}
                </p>
              </div>
              {connectingWalletId === "passkey" && (
                <Loader2 className="h-4 w-4 animate-spin text-aurora-violet shrink-0" />
              )}
            </button>
          )}
        </div>
      )}

      {extensions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground text-center">
            Or connect with a wallet
          </p>
          <WalletGrid
            wallets={gridWallets}
            connectingWalletId={connectingWalletId}
            onSelect={handleSelect}
          />
        </div>
      )}

      {extensions.length === 0 && !passkeyWallet && !isScanning && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Wallet className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">
            No wallets detected. Install a Stellar wallet like{" "}
            <a
              href="https://freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-aurora-cyan hover:underline"
            >
              Freighter
            </a>
            {" "}or use WalletConnect.
          </p>
        </div>
      )}

      {hardware.length > 0 && (
        <div className="space-y-2">
          {hardware.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => handleSelect(w.id)}
              disabled={!!connectingWalletId}
              className="w-full flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-left transition-all hover:border-aurora-violet/40 hover:bg-white/[0.06] disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-premium-gold/20 text-premium-gold">
                {w.icon as unknown as React.ReactNode}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{w.name}</p>
                  <span className="text-2xs rounded-full bg-premium-gold/20 px-1.5 py-0.5 font-medium text-premium-gold">
                    Hardware
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-muted-foreground">{w.description}</p>
              </div>
              {connectingWalletId === w.id && (
                <Loader2 className="h-4 w-4 animate-spin text-aurora-violet shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
