import { logger } from "@/lib/logger"
import { WalletAdapter, WalletMeta, SignOptions } from "../types"


interface XBullAPI {
  connect: (permissions?: string[]) => Promise<string>
  sign: (params: { xdr: string; publicKey?: string; network?: string }) => Promise<{ signature: string; xdr: string }>
  getPublicKey: () => Promise<string>
  getNetwork: () => Promise<string>
  isConnected: () => Promise<boolean>
  closeConnections: () => Promise<void>
}

function getXBullAPI(): XBullAPI | null {
  if (typeof window === "undefined") return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as unknown as Record<string, XBullAPI>).xBullSDK ?? (window as any).xBullWallet ?? null
}

export function createXBullAdapter(): WalletAdapter {
  const meta: WalletMeta = {
    id: "xbull",
    name: "xBull",
    category: "extension",
    icon: "xbull-icon",
    installUrl: "https://xbull.app",
    description: "Stellar browser extension wallet",
    priority: 2,
    isAvailable: () => {
      if (typeof window === "undefined") return false
      return "xBullSDK" in window || "xBullWallet" in window
    },
  }

  return {
    meta,

    async connect() {
      const api = getXBullAPI()
      if (!api) {
        throw { adapter: "xbull" as const, code: "not_installed" as const, message: "xBull is not installed. Install it from https://xbull.app" }
      }
      const publicKey = await api.connect(["public_key", "sign"])
      return { publicKey }
    },

    async disconnect() {
      const api = getXBullAPI()
      if (api) {
        try { await api.closeConnections() } catch (e) { logger.warn("[xbull] Failed to close connections:", e) }
      }
    },

    async isConnected() {
      const api = getXBullAPI()
      if (!api) return false
      try { return await api.isConnected() } catch { return false }
    },

    async getPublicKey() {
      const api = getXBullAPI()
      if (!api) throw { adapter: "xbull" as const, code: "not_installed" as const, message: "xBull not installed" }
      return api.getPublicKey()
    },

    async signMessage(message: string) {
      const api = getXBullAPI()
      if (!api) throw { adapter: "xbull" as const, code: "not_installed" as const, message: "xBull not installed" }
      const pubKey = await api.getPublicKey()
      const result = await api.sign({ xdr: message, publicKey: pubKey, network: "testnet" })
      return { signature: result.signature, publicKey: pubKey }
    },

    async signTransaction(xdr: string, opts?: SignOptions) {
      const api = getXBullAPI()
      if (!api) throw { adapter: "xbull" as const, code: "not_installed" as const, message: "xBull not installed" }
      const pubKey = await api.getPublicKey()
      const result = await api.sign({
        xdr,
        publicKey: pubKey,
        network: opts?.network ?? "testnet",
      })
      return { signedXdr: result.xdr }
    },

    async getNetwork() {
      const api = getXBullAPI()
      if (!api) return "testnet"
      try {
        const net = await api.getNetwork()
        return net === "mainnet" || net === "PUBLIC" ? "mainnet" : "testnet"
      } catch { return "testnet" }
    },
  }
}
