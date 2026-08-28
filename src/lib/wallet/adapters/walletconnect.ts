import type { WalletAdapter, WalletMeta, NetworkType, SignOptions } from "../types"
import { getRelayMonitor, type RelayStatus } from "../wc2-relay"
import { getWC2SessionStore } from "../wc2-session-store"
import { getSignClientClass } from "../wc2-sign-client"
import { WC2_QR_EXPIRATION_MS } from "@/lib/constants"

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""
const RELAY_URL = "wss://relay.walletconnect.com"
const METADATA = {
  name: "Moistello",
  description: "Decentralized savings circles on Stellar",
  url: "https://moistello.com",
  icons: ["https://moistello.com/logo.jpg"],
}

const SIGN_TIMEOUT = 60_000
const CONNECT_TIMEOUT = WC2_QR_EXPIRATION_MS
const CONNECT_INIT_TIMEOUT = 60_000

let _onPairingUri: ((uri: string) => void) | null = null
let _onRelayStatusChange: ((status: RelayStatus) => void) | null = null
let _sessionProposalHandler: ((...args: unknown[]) => void) | null = null
let _sessionDeleteHandler: ((...args: unknown[]) => void) | null = null
let _wcConnectCancelled = false
let _pendingSetSettled: (() => void) | null = null
let _pendingReject: ((reason: unknown) => void) | null = null

export function setOnPairingUri(handler: ((uri: string) => void) | null): void {
  _onPairingUri = handler
}

export function getOnPairingUri(): ((uri: string) => void) | null {
  return _onPairingUri
}

