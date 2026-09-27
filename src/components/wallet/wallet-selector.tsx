"use client"

import { logger } from "@/lib/logger"
import { useState } from "react"
import { Wallet, X, Loader2, QrCode } from "lucide-react"
import { cn } from "@/lib/cn"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import { useWalletConnectStore } from "@/stores/walletconnect-store"
import { useMultiWalletConnection } from "@/hooks/use-multi-wallet"
import { formatAddress } from "@/lib/formatters"
import dynamic from "next/dynamic"
import type { WalletId } from "@/lib/wallet/types"
import { useOnlineStatus } from "@/hooks/use-online-status"
import {
  WalletList,
  Wc2ConnectPanel,
  ConnectedWalletCard,
  type WalletDescriptor,
} from "./wallet-selector-shared"

const LedgerPrompt = dynamic(() => import("@/components/wallet/ledger-prompt").then((m) => m.LedgerPrompt), { ssr: false })

interface WalletSelectorProps {
  className?: string
  variant?: "inline" | "overlay"
}

interface WalletSelectorState {
  isOnline: boolean
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  activeWalletId: WalletId | null
  activeAdapterName: string
  isSelectorOpen: boolean
  setSelectorOpen: (open: boolean) => void
  showLedgerPrompt: boolean
  setShowLedgerPrompt: (open: boolean) => void
  standardWallets: WalletDescriptor[]
  hardwareWallets: WalletDescriptor[]
  isScanning: boolean
  isHardwareAvailable: boolean
  isWc2Active: boolean
  wc2PairingUri: string | null
  wc2PairingState: string
  wc2PairingError: string | null
  isMobileBrowser: boolean
  handleSelect: (id: WalletId) => void
  handleWc2Retry: () => void
  handleWc2Cancel: () => void
  handleDisconnect: () => void
  formattedAddress: string | null
}

function OverlayWalletSelector({ className, ...s }: WalletSelectorProps & WalletSelectorState) {
  return (
    <>
      <div className={cn("space-y-4", className)}>
        {s.isWc2Active && !s.isConnected ? (
          <>
            <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mx-auto mb-4">
              <QrCode className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-xl text-center mb-1">Connect with WalletConnect</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              {s.isMobileBrowser
                ? "Open your wallet app to connect"
                : "Scan the QR code with your mobile wallet"}
            </p>
            <Wc2ConnectPanel
              isMobileBrowser={s.isMobileBrowser}
              uri={s.wc2PairingUri}
              pairingState={s.wc2PairingState}
              error={s.wc2PairingError}
              onRetry={s.handleWc2Retry}
              onCancel={s.handleWc2Cancel}
            />
          </>
        ) : !s.isConnected ? (
          <>
            <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mx-auto mb-4">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-xl text-center mb-1">Connect Your Wallet</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              Choose a wallet to sign in securely
            </p>
            <WalletList
              standardWallets={s.standardWallets}
              hardwareWallets={s.hardwareWallets}
              isScanning={s.isScanning}
              isConnecting={s.isConnecting}
              activeWalletId={s.activeWalletId}
              onSelect={s.handleSelect}
              isHardwareAvailable={s.isHardwareAvailable}
              isOnline={s.isOnline}
              error={s.error}
              showOfflineWarning
            />
          </>
        ) : (
          <ConnectedWalletCard
            name={s.activeAdapterName}
            address={s.formattedAddress}
            onDisconnect={s.handleDisconnect}
          />
        )}
      </div>
      <LedgerPrompt isOpen={s.showLedgerPrompt} onClose={() => s.setShowLedgerPrompt(false)} />
    </>
  )
}

