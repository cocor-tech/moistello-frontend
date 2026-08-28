import type { NetworkType } from "./types"
import { getRelayMonitor } from "./wc2-relay"
import { getWC2SessionStore } from "./wc2-session-store"
import { getSignClientClass } from "./wc2-sign-client"
import { WC2_QR_EXPIRATION_MS } from "@/lib/constants"

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""
const RELAY_URL = "wss://relay.walletconnect.com"
const METADATA = {
  name: "Moistello",
  description: "Decentralized savings circles on Stellar",
  url: "https://moistello.com",
  icons: ["https://moistello.com/logo.jpg"],
}

const CONNECT_TIMEOUT = WC2_QR_EXPIRATION_MS

type WC2EventMap = {
  pairing_uri: (uri: string) => void
  connection_start: () => void
  connection_approved: (address: string) => void
  connection_rejected: () => void
  connection_error: (error: string) => void
  session_expire: () => void
}

type ConnectionState = {
  status: "idle" | "pairing" | "awaiting_approval" | "approved" | "rejected" | "timeout" | "error"
  pairingUri: string | null
  address: string | null
  error: string | null
  sessionTopic: string | null
}

class WCSessionOrchestrator {
  private static instance: WCSessionOrchestrator | null = null
  private signClient: unknown | null = null
  private connectionState: ConnectionState = {
    status: "idle",
    pairingUri: null,
    address: null,
    error: null,
    sessionTopic: null,
  }
  private eventHandlers: Map<keyof WC2EventMap, Set<(...args: unknown[]) => void>> = new Map()
  private cleanupCallbacks: Array<() => void> = []
  private initPromise: Promise<unknown> | null = null

  private constructor() {
    this.recoverSession()
  }

  static getInstance(): WCSessionOrchestrator {
    if (!this.instance) {
      this.instance = new WCSessionOrchestrator()
    }
    return this.instance
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined"
  }

  private isValidStellarPublicKey(key: string): boolean {
    return /^G[A-Z0-9]{55}$/.test(key)
  }

  private chainIdForNetwork(network: NetworkType): string {
    return network === "mainnet" ? "stellar:pubnet" : "stellar:testnet"
  }

  private networkFromChainId(chainId: string): NetworkType {
    return chainId === "stellar:pubnet" ? "mainnet" : "testnet"
  }

  private async recoverSession(): Promise<boolean> {
    const stored = getWC2SessionStore().getSession()
    if (!stored) return false

    const now = Date.now()
    if (stored.expiresAt <= now) {
      getWC2SessionStore().clear()
      return false
    }

    const relay = getRelayMonitor()
    if (relay.status === "down") return false

    this.connectionState.sessionTopic = stored.pairingTopic
    this.connectionState.address = stored.publicKey

    try {
      const sc = await this.getOrInitSignClient()
      const sessions = (sc as { session: { getAll: () => Array<{ topic: string }> } }).session.getAll()
      const activeSession = sessions.find((s) => s.topic === stored.pairingTopic)
      if (!activeSession) {
        getWC2SessionStore().clear()
        return false
      }
      this.signClient = sc
      return true
    } catch (e) {
      console.warn("[wc-session] Failed to restore session:", e)
      return false
    }
  }