export function setOnRelayStatusChange(handler: ((status: RelayStatus) => void) | null): void {
  _onRelayStatusChange = handler
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function isValidStellarPublicKey(key: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(key)
}

function isXDRValid(xdr: string): boolean {
  return typeof xdr === "string" && xdr.length > 20 && /^[A-Za-z0-9+/=]+$/.test(xdr)
}

function createTimeoutError(adapter: string, ms: number) {
  return {
    adapter,
    code: "timeout" as const,
    message: `Request timed out after ${ms / 1000}s. Check your wallet and try again.`,
  }
}

function createNotConnectedError(adapter: string) {
  return {
    adapter,
    code: "not_installed" as const,
    message: "WalletConnect is not connected. Please connect your wallet first.",
  }
}

function createRelayDownError(adapter: string) {
  return {
    adapter,
    code: "internal" as const,
    message: "WalletConnect relay is unreachable. Try again later or use an extension wallet.",
    cause: "Relay status: down",
  }
}

function createRejectedError(adapter: string) {
  return {
    adapter,
    code: "user_rejected" as const,
    message: "Connection rejected. Please approve the connection request in your wallet.",
  }
}

function createNetworkMismatchError(adapter: string, chain: string, network: string) {
  return {
    adapter,
    code: "network_mismatch" as const,
    message: `Wallet is on ${chain} but expected ${network}`,
    expected: network,
    actual: chain,
  }
}

function createInternalError(adapter: string, message: string, cause?: string) {
  return {
    adapter,
    code: "internal" as const,
    message,
    ...(cause ? { cause } : {}),
  }
}

function chainIdForNetwork(network: NetworkType): string {
  return network === "mainnet" ? "stellar:pubnet" : "stellar:testnet"
}

function networkFromChainId(chainId: string): NetworkType {
  return chainId === "stellar:pubnet" ? "mainnet" : "testnet"
}

let connectedPublicKey: string | null = null
let connectedNetwork: NetworkType = "testnet"
let sessionTopic: string | null = null
let wcSignClient: unknown = null

export function createWalletConnectAdapter(): WalletAdapter {
  const meta: WalletMeta = {
    id: "walletconnect",
    name: "WalletConnect",
    category: "mobile",
    icon: "walletconnect-icon",
    installUrl: "",
    description: "Lobstr, Coinbase Wallet, Trust Wallet, MetaMask & 200+ more",
    priority: 0,
    isAvailable: () => isBrowser(),
  }

  async function getOrInitSignClient(): Promise<unknown> {
    if (wcSignClient) return wcSignClient

    const SignClient = await getSignClientClass()
    const initStart = performance.now()
    wcSignClient = await SignClient.init({
      projectId: PROJECT_ID || undefined,
      relayUrl: RELAY_URL,
      metadata: METADATA,
    })
    getRelayMonitor().recordOutcome(true, performance.now() - initStart)

    const stored = getWC2SessionStore().getSession()
    if (stored) {
      try {
        const signClient = wcSignClient as {
          session: { getAll: () => Array<{ topic: string }> }
        }
        const sessions = signClient.session.getAll()
        const matchingSession = sessions.find((s) => s.topic === stored.pairingTopic)
        if (!matchingSession) {
          getWC2SessionStore().clear()
          connectedPublicKey = null
          sessionTopic = null
        } else {
          connectedPublicKey = stored.publicKey
          connectedNetwork = stored.network
          sessionTopic = stored.pairingTopic
        }
      } catch (e) {
        console.warn("[wc] Failed to restore session, clearing store:", e)
        getWC2SessionStore().clear()
      }
    }

    return wcSignClient
  }

  async function sendSignRequest(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const relay = getRelayMonitor()
    const startTime = performance.now()

    if (!wcSignClient) {
      throw createNotConnectedError("walletconnect")
    }
    if (relay.isDownForSign) {
      throw createRelayDownError("walletconnect")
    }

    const signClient = wcSignClient as {
      request: (opts: {
        topic: string
        chainId: string
        request: { method: string; params: Record<string, unknown> }
      }) => Promise<unknown>
    }

    const requestPromise = signClient.request({
      topic: sessionTopic!,
      chainId: chainIdForNetwork(connectedNetwork),
      request: { method, params },
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        relay.recordOutcome(false, performance.now() - startTime)
        reject(createTimeoutError("walletconnect", SIGN_TIMEOUT))
      }, SIGN_TIMEOUT)
    })

    try {
      const result = (await Promise.race([requestPromise, timeoutPromise])) as Record<string, unknown>
      relay.recordOutcome(true, performance.now() - startTime)
      return result
    } catch (err: unknown) {
      relay.recordOutcome(false, performance.now() - startTime)
      const wcError = err as { code?: number; message?: string }
      if (wcError?.code === 5000 || wcError?.message?.includes("rejected")) {
        throw createRejectedError("walletconnect")
      }
      throw err
    }
  }

  function createSessionHandler(
    signClient: {
      on: (event: string, handler: (...args: unknown[]) => void) => void
      off?: (event: string, handler: (...args: unknown[]) => void) => void
      approve: (opts: Record<string, unknown>) => Promise<unknown>
      session: { getAll: () => Array<{ topic: string; namespaces: Record<string, unknown> }> }
    },
    resolve: (value: { publicKey: string }) => void,
    reject: (reason: unknown) => void,
    getSettled: () => boolean,
    setSettled: () => void,
    startTime: number,
  ) {
    if (_sessionProposalHandler) {
      try { signClient.off?.("session_proposal", _sessionProposalHandler) } catch (e) { console.warn("[wc] Failed to remove session_proposal handler:", e) }
    }
    if (_sessionDeleteHandler) {
      try { signClient.off?.("session_delete", _sessionDeleteHandler) } catch (e) { console.warn("[wc] Failed to remove session_delete handler:", e) }
    }

    _sessionProposalHandler = async (proposal: unknown) => {
      if (getSettled() || _wcConnectCancelled) return

      try {
        const prop = proposal as {
          id: number
          params: { requiredNamespaces: Record<string, unknown>; relays: Array<{ protocol: string }> }
        }
        const { id, params } = prop
        const { requiredNamespaces, relays } = params

        const namespaces: Record<string, Record<string, unknown>> = {}
        for (const [key, ns] of Object.entries(requiredNamespaces || {})) {
          const nsObj = ns as { chains?: string[]; methods?: string[]; events?: string[] }
          namespaces[key] = {
            ...nsObj,
          }
        }

        await signClient.approve({
          id,
          relayProtocol: relays?.[0]?.protocol ?? "irn",
          namespaces,
        })

        const sessions = signClient.session.getAll()
        const sessionsList = sessions as Array<{
          topic: string
          namespaces: Record<string, { accounts: string[] }>
        }>
        const session = sessionsList.length > 0 ? sessionsList[sessionsList.length - 1] : null

        if (!session) {
          setSettled()
          reject(createInternalError("walletconnect", "Session not found after approval", "No active session"))
          return
        }

        sessionTopic = session.topic

        const ns = session.namespaces?.stellar
        if (ns?.accounts?.length > 0) {
          const account = ns.accounts[0]
          const pubKey = account.split(":")[2]
          if (pubKey && isValidStellarPublicKey(pubKey)) {
            connectedPublicKey = pubKey
            connectedNetwork = networkFromChainId(account.split(":")[1])
            setSettled()
            const relay = getRelayMonitor()
            relay.recordOutcome(true, performance.now() - startTime)
            wcSignClient = signClient
            getWC2SessionStore().saveSession({
              pairingTopic: session.topic,
              publicKey: pubKey,
              network: connectedNetwork,
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            })
            resolve({ publicKey: pubKey })
            return
          }
        }

        setSettled()
        reject(
          createInternalError("walletconnect", "Could not extract public key from session", "No stellar account in namespace"),
        )
      } catch (err: unknown) {
        if (!getSettled()) {
          setSettled()
          reject(
            createInternalError("walletconnect", "Session proposal handling failed", String(err)),
          )
        }
      }
    }

    signClient.on("session_proposal", _sessionProposalHandler)

    _sessionDeleteHandler = () => {
      connectedPublicKey = null
      sessionTopic = null
      wcSignClient = null
      getWC2SessionStore().clear()
    }
    signClient.on("session_delete", _sessionDeleteHandler)
  }

  return {
    meta,

    async connect(): Promise<{ publicKey: string }> {
      _wcConnectCancelled = false
      _pendingSetSettled = null
      _pendingReject = null

      const relay = getRelayMonitor()
      if (_onRelayStatusChange) _onRelayStatusChange(relay.status)

      const startTime = performance.now()
      const signClient = await getOrInitSignClient()

      let settled = false
      const getSettled = () => settled
      const setSettled = () => { settled = true }

      return new Promise<{ publicKey: string }>((resolve, reject) => {
        _pendingSetSettled = setSettled
        _pendingReject = reject

        createSessionHandler(
          signClient as {
            on: (event: string, handler: (...args: unknown[]) => void) => void
            off?: (event: string, handler: (...args: unknown[]) => void) => void
            approve: (opts: Record<string, unknown>) => Promise<unknown>
            session: { getAll: () => Array<{ topic: string; namespaces: Record<string, unknown> }> }
          },
          resolve,
          reject,
          getSettled,
          setSettled,
          startTime,
        )

        const initConnect = async () => {
          try {
            const result = await Promise.race([
              (signClient as { connect: (opts: Record<string, unknown>) => Promise<{ uri?: string }> }).connect({
                requiredNamespaces: {
                  stellar: {
                    methods: ["stellar_signAndSubmitXDR", "stellar_signXDR"],
                    chains: ["stellar:testnet", "stellar:pubnet"],
                    events: [],
                  },
                },
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(createTimeoutError("walletconnect", CONNECT_INIT_TIMEOUT)), CONNECT_INIT_TIMEOUT)
              ),
            ])

            if (_wcConnectCancelled) return

            const { uri } = result as { uri?: string }

            if (!uri) {
              if (!getSettled()) {
                setSettled()
                relay.recordOutcome(false, performance.now() - startTime)
                reject(createInternalError("walletconnect", "No pairing URI returned from WalletConnect"))
              }
              return
            }

            relay.recordOutcome(true, performance.now() - startTime)

            if (_wcConnectCancelled) return

            if (_onPairingUri) {
              _onPairingUri(uri)
            }
          } catch (err) {
            if (!getSettled() && !_wcConnectCancelled) {
              setSettled()
              relay.recordOutcome(false, performance.now() - startTime)
              reject(err)
            }
          }
        }

        initConnect()

        setTimeout(() => {
          if (!getSettled() && !_wcConnectCancelled) {
            setSettled()
            relay.recordOutcome(false, performance.now() - startTime)
            reject(createTimeoutError("walletconnect", CONNECT_TIMEOUT))
          }
        }, CONNECT_TIMEOUT)
      })
    },

    async disconnect(): Promise<void> {
      const sc = wcSignClient as { disconnect?: (opts: { topic: string }) => Promise<void> } | null
      if (sc?.disconnect && sessionTopic) {
        try {
          await sc.disconnect({ topic: sessionTopic })
        } catch (e) {
          console.warn("[wc] Best-effort disconnect failed:", e)
        }
      }
      resetWcState()
    },

    async isConnected(): Promise<boolean> {
      return connectedPublicKey !== null && sessionTopic !== null
    },

    async getPublicKey(): Promise<string> {
      if (!connectedPublicKey) {
        throw createNotConnectedError("walletconnect")
      }
      return connectedPublicKey
    },

    async signMessage(message: string): Promise<{ signature: string; publicKey: string }> {
      if (!connectedPublicKey) {
        throw createNotConnectedError("walletconnect")
      }
      if (!sessionTopic || !wcSignClient) {
        throw createNotConnectedError("walletconnect")
      }

      const relay = getRelayMonitor()
      if (relay.isDownForSign) {
        throw createRelayDownError("walletconnect")
      }

      const { xdr } = await createAuthXDR(message)
      const result = await this.signTransaction(xdr, { network: connectedNetwork })

      return { signature: result.signedXdr, publicKey: connectedPublicKey }
    },

    async signTransaction(xdr: string, opts?: SignOptions): Promise<{ signedXdr: string }> {
      if (!connectedPublicKey) {
        throw createNotConnectedError("walletconnect")
      }
      if (!sessionTopic || !wcSignClient) {
        throw createNotConnectedError("walletconnect")
      }

      if (!isXDRValid(xdr)) {
        throw createInternalError("walletconnect", "Invalid XDR format", "XDR must be a base64 string")
      }

      const relay = getRelayMonitor()
      if (relay.isDownForSign) {
        throw createRelayDownError("walletconnect")
      }

      if (opts?.network && opts.network !== connectedNetwork) {
        throw createNetworkMismatchError("walletconnect", opts.network, connectedNetwork)
      }

      const result = await sendSignRequest("stellar_signXDR", { xdr })

      const signedXdr = result?.signedXdr as string | undefined
      if (!signedXdr) {
        throw createInternalError("walletconnect", "Wallet returned empty response", "No signedXdr in response")
      }

      if (!isXDRValid(signedXdr)) {
        throw createInternalError("walletconnect", "Wallet returned invalid signed XDR", "signedXdr failed format validation")
      }

      if (signedXdr === xdr) {
        throw createInternalError("walletconnect", "Wallet returned unsigned XDR", "signedXdr matches original xdr")
      }

      return { signedXdr }
    },

    async getNetwork(): Promise<NetworkType> {
      return connectedNetwork
    },
  }
}

