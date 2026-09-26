"use client"

import { useState } from "react"
import { LoaderCircle, CircleAlert, QrCode, Shield, Usb, WifiOff, X } from "lucide-react"
import { cn } from "@/lib/cn"
import type { WalletId } from "@/lib/wallet/types"
import { WalletConnectQR } from "./walletconnect-qr"
import { WalletConnectDeepLink } from "./walletconnect-deeplink"

export interface WalletDescriptor {
  id: WalletId
  name: string
  status: "detected" | "not_detected"
  category?: string
  description?: string
}

const walletIcons: Record<string, string> = {
  walletconnect: "WC",
  freighter: "F",
  xbull: "X",
  rabet: "R",
  albedo: "A",
}

interface HardwareWalletItemProps {
  name: string
  status: "detected" | "not_detected"
  isHardwareAvailable: boolean
  onOpenLedgerPrompt: () => void
}

export function HardwareWalletItem({
  name,
  status,
  isHardwareAvailable,
  onOpenLedgerPrompt,
}: HardwareWalletItemProps) {
  const isDetected = isHardwareAvailable && status === "detected"

  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-aurora-violet/40 hover:bg-white/[0.06] transition-all">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-premium-gold/20 text-premium-gold">
        <Usb className="h-5 w-5" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-premium-gold/20 text-premium-gold font-medium">
            Hardware Wallet
          </span>
          {isDetected && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              Detected ✓
            </span>
          )}
        </div>
        <p className="text-2xs text-muted-foreground mt-0.5">
          {isHardwareAvailable
            ? "Maximum security — requires physical confirmation"
            : "Not supported in this browser. Try Chrome, Edge, or Brave."}
        </p>
      </div>

      {isHardwareAvailable ? (
        <button
          type="button"
          onClick={onOpenLedgerPrompt}
          className="text-xs text-aurora-violet font-medium shrink-0 hover:text-premium-gold transition-colors"
        >
          Connect
        </button>
      ) : (
        <span className="text-xs text-muted-foreground/50 shrink-0">
          Unsupported browser
        </span>
      )}
    </div>
  )
}

interface WalletItemProps {
  id: WalletId
  name: string
  status: "detected" | "not_detected"
  isConnecting: boolean
  activeId: WalletId | null
  onSelect: (id: WalletId) => void
  description?: string
  isOnline?: boolean
}

export function WalletItem({
  id,
  name,
  status,
  isConnecting,
  activeId,
  onSelect,
  description,
  isOnline = true,
}: WalletItemProps) {
  const isWC = id === "walletconnect"
  const isPasskey = id === "passkey"
  const available = isWC || isPasskey || status === "detected"
  const isBusy = isConnecting && activeId === id

  return (
    <button
      type="button"
      disabled={!available || isConnecting || !isOnline}
      onClick={() => onSelect(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
        isWC ? "holo-border" : "border border-white/10 hover:border-aurora-violet/40",
        "hover:bg-white/[0.06] disabled:opacity-40 disabled:pointer-events-none",
        !isWC && isBusy && "border-aurora-violet/60"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isWC
            ? "bg-aurora-violet/20 text-aurora-violet"
            : isPasskey
              ? "bg-aurora-violet/20 text-aurora-violet"
              : "bg-white/10 text-aurora-cyan"
        )}
      >
        {isWC ? (
          <QrCode className="h-5 w-5" />
        ) : isPasskey ? (
          <Shield className="h-5 w-5" />
        ) : (
          walletIcons[id] ?? id.charAt(0).toUpperCase()
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{name}</p>
          {isWC && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-aurora-violet/20 text-aurora-violet font-medium">
              Recommended
            </span>
          )}
          {isPasskey && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              Detected
            </span>
          )}
        </div>
        {isWC && (
          <p className="text-2xs text-muted-foreground mt-0.5">
            Lobstr, Coinbase, Trust Wallet, MetaMask &amp; 200+
          </p>
        )}
        {isPasskey && description && (
          <p className="text-2xs text-muted-foreground mt-0.5">{description}</p>
        )}
        {!available && !isWC && !isPasskey && (
          <p className="text-2xs text-muted-foreground">Not installed</p>
        )}
      </div>

      {isBusy && (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin text-aurora-violet shrink-0" />
          {isWC && (
            <span className="text-xs text-muted-foreground shrink-0">
              Opening WalletConnect...
            </span>
          )}
          {isPasskey && (
            <span className="text-xs text-muted-foreground shrink-0">
              Setting up biometric authentication...
            </span>
          )}
        </>
      )}

      {available && !isBusy && (
        <span className="text-xs text-aurora-violet font-medium shrink-0">Connect</span>
      )}
    </button>
  )
}

