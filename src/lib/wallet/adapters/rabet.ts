import { logger } from "@/lib/logger"
import { WalletAdapter, WalletMeta, SignOptions } from "../types"


interface RabetAPI {
  connect: () => Promise<{ publicKey: string }>
  disconnect: () => Promise<void>
  isConnected: () => Promise<boolean>
  sign: (xdr: string, network?: string) => Promise<{ xdr: string; signature: string }>
  getPublicKey: () => Promise<string>
}

function getRabetAPI(): RabetAPI | null {
  if (typeof window === "undefined") return null
  return (window as unknown as Record<string, RabetAPI>).rabet ?? null
}

export function createRabetAdapter(): WalletAdapter {
  const meta: WalletMeta = {
    id: "rabet",
    name: "Rabet",
    category: "extension",
    icon: "rabet-icon",
    installUrl: "https://rabet.io",
    description: "Stellar browser extension wallet (mobile OK)",
    priority: 3,
    isAvailable: () => {
      if (typeof window === "undefined") return false
      return "rabet" in window
    },
  }

  return {
    meta,
    async connect() {
      const api = getRabetAPI()
      if (!api) throw { adapter: "rabet" as const, code: "not_installed" as const, message: "Rabet is not installed" }
      const result = await api.connect()
      return { publicKey: result.publicKey }
    },
    async disconnect() {
      const api = getRabetAPI()
      if (api) { try { await api.disconnect() } catch (e) { logger.warn("[rabet] Failed to disconnect:", e) } }
    },
    async isConnected() {
      const api = getRabetAPI()
      if (!api) return false
      try { return await api.isConnected() } catch { return false }
    },
    async getPublicKey() {
      const api = getRabetAPI()
      if (!api) throw { adapter: "rabet" as const, code: "not_installed" as const, message: "Rabet not installed" }
      return api.getPublicKey()
    },
    async signMessage(message: string) {
      const api = getRabetAPI()
      if (!api) throw { adapter: "rabet" as const, code: "not_installed" as const, message: "Rabet not installed" }
      const result = await api.sign(message, "testnet")
      return { signature: result.signature, publicKey: await api.getPublicKey() }
    },
    async signTransaction(xdr: string, opts?: SignOptions) {
      const api = getRabetAPI()
      if (!api) throw { adapter: "rabet" as const, code: "not_installed" as const, message: "Rabet not installed" }
      const result = await api.sign(xdr, opts?.network ?? "testnet")
      return { signedXdr: result.xdr }
    },
    async getNetwork() {
      return "testnet"
    },
  }
}
