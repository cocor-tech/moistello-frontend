import { WalletAdapter, WalletAdapterMeta, ConnectOptions } from "../types"
import { getRelayMonitor } from "../wc2-relay"
import { getWC2SessionStore } from "../wc2-session-store"
import { validateStellarAddress } from "@/lib/stellar/validate-address"

let signClientInstance: any = null
let initPromise: Promise<any> | null = null

let _pairingUri: string | null = null
let _pairingState = "idle"
let _pairingError: string | null = null

export function setOnPairingUri(uri: string | null) {
  _pairingUri = uri
  if (uri) {
    _pairingState = "pairing"
    _pairingError = null
  } else {
    _pairingState = "idle"
  }
}

export function resetWcState() {
  _pairingUri = null
  _pairingState = "idle"
  _pairingError = null
}

async function getOrInitSignClient() {
  if (signClientInstance) return signClientInstance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const { SignClient } = await import("@walletconnect/sign-client")
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id"
    
    signClientInstance = await SignClient.init({
      projectId,
      relayUrl: "wss://relay.walletconnect.com",
      metadata: {
        name: "Moistello",
        description: "Decentralized ROSCA platform on Stellar",
        url: typeof window !== "undefined" ? window.location.origin : "https://moistello.com",
        icons: ["https://moistello.com/icon.png"],
      },
    })
    return signClientInstance
  })()

  return initPromise
}

export function createWalletConnectAdapter(): WalletAdapter & {
  getPairingUri: () => string | null
  getPairingState: () => string
  getPairingError: () => string | null
} {
  let currentPublicKey: string | null = null
  let currentSession: any = null

  const meta: WalletAdapterMeta = {
    id: "walletconnect",
    name: "WalletConnect",
    category: "mobile",
    priority: 0,
    description: "Connect with Lobstr, xBull, and 200+ mobile Stellar wallets",
    icon: "/icons/walletconnect.svg",
    isAvailable: () => typeof window !== "undefined",
  }

  return {
    meta,
    getPairingUri: () => _pairingUri,
    getPairingState: () => _pairingState,
    getPairingError: () => _pairingError,

    async connect(options?: ConnectOptions) {
      const relay = getRelayMonitor()
      if (relay.isDownForConnect) {
        const err = new Error("WalletConnect relay is temporarily unavailable. Please try another wallet.")
        ;(err as any).code = "relay_down"
        throw err
      }

      try {
        _pairingState = "pairing"
        _pairingError = null

        const client = await getOrInitSignClient()
        
        const sessions = client.session.getAll()
        if (sessions.length > 0) {
          const active = sessions[sessions.length - 1]
          const accounts = active.namespaces?.stellar?.accounts || []
          if (accounts.length > 0) {
            const [, network, address] = accounts[0].split(":")
            if (address && validateStellarAddress(address)) {
              currentPublicKey = address
              currentSession = active
              _pairingState = "approved"
              relay.recordOutcome("connect", true)
              return { publicKey: address, network: network === "stellar:testnet" ? "testnet" : "public" }
            }
          }
        }

        const { uri, approval } = await client.connect({
          requiredNamespaces: {
            stellar: {
              methods: ["stellar_signTransaction", "stellar_signMessage"],
              chains: [options?.network === "public" ? "stellar:public" : "stellar:testnet"],
              events: ["session_event", "session_delete"],
            },
          },
        })

        if (uri) {
          _pairingUri = uri
          options?.onUri?.(uri)
        }

        const session = await approval()
        _pairingUri = null
        _pairingState = "approved"

        const accounts = session.namespaces?.stellar?.accounts || []
        if (accounts.length === 0) {
          throw new Error("No Stellar accounts found in WalletConnect session")
        }

        const [, network, address] = accounts[0].split(":")
        if (!address || !validateStellarAddress(address)) {
          throw new Error("Invalid Stellar address returned from WalletConnect session")
        }

        currentPublicKey = address
        currentSession = session

        const store = getWC2SessionStore()
        store.saveSession(session)
        relay.recordOutcome("connect", true)

        return {
          publicKey: address,
          network: network === "stellar:testnet" ? "testnet" : "public",
        }
      } catch (err: any) {
        _pairingUri = null
        _pairingState = "rejected"
        _pairingError = err?.message || "Connection failed"
        relay.recordOutcome("connect", false)
        throw { code: "user_rejected", message: err?.message || "Connection rejected", adapter: "walletconnect" }
      }
    },

    async disconnect() {
      try {
        if (currentSession) {
          const client = await getOrInitSignClient()
          await client.disconnect({
            topic: currentSession.topic,
            reason: { code: 6000, message: "User disconnected" },
          })
        }
      } catch (e) {
        console.warn("[walletconnect] Disconnect cleanup warning:", e)
      }
      currentPublicKey = null
      currentSession = null
      resetWcState()
    },

    async isConnected() {
      if (!currentPublicKey || !currentSession) return false
      try {
        const client = await getOrInitSignClient()
        const sessions = client.session.getAll()
        const found = sessions.some((s: any) => s.topic === currentSession.topic)
        return found
      } catch {
        return false
      }
    },

    async signTransaction(xdr: string) {
      if (!currentPublicKey || !currentSession) {
        throw { code: "not_connected", message: "Not connected to WalletConnect", adapter: "walletconnect" }
      }
      const relay = getRelayMonitor()
      if (relay.isDownForSign) {
        throw { code: "relay_down", message: "Relay is down for signing", adapter: "walletconnect" }
      }

      try {
        const client = await getOrInitSignClient()
        const chainId = currentSession.namespaces?.stellar?.chains?.[0] || "stellar:testnet"
        
        const result = await client.request({
          chainId,
          request: {
            method: "stellar_signTransaction",
            params: { xdr, accountId: currentPublicKey },
          },
        })
        relay.recordOutcome("sign", true)
        return (result as any)?.signedXdr || (result as string)
      } catch (err: any) {
        relay.recordOutcome("sign", false)
        throw { code: "user_rejected", message: err?.message || "Signing rejected", adapter: "walletconnect" }
      }
    },

    async signMessage(message: string) {
      if (!currentPublicKey || !currentSession) {
        throw { code: "not_connected", message: "Not connected to WalletConnect", adapter: "walletconnect" }
      }
      try {
        const client = await getOrInitSignClient()
        const chainId = currentSession.namespaces?.stellar?.chains?.[0] || "stellar:testnet"
        
        const result = await client.request({
          chainId,
          request: {
            method: "stellar_signMessage",
            params: { message, accountId: currentPublicKey },
          },
        })
        return (result as any)?.signedMessage || (result as string)
      } catch (err: any) {
        throw { code: "user_rejected", message: err?.message || "Message signing rejected", adapter: "walletconnect" }
      }
    },

    async getPublicKey() {
      if (!currentPublicKey) {
        throw { code: "not_installed", message: "WalletConnect not connected", adapter: "walletconnect" }
      }
      return currentPublicKey
    },

    async getNetwork() {
      if (!currentSession) return "testnet"
      const chainId = currentSession.namespaces?.stellar?.chains?.[0] || ""
      return chainId.includes("public") ? "public" : "testnet"
    },
  }
}