interface WalletListProps {
  standardWallets: WalletDescriptor[]
  hardwareWallets: WalletDescriptor[]
  isScanning: boolean
  isConnecting: boolean
  activeWalletId: WalletId | null
  onSelect: (id: WalletId) => void
  isHardwareAvailable: boolean
  isOnline: boolean
  error: string | null
  showOfflineWarning?: boolean
}

function OfflineWarning({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 mb-4",
        compact && "px-3 py-2.5 mb-2"
      )}
    >
      <WifiOff className={cn("h-4 w-4 text-amber-400 shrink-0", compact && "h-3.5 w-3.5")} />
      <div>
        <p className={cn("text-sm font-medium text-amber-400", compact && "text-xs")}>
          You&apos;re offline
        </p>
        <p className={cn("text-xs text-amber-400/70 mt-0.5", compact && "text-2xs")}>
          {compact
            ? "Connect when you&apos;re back online"
            : "Check your internet connection to connect a wallet"}
        </p>
      </div>
    </div>
  )
}

export function WalletList({
  standardWallets,
  hardwareWallets,
  isScanning,
  isConnecting,
  activeWalletId,
  onSelect,
  isHardwareAvailable,
  isOnline,
  error,
  showOfflineWarning = true,
}: WalletListProps) {
  return (
    <div className="space-y-2">
      {showOfflineWarning && !isOnline && <OfflineWarning compact={false} />}

      {isScanning && (
        <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-aurora-violet/10 border border-aurora-violet/20 text-xs text-aurora-violet font-medium animate-pulse mb-2">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>Scanning for available wallets...</span>
        </div>
      )}

      {standardWallets.map((w) => (
        <WalletItem
          key={w.id}
          id={w.id}
          name={w.name}
          status={w.status}
          description={w.description}
          isConnecting={isConnecting}
          activeId={activeWalletId}
          onSelect={onSelect}
          isOnline={isOnline}
        />
      ))}

      {hardwareWallets.map((w) => (
        <HardwareWalletItem
          key={w.id}
          name={w.name}
          status={w.status as "detected" | "not_detected"}
          isHardwareAvailable={isHardwareAvailable}
          onOpenLedgerPrompt={() => onSelect(w.id)}
        />
      ))}

      {standardWallets.length === 0 && hardwareWallets.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No wallets detected. Install a Stellar wallet or use WalletConnect to scan and connect.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400">
          <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

interface ConnectedWalletCardProps {
  name: string
  address: string | null
  onDisconnect: () => void
  className?: string
}

export function ConnectedWalletCard({
  name,
  address,
  onDisconnect,
  className,
}: ConnectedWalletCardProps) {
  return (
    <div className={cn("glass rounded-2xl px-4 py-3.5 flex items-center gap-3", className)}>
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          Connected &#x2713; {name}
        </p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {address ? address : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
        aria-label="Disconnect wallet"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface Wc2ConnectPanelProps {
  isMobileBrowser: boolean
  uri: string | null
  pairingState: string
  error: string | null
  onRetry: () => void
  onCancel?: () => void
}

export function Wc2ConnectPanel({
  isMobileBrowser,
  uri,
  pairingState,
  error,
  onRetry,
  onCancel,
}: Wc2ConnectPanelProps) {
  if (isMobileBrowser) {
    return (
      <WalletConnectDeepLink uri={uri} pairingState={pairingState} error={error} onRetry={onRetry} />
    )
  }

  return (
    <WalletConnectQR
      uri={uri}
      pairingState={pairingState}
      error={error}
      onRetry={onRetry}
      onCancel={onCancel ?? (() => {})}
    />
  )
}