function InlineWalletSelector({ className, ...s }: WalletSelectorProps & WalletSelectorState) {
  if (!s.isConnected) {
    return (
      <>
        <div className={cn("space-y-3", className)}>
          {s.isWc2Active ? (
            <div className="glass-flagship rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-aurora-violet" />
                <p className="text-sm font-medium text-foreground">Connect with WalletConnect</p>
                <button
                  type="button"
                  onClick={s.handleWc2Cancel}
                  className="ml-auto p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
                  aria-label="Cancel WalletConnect pairing"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <Wc2ConnectPanel
                isMobileBrowser={s.isMobileBrowser}
                uri={s.wc2PairingUri}
                pairingState={s.wc2PairingState}
                error={s.wc2PairingError}
                onRetry={s.handleWc2Retry}
                onCancel={s.handleWc2Cancel}
              />
            </div>
          ) : s.isSelectorOpen ? (
            <div className="space-y-2">
              <WalletList
                standardWallets={s.standardWallets}
                hardwareWallets={s.hardwareWallets}
                isScanning={s.isScanning}
                isConnecting={s.isConnecting}
                activeWalletId={s.activeWalletId}
                onSelect={s.handleSelect}
                isHardwareAvailable={s.isHardwareAvailable}
                isOnline={s.isOnline}
                error={s.error}
                showOfflineWarning
              />
              <button
                type="button"
                onClick={() => s.setSelectorOpen(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => s.setSelectorOpen(true)}
              disabled={s.isConnecting}
              className="glass-strong w-full h-12 rounded-xl flex items-center justify-center gap-3 text-sm font-heading font-medium text-foreground hover:bg-white/[0.06] transition-all disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden"
            >
              {s.isConnecting ? (
                <>
                  <span className="absolute inset-0 animate-shimmer" />
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5 text-aurora-violet" />
                  Connect Wallet
                </>
              )}
            </button>
          )}
        </div>
        <LedgerPrompt isOpen={s.showLedgerPrompt} onClose={() => s.setShowLedgerPrompt(false)} />
      </>
    )
  }

  return (
    <ConnectedWalletCard
      name={s.activeAdapterName}
      address={s.formattedAddress}
      onDisconnect={s.handleDisconnect}
    />
  )
}

export function WalletSelector({ className, variant = "inline" }: WalletSelectorProps) {
  const isOnline = useOnlineStatus()
  const [showLedgerPrompt, setShowLedgerPrompt] = useState(false)
  const detectedWallets = useMultiWalletStore((s) => s.detectedWallets)
  const isScanning = useMultiWalletStore((s) => s.isScanning)
  const { isConnected, isConnecting, error, address, activeAdapter } = useMultiWalletConnection()
  const activeWalletId = useMultiWalletStore((s) => s.activeWalletId)
  const isSelectorOpen = useMultiWalletStore((s) => s.isSelectorOpen)
  const setSelectorOpen = useMultiWalletStore((s) => s.setSelectorOpen)
  const connect = useMultiWalletStore((s) => s.connect)
  const disconnect = useMultiWalletStore((s) => s.disconnect)

  const isWebUSBAvailable = typeof navigator !== "undefined" && "usb" in navigator
  const isWebBLEAvailable = typeof navigator !== "undefined" && "bluetooth" in navigator && typeof (navigator.bluetooth as { requestDevice?: () => unknown }).requestDevice === "function"
  const isHardwareAvailable = isWebUSBAvailable || isWebBLEAvailable
  const isMobileBrowser = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  const wc2PairingUri = useWalletConnectStore((s) => s.pairingUri)
  const wc2PairingState = useWalletConnectStore((s) => s.pairingState)
  const wc2PairingError = useWalletConnectStore((s) => s.pairingError)
  const setWc2PairingUri = useWalletConnectStore((s) => s.setPairingUri)
  const setWc2PairingError = useWalletConnectStore((s) => s.setPairingError)
  const resetWc2Pairing = useWalletConnectStore((s) => s.reset)
  const setWc2PairingState = useWalletConnectStore((s) => s.setPairingState)

  const sortedWallets = [...detectedWallets].sort((a, b) => {
    if (a.id === "walletconnect") return -1
    if (b.id === "walletconnect") return 1
    return 0
  })

  const hardwareWallets = sortedWallets.filter((w) => w.category === "hardware") as WalletDescriptor[]
  const standardWallets = sortedWallets.filter((w) => w.category !== "hardware") as WalletDescriptor[]
  const isWc2Active = wc2PairingState !== "idle" && wc2PairingState !== "approved"
  const formattedAddress = address ? formatAddress(address) : null
  const activeAdapterName = activeAdapter?.meta.name ?? "Wallet"

  const handleSelect = async (walletId: WalletId) => {
    if (!isOnline) return
    const wallet = detectedWallets.find((w) => w.id === walletId)
    if (wallet?.category === "hardware") {
      setShowLedgerPrompt(true)
      return
    }

    if (walletId === "walletconnect") {
      const { setOnPairingUri } = await import("@/lib/wallet/adapters/walletconnect")
      setOnPairingUri((uri: string) => {
        setWc2PairingUri(uri)
        setWc2PairingState("awaiting_approval")
      })
    }

    try {
      await connect(walletId)
      if (walletId === "walletconnect") {
        setWc2PairingState("approved")
      }
    } catch (e) {
      logger.error("[wallet-selector] Connection failed:", e)
      if (walletId === "walletconnect") {
        setWc2PairingError(address || "Connection failed or was cancelled.")
      }
    } finally {
      if (walletId === "walletconnect") {
        const { setOnPairingUri } = await import("@/lib/wallet/adapters/walletconnect")
        setOnPairingUri(null)
      }
    }
  }

  const handleWc2Retry = () => {
    resetWc2Pairing()
    handleSelect("walletconnect")
  }

  const handleWc2Cancel = () => {
    resetWc2Pairing()
    if (activeWalletId === "walletconnect") {
      disconnect("walletconnect")
    }
  }

  const handleDisconnect = () => {
    if (activeWalletId) {
      disconnect(activeWalletId)
      resetWc2Pairing()
    }
  }

  const state: WalletSelectorState = {
    isOnline,
    isConnected,
    isConnecting,
    error,
    activeWalletId,
    activeAdapterName,
    isSelectorOpen,
    setSelectorOpen,
    showLedgerPrompt,
    setShowLedgerPrompt,
    standardWallets,
    hardwareWallets,
    isScanning,
    isHardwareAvailable,
    isWc2Active,
    wc2PairingUri,
    wc2PairingState,
    wc2PairingError,
    isMobileBrowser,
    handleSelect,
    handleWc2Retry,
    handleWc2Cancel,
    handleDisconnect,
    formattedAddress,
  }

  if (variant === "overlay") {
    return <OverlayWalletSelector className={className} {...state} />
  }

  return <InlineWalletSelector className={className} {...state} />
}
