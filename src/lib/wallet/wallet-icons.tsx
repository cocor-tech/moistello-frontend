"use client"

import { useState, type ReactNode } from "react"
import { QrCode, Usb, Fingerprint, Wallet, type LucideIcon } from "lucide-react"

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  walletconnect: QrCode,
  ledger: Usb,
  passkey: Fingerprint,
  freighter: Wallet,
  rabet: Wallet,
  xbull: Wallet,
  albedo: Wallet,
}

interface WalletIconProps {
  id: string
  name: string
  className?: string
  size?: "sm" | "md" | "lg"
}

const WRAPPER_SIZE = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
}

const ICON_SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
}

export function WalletIcon({ id, name, className, size = "md" }: WalletIconProps): ReactNode {
  const [svgFailed, setSvgFailed] = useState(false)
  const LucideIcon = LUCIDE_ICONS[id]

  if (LucideIcon) {
    return (
      <span className={`flex ${WRAPPER_SIZE[size]} items-center justify-center rounded-full bg-white/10 ${className ?? ""}`} aria-hidden="true">
        <LucideIcon className={ICON_SIZE[size]} aria-hidden="true" />
      </span>
    )
  }

  if (!svgFailed) {
    return (
      <span className={`flex ${WRAPPER_SIZE[size]} items-center justify-center rounded-full bg-white/10 ${className ?? ""}`} aria-hidden="true">
        <img
          src={`/icons/wallets/${id}.svg`}
          alt={name}
          className={ICON_SIZE[size]}
          loading="lazy"
          decoding="async"
          width={size === "sm" ? 16 : size === "md" ? 20 : 28}
          height={size === "sm" ? 16 : size === "md" ? 20 : 28}
          onError={() => setSvgFailed(true)}
        />
      </span>
    )
  }

  return (
    <span className={`flex ${WRAPPER_SIZE[size]} items-center justify-center rounded-full bg-white/10 text-lg font-bold text-foreground ${className ?? ""}`} aria-hidden="true">
      {name ? name.charAt(0).toUpperCase() : "?"}
    </span>
  )
}
