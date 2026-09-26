"use client"

import { useEffect, useState, useCallback } from "react"
import { ExternalLink, Copy, Check, Smartphone, LoaderCircle, CircleAlert } from "lucide-react"
import { cn } from "@/lib/cn"
import { copyToClipboard } from "@/lib/clipboard"

interface WalletConnectDeepLinkProps {
  uri: string | null
  pairingState: string
  error: string | null
  onRetry: () => void
  className?: string
}

function detectMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function WalletConnectDeepLink({
  uri,
  pairingState,
  error,
  onRetry,
  className,
}: WalletConnectDeepLinkProps) {
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(detectMobileBrowser())
  }, [])

  const handleOpenWallet = useCallback(() => {
    if (!uri) return

    if (isMobile) {
      const deepLink = `wc:${uri}`
      window.location.href = deepLink
    } else {
      window.open(`https://walletconnect.com/wc?uri=${encodeURIComponent(uri)}`, "_blank")
    }
  }, [uri, isMobile])

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
          Wallet linked successfully.
        </p>
      </div>
    )
  }

  if (pairingState === "rejected") {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
          <ExternalLink className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Connection Cancelled</p>
        <p className="text-xs text-muted-foreground text-center">
          You cancelled the connection in your wallet.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-aurora-violet font-medium hover:text-premium-gold transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
          <CircleAlert className="h-7 w-7 text-amber-400" />
        </div>
        <p className="text-sm font-medium text-foreground">Connection Error</p>
        <p className="text-xs text-muted-foreground text-center">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-aurora-violet font-medium hover:text-premium-gold transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!uri) {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
        <LoaderCircle className="h-8 w-8 animate-spin text-aurora-violet" />
        <p className="text-sm text-muted-foreground">Preparing connection...</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center gap-4 py-4", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-aurora-violet/20">
        <Smartphone className="h-7 w-7 text-aurora-violet" />
      </div>

      {isMobile ? (
        <>
          <p className="text-sm font-medium text-foreground text-center">
            Open your wallet app to connect
          </p>
          <button
            type="button"
            onClick={handleOpenWallet}
            className="gradient-bg-extended w-full max-w-xs h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-heading font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-4 w-4" />
            Open Wallet App
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Don&apos;t have a wallet?{" "}
            <a
              href="https://lobstr.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-aurora-cyan hover:underline"
            >
              Install Lobstr
            </a>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground text-center">
            Connect from your mobile wallet
          </p>
          <button
            type="button"
            onClick={handleOpenWallet}
            className="glass-strong w-full max-w-xs h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-heading font-medium text-foreground hover:bg-white/[0.06] transition-all"
          >
            <ExternalLink className="h-4 w-4 text-aurora-violet" />
            Open WalletConnect
          </button>
        </>
      )}

      <div className="w-full max-w-xs">
        <p className="text-xs text-muted-foreground mb-2 text-center">Or copy the link:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-muted-foreground border border-white/10">
            {uri.slice(0, 40)}...
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            aria-label="Copy connection link"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
