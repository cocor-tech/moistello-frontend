"use client"

import { QrCode, CircleAlert, LoaderCircle, RefreshCw, X } from "lucide-react"
import { cn } from "@/lib/cn"
import dynamic from "next/dynamic"
import { useEffect, useState, useCallback } from "react"

const WalletConnectQR = dynamic(
  () => import("../wallet/walletconnect-qr").then((m) => m.WalletConnectQR),
  { ssr: false }
)

const WalletConnectDeepLink = dynamic(
  () => import("../wallet/walletconnect-deeplink").then((m) => m.WalletConnectDeepLink),
  { ssr: false }
)

interface AuthConnectionStateProps {
  pairingUri: string | null
  pairingState: "idle" | "pairing" | "awaiting_approval" | "approved" | "rejected" | "timeout" | "error"
  error: string | null
  onRetry: () => void
  onCancel: () => void
  expiresAt: number | null
  className?: string
}

export function AuthConnectionState({
  pairingUri,
  pairingState,
  error,
  onRetry,
  onCancel,
  expiresAt,
  className,
}: AuthConnectionStateProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null)
      return
    }

    const update = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining > 0 ? remaining : null)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const getStatusText = () => {
    switch (pairingState) {
      case "pairing":
        return "Generating connection code..."
      case "awaiting_approval":
        return isMobile ? "Open your wallet app to connect" : "Scan the QR code with your mobile wallet"
      case "approved":
        return "Connection approved"
      case "rejected":
        return "Connection rejected"
      case "timeout":
        return "Connection expired"
      case "error":
        return error || "Connection failed"
      default:
        return "Waiting for connection..."
    }
  }

  const handleCancel = useCallback(() => {
    setTimeLeft(null)
    onCancel()
  }, [onCancel])

  if (error && pairingState === "error") {
    return (
      <div className={cn("text-center space-y-4 py-4", className)}>
        <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto">
          <CircleAlert className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="font-heading text-lg text-red-400">Connection Failed</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/[0.06] text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/[0.06] text-sm font-medium transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!pairingUri) {
    return (
      <div className={cn("text-center py-8", className)}>
        <LoaderCircle className="h-8 w-8 animate-spin mx-auto text-aurora-violet mb-4" />
        <p className="text-sm text-muted-foreground">{getStatusText()}</p>
      </div>
    )
  }

  return (
    <div className={cn("text-center", className)}>
      <div className="w-12 h-12 rounded-2xl gradient-bg-extended flex items-center justify-center text-white mx-auto mb-4">
        <QrCode className="h-6 w-6" />
      </div>
      <h3 className="font-heading text-xl mb-1">Connect with WalletConnect</h3>
      <p className="text-sm text-muted-foreground mb-5">{getStatusText()}</p>

      {isMobile ? (
        <WalletConnectDeepLink uri={pairingUri} pairingState={pairingState} error={error} onRetry={onRetry} />
      ) : (
        <WalletConnectQR uri={pairingUri} pairingState={pairingState} error={error} onRetry={onRetry} onCancel={onCancel} />
      )}

      {timeLeft !== null && (
        <p className="text-xs text-muted-foreground mt-3">
          Expires in {timeLeft}s
        </p>
      )}

      <button
        type="button"
        onClick={handleCancel}
        className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}