/**
 * Feature flag utility for wallet adapters.
 * All flags default to "true" if not explicitly set to "false".
 */

export function isFeatureEnabled(flag: string): boolean {
  if (typeof window === "undefined") return false // SSR: never enabled on server

  // Check Next.js public env var
  const envFlag = (process.env as Record<string, string | undefined>)[flag]

  // Default: enabled unless explicitly "false"
  if (envFlag === "false" || envFlag === "0") return false
  return true
}

export function isPasskeyEnabled(): boolean {
  return isFeatureEnabled("NEXT_PUBLIC_FEATURE_PASSKEY")
}

export function isHardwareWalletEnabled(): boolean {
  return isFeatureEnabled("NEXT_PUBLIC_FEATURE_HARDWARE_WALLET")
}

export function isWalletConnectEnabled(): boolean {
  return isFeatureEnabled("NEXT_PUBLIC_FEATURE_WALLETCONNECT")
}

export function isExtensionWalletsEnabled(): boolean {
  return isFeatureEnabled("NEXT_PUBLIC_FEATURE_EXTENSION_WALLETS")
}
