import type { WalletAdapter, WalletMeta } from "./types"
import { isPasskeyEnabled, isHardwareWalletEnabled, isWalletConnectEnabled, isExtensionWalletsEnabled } from "./features"

const FLAGGED_EXTENSION_WALLETS = new Set(["xbull", "rabet", "albedo"])

export type DetectionResult = WalletMeta & { status: "detected" | "not_detected" }

export class WalletRegistry {
  private adapters: Map<string, WalletAdapter> = new Map()
  private cache: Map<string, { result: DetectionResult; timestamp: number }> = new Map()
  private cacheTTL: number = 30_000

  register(adapter: WalletAdapter): void {
    this.adapters.set(adapter.meta.id, adapter)
  }

  detect(): DetectionResult[] {
    let results: DetectionResult[] = []

    for (const id of Array.from(this.adapters.keys())) {
      const adapter = this.adapters.get(id)!
      const cached = this.cache.get(id)
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        results.push(cached.result)
        continue
      }

      const start = performance.now()
      let available = false
      try {
        available = adapter.meta.isAvailable()
      } catch {
        available = false
      }
      const elapsed = performance.now() - start
      if (elapsed > 10) {
        console.warn(`[WalletRegistry] ${id} detection took ${elapsed.toFixed(1)}ms (threshold: 10ms)`)
      }

      const result: DetectionResult = {
        ...adapter.meta,
        status: available ? "detected" : "not_detected",
      }
      this.cache.set(id, { result, timestamp: Date.now() })
      results.push(result)
    }

    results = results.filter(r => this.isAdapterEnabled(r.id))

    return results.sort((a, b) => {
      if (a.status !== b.status) return a.status === "detected" ? -1 : 1
      return a.priority - b.priority
    })
  }

  clearCache(): void {
    this.cache.clear()
  }

  getAdapter(id: string): WalletAdapter | undefined {
    return this.adapters.get(id)
  }

  getRegistered(): WalletAdapter[] {
    return Array.from(this.adapters.values()).filter(a => this.isAdapterEnabled(a.meta.id))
  }

  private isAdapterEnabled(id: string): boolean {
    if (id === "passkey" && !isPasskeyEnabled()) return false
    if (id === "ledger" && !isHardwareWalletEnabled()) return false
    if (id === "walletconnect" && !isWalletConnectEnabled()) return false
    if (FLAGGED_EXTENSION_WALLETS.has(id) && !isExtensionWalletsEnabled()) return false
    return true
  }
}

let _registry: WalletRegistry | null = null

export function getWalletRegistry(): WalletRegistry {
  if (!_registry) {
    _registry = new WalletRegistry()
  }
  return _registry
}

export const walletRegistry = new Proxy({} as WalletRegistry, {
  get(_target, prop: string | symbol) {
    return (getWalletRegistry() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