async function createAuthXDR(message: string): Promise<{ xdr: string; hash: string }> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`moistello-auth:${message}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  const xdr = btoa(`MOISTELLO_AUTH:${hash}:${Date.now()}`)
  return { xdr, hash }
}

export function cleanupWcOverlays(): void {
  if (typeof document === "undefined") return

  document.querySelectorAll(
    'wcm-modal, ' +
    '[data-walletconnect-modal], ' +
    '[data-wcm-modal], ' +
    'iframe[src*="walletconnect"], ' +
    'iframe[src*="wc.dialog"], ' +
    'iframe[src*="reown"], ' +
    '.walletconnect-modal__base, ' +
    '.walletconnect-qrcode__backdrop, ' +
    '[class*="wcm-backdrop"], ' +
    '[class*="walletconnect-modal"]'
  ).forEach((el) => {
    try { el.remove() } catch (e) { console.warn("[wc] Failed to remove overlay element:", e) }
  })

  const bodyEl = document.body
  if (bodyEl.style.overflow === "hidden") {
    bodyEl.style.overflow = ""
  }
  if (bodyEl.style.position === "fixed" && bodyEl.hasAttribute("data-scroll-top")) {
    const savedTop = bodyEl.getAttribute("data-scroll-top")
    bodyEl.style.position = ""
    bodyEl.style.top = ""
    bodyEl.style.width = ""
    if (savedTop) window.scrollTo(0, parseInt(savedTop, 10))
    bodyEl.removeAttribute("data-scroll-top")
  }
}

export function resetWcState(): void {
  _wcConnectCancelled = true
  if (_pendingSetSettled) {
    try { _pendingSetSettled() } catch (e) { console.warn("[wc] Failed to settle pending promise:", e) }
  }
  if (_pendingReject) {
    try { _pendingReject(createInternalError("walletconnect", "Connection cancelled by user")) } catch (e) { console.warn("[wc] Failed to reject pending promise:", e) }
  }
  _pendingSetSettled = null
  _pendingReject = null
  connectedPublicKey = null
  connectedNetwork = "testnet"
  sessionTopic = null
  wcSignClient = null
  _sessionProposalHandler = null
  _sessionDeleteHandler = null
  getRelayMonitor().reset()
  cleanupWcOverlays()
  getWC2SessionStore().clear()
  clearWcIndexedDB()
}

export async function clearWcIndexedDB(): Promise<void> {
  if (typeof indexedDB === "undefined") return
  try {
    const dbs = await indexedDB.databases()
    for (const db of dbs) {
      if (db.name?.startsWith("wc@2:")) {
        try { indexedDB.deleteDatabase(db.name) } catch (e) { console.warn("[wc] Failed to delete IndexedDB:", e) }
      }
    }
  } catch {
    // indexedDB.databases() not available in older browsers —
    // delete the known WalletConnect databases by name
    const knownNames = ["wc@2:client:0.3", "wc@2:core:0.3"]
    for (const name of knownNames) {
      try { indexedDB.deleteDatabase(name) } catch (e) { console.warn("[wc] Failed to delete known IndexedDB:", e) }
    }
  }
}

export async function disconnectWc(): Promise<void> {
  const sc = wcSignClient as { disconnect?: (opts: { topic: string }) => Promise<void> } | null
  if (sc?.disconnect && sessionTopic) {
    try {
      await sc.disconnect({ topic: sessionTopic })
    } catch (e) {
      console.warn("[wc] Best-effort disconnect failed (session may be expired):", e)
    }
  }
  resetWcState()
}
