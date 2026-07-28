import { getWalletRegistry } from "../registry"
import { isPasskeyEnabled, isHardwareWalletEnabled, isWalletConnectEnabled, isExtensionWalletsEnabled } from "../features"

export { createWalletConnectAdapter } from "./walletconnect"
export { createPasskeyAdapter } from "./passkey"
export { createFreighterAdapter } from "./freighter"
export { createXBullAdapter } from "./xbull"
export { createRabetAdapter } from "./rabet"
export { createAlbedoAdapter } from "./albedo"
export { createLedgerAdapter } from "./ledger"

let initialized = false

export async function initializeWalletAdapters(): Promise<void> {
  if (initialized) return
  const registry = getWalletRegistry()

// WalletConnect: gated by feature flag
   if (isWalletConnectEnabled()) {
     const { createWalletConnectAdapter } = await import("./walletconnect")
     registry.register(createWalletConnectAdapter())
   }

  // Passkey: gated by feature flag
  if (isPasskeyEnabled()) {
    const { createPasskeyAdapter } = await import("./passkey")
    registry.register(createPasskeyAdapter())
  }

  // Freighter always available
  const { createFreighterAdapter } = await import("./freighter")
  registry.register(createFreighterAdapter())

  // xBull, Rabet, Albedo: gated by feature flag
  if (isExtensionWalletsEnabled()) {
    const { createXBullAdapter } = await import("./xbull")
    registry.register(createXBullAdapter())
    const { createRabetAdapter } = await import("./rabet")
    registry.register(createRabetAdapter())
    const { createAlbedoAdapter } = await import("./albedo")
    registry.register(createAlbedoAdapter())
  }

  // Hardware wallet: gated by feature flag
  if (isHardwareWalletEnabled()) {
    const { createLedgerAdapter } = await import("./ledger")
    registry.register(createLedgerAdapter())
  }

  initialized = true
}
