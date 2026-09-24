"use client"

import { logger } from "@/lib/logger"
import { useEffect, useRef, useState, useCallback } from "react"
import { Copy, Check, Loader2, XCircle, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/cn"
import { copyToClipboard } from "@/lib/clipboard"

interface WalletConnectQRProps {
  uri: string | null
  pairingState: string
  error: string | null
  onRetry: () => void
  onCancel: () => void
  className?: string
}

export function WalletConnectQR({
  uri,
  pairingState,
  error,
  onRetry,
  onCancel,
  className,
}: WalletConnectQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(120)

  const generateQR = useCallback(async (text: string) => {
    if (!canvasRef.current) return
    try {
      const QRCode = await import("qrcode")
      await QRCode.toCanvas(canvasRef.current, text, {
        width: 260,
        margin: 2,
        color: {
          dark: "#ffffff",
          light: "transparent",
        },
      })
    } catch (e) {
      logger.warn("[wc-qr] QR generation failed:", e)
    }
  }, [])

  useEffect(() => {
    if (uri) {
      generateQR(uri)
      setCountdown(120)
    }
  }, [uri, generateQR])

  useEffect(() => {
    if (!uri || pairingState === "approved" || pairingState === "rejected") return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [uri, pairingState])

  const handleCopy = async () => {
    if (!uri) return
    const success = await copyToClipboard(uri)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (pairingState === "approved") {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-7 w-7 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Connected!</p>
        <p className="text-xs text-muted-foreground text-center">
          Wallet linked successfully. Proceed to verify your identity.
        </p>
      </div>
    )
  }

  if (pairingState === "rejected") {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
          <XCircle className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Connection Cancelled</p>
        <p className="text-xs text-muted-foreground text-center">
          You cancelled the connection in your wallet.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 text-xs text-aurora-violet font-medium hover:text-premium-gold transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </button>
      </div>
    )
  }

  if (error || countdown === 0 || pairingState === "timeout") {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
          <AlertCircle className="h-7 w-7 text-amber-400" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {countdown === 0 || pairingState === "timeout" ? "Connection Timed Out" : "Connection Error"}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          {error || (pairingState === "timeout" ? "The QR code expired. Generate a new one to try again." : "Scan the QR code within 120 seconds.")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 text-xs text-aurora-violet font-medium hover:text-premium-gold transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Generate New Code
        </button>
      </div>
    )
  }

  if (!uri) {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-aurora-violet" />
        <p className="text-sm text-muted-foreground">Generating connection code...</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center gap-4 py-2", className)}>
      <div className="rounded-2xl bg-black/40 p-3 ring-1 ring-white/10">
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          className="rounded-xl"
          role="img"
          aria-label="QR code for wallet connection"
        />
      </div>

      <p className="text-sm text-foreground font-medium">Scan with your wallet app</p>

      <ol className="space-y-1 text-xs text-muted-foreground text-center">
        <li>1. Open Lobstr, Coinbase Wallet, or Trust Wallet on your phone</li>
        <li>2. Tap the QR scanner icon</li>
        <li>3. Scan this code to connect</li>
      </ol>

      {uri && (
        <div className="w-full max-w-xs">
          <p className="text-xs text-muted-foreground mb-2 text-center">Or use this link:</p>
          <code className="block truncate rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-muted-foreground border border-white/10">
            {uri.slice(0, 40)}...
          </code>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          aria-label="Copy connection link"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Cancel
        </button>
      </div>

      {pairingState === "pairing" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aurora-violet opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-aurora-violet" />
          </span>
          Code expires in {countdown}s
        </div>
      )}
    </div>
  )
}
