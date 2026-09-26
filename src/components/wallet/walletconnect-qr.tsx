"use client"

import { logger } from "@/lib/logger"
import { useEffect, useRef, useState, useCallback } from "react"
import { Copy, Check, Download, Loader2, XCircle, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/cn"
import { copyToClipboard } from "@/lib/clipboard"

/** On-screen QR edge length, in CSS pixels. The download is rendered at 2x this. */
const CANVAS_SIZE = 260

/**
 * Export scale for the downloaded PNG.
 *
 * A WalletConnect URI is long, so the QR lands at a high version with small
 * modules. At 1x the saved file is legible on screen but unreadable once
 * resized or re-photographed, which defeats the point of downloading it. 2x
 * gives each module enough pixels to survive a re-scan off a second monitor or
 * a printout.
 */
const DOWNLOAD_SCALE = 2

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
  const [downloaded, setDownloaded] = useState(false)
  const [countdown, setCountdown] = useState(120)

  const generateQR = useCallback(async (text: string) => {
    if (!canvasRef.current) return
    try {
      const QRCode = await import("qrcode")
      await QRCode.toCanvas(canvasRef.current, text, {
        width: CANVAS_SIZE,
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
      setCopied(false)
      setDownloaded(false)
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

  // copyToClipboard() prefers navigator.clipboard.writeText and falls back to a
  // hidden textarea + execCommand("copy"). The fallback is not legacy cruft
  // here: this modal is reachable over plain http on a LAN dev origin, where
  // navigator.clipboard is undefined and writeText would simply be a no-op.
  const handleCopy = async () => {
    if (!uri) return
    const success = await copyToClipboard(uri)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = useCallback(async () => {
    if (!uri) return
    try {
      const QRCode = await import("qrcode")
      // Rendered fresh rather than read back off the on-screen canvas: the
      // canvas is drawn white-on-transparent for a dark UI, and a transparent
      // background saved to disk is composited to black by most viewers, which
      // makes the white modules vanish and the code unscannable. The export is
      // therefore its own black-on-white render.
      const dataUrl = await QRCode.toDataURL(uri, {
        width: CANVAS_SIZE * DOWNLOAD_SCALE,
        margin: 2,
        color: { dark: "#000000ff", light: "#ffffffff" },
      })

      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "moistello-walletconnect-qr.png"
      link.click()

      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2000)
    } catch (e) {
      // Non-fatal: the on-screen canvas is still scannable, so a failed export
      // must not interrupt pairing or replace the QR with an error state.
      logger.warn("[wc-qr] QR download failed:", e)
    }
  }, [uri])

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
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Or use this link:</p>
            {/*
              Both affordances live next to the URI itself rather than in the
              action row below. They are two ways of moving the *same* value off
              this screen — one for pasting into a wallet that cannot scan, one
              for moving it to a second device — so they belong together, and a
              user who can see the URI can see how to take it.
            */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label="Copy connection URI"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy URI</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label="Download QR code as PNG"
              >
                {downloaded ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PNG</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <code className="block truncate rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-muted-foreground border border-white/10">
            {uri.slice(0, 40)}...
          </code>
        </div>
      )}

      <div className="flex items-center gap-3">
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