  private async getOrInitSignClient(): Promise<unknown> {
    if (this.signClient) return this.signClient
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      const SignClient = await getSignClientClass()
      this.signClient = await SignClient.init({
        projectId: PROJECT_ID || undefined,
        relayUrl: RELAY_URL,
        metadata: METADATA,
      })
      return this.signClient
    })()
    return this.initPromise
  }

  on<K extends keyof WC2EventMap>(event: K, handler: WC2EventMap[K]): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    const wrappedHandler = ((...args: unknown[]) => {
      const h = handler as (...args: unknown[]) => void
      h(...args)
    }) as (...args: unknown[]) => void
    this.eventHandlers.get(event)!.add(wrappedHandler)
    return () => {
      this.eventHandlers.get(event)?.delete(wrappedHandler)
    }
  }

  private emit<K extends keyof WC2EventMap>(event: K, ...args: Parameters<WC2EventMap[K]>): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        const h = handler as (...args: unknown[]) => void
        h(...args)
      })
    }
  }

  async connect(): Promise<{ publicKey: string; address: string }> {
    const relay = getRelayMonitor()
    if (relay.status === "down") {
      this.connectionState.error = "WalletConnect relay is unreachable"
      this.connectionState.status = "error"
      this.emit("connection_error", "WalletConnect relay is unreachable")
      throw new Error("WalletConnect relay is unreachable")
    }

    this.connectionState.status = "pairing"
    this.emit("connection_start")

    const signClient = await this.getOrInitSignClient()

    let settled = false
    const checkSettled = () => settled
    const markSettled = () => { settled = true }

    const connectionPromise = new Promise<{ publicKey: string; address: string }>((resolve, reject) => {

      const handler = async (proposal: unknown) => {
        if (checkSettled()) return

        try {
const prop = proposal as {
             id: number
             params: {
               requiredNamespaces: Record<string, { chains?: string[] }>
               relays: Array<{ protocol: string }>
             }
           }

           const { requiredNamespaces } = prop.params
          if (!requiredNamespaces?.stellar?.chains?.some((c: string) => c.includes("stellar:"))) {
            markSettled()
            reject(new Error("Wallet does not support Stellar"))
            return
          }

          ;(signClient as { approve: (opts: Record<string, unknown>) => Promise<unknown> }).approve({
            id: prop.id,
            ...prop.params,
          })

          const sessions = (signClient as { session: { getAll: () => Array<{ topic: string; namespaces: Record<string, unknown> }> } }).session.getAll()
          const session = sessions[sessions.length - 1]

          if (!session) {
            markSettled()
            reject(new Error("No session after approval"))
            return
          }

          this.connectionState.sessionTopic = session.topic

          const ns = (session.namespaces as Record<string, { accounts: string[] }>)?.stellar
          if (ns?.accounts?.length > 0) {
            const account = ns.accounts[0]
            const parts = account.split(":")
            const pubKey = parts[2]

            if (pubKey && this.isValidStellarPublicKey(pubKey)) {
              this.connectionState.address = pubKey
              markSettled()
              getWC2SessionStore().saveSession({
                pairingTopic: session.topic,
                publicKey: pubKey,
                network: this.networkFromChainId(parts[1]),
                createdAt: Date.now(),
                expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
              })
              resolve({ publicKey: pubKey, address: pubKey })
              this.emit("connection_approved", pubKey)
              return
            }
          }

          markSettled()
          reject(new Error("Could not extract public key"))
        } catch (err: unknown) {
          if (!checkSettled()) {
            markSettled()
            reject(err)
            this.connectionState.error = err instanceof Error ? err.message : "Connection failed"
            this.emit("connection_error", this.connectionState.error)
          }
        }
      }

      ;(signClient as { on: (event: string, handler: (...args: unknown[]) => void) => void }).on("session_proposal", handler)

      const cleanup = () => {
        ;(signClient as { off: (event: string, handler: (...args: unknown[]) => void) => void }).off?.("session_proposal", handler)
      }
      this.cleanupCallbacks.push(cleanup)

      const connectPromise = (signClient as { connect: (opts: { requiredNamespaces: Record<string, { methods: string[]; chains: string[]; events: string[] }>; }) => Promise<{ uri?: string }> }).connect({
        requiredNamespaces: {
          stellar: {
            methods: ["stellar_signAndSubmitXDR", "stellar_signXDR"],
            chains: ["stellar:testnet", "stellar:pubnet"],
            events: [],
          },
        },
      })

      connectPromise
        .then((result) => {
          const { uri } = result as { uri?: string }
          if (uri && !checkSettled()) {
            this.connectionState.pairingUri = uri
            this.connectionState.status = "awaiting_approval"
            this.emit("pairing_uri", uri)
          }
        })
        .catch((err: unknown) => {
          if (!checkSettled()) {
            markSettled()
            this.connectionState.error = err instanceof Error ? err.message : "Connection failed"
            this.connectionState.status = "error"
            reject(err)
            this.emit("connection_error", this.connectionState.error)
          }
        })
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        if (!checkSettled()) {
          markSettled()
          this.connectionState.status = "timeout"
          reject(new Error("Connection timed out"))
          this.emit("session_expire")
        }
      }, CONNECT_TIMEOUT)
    })

    return Promise.race([connectionPromise, timeoutPromise])
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  async disconnect(): Promise<void> {
    const sc = this.signClient as { disconnect?: (opts: { topic: string }) => Promise<void> } | null
    if (sc?.disconnect && this.connectionState.sessionTopic) {
      try {
        await sc.disconnect({ topic: this.connectionState.sessionTopic })
      } catch (e) {
        console.warn("[wc-session] Failed to disconnect:", e)
      }
    }
    this.reset()
  }

  async isConnected(): Promise<boolean> {
    return this.connectionState.address !== null && this.connectionState.sessionTopic !== null
  }

  private reset(): void {
    this.connectionState = {
      status: "idle",
      pairingUri: null,
      address: null,
      error: null,
      sessionTopic: null,
    }
    this.cleanupCallbacks.forEach((cb) => cb())
    this.cleanupCallbacks = []
    this.signClient = null
    getWC2SessionStore().clear()
  }
}

export const getWCSessionManager = (): WCSessionOrchestrator => WCSessionOrchestrator.getInstance()

export function connectWalletConnect(): Promise<{ publicKey: string; address: string }> {
  return getWCSessionManager().connect()
}

export function disconnectWalletConnect(): Promise<void> {
  return getWCSessionManager().disconnect()
}

export function isWalletConnectConnected(): Promise<boolean> {
  return getWCSessionManager().isConnected()
}