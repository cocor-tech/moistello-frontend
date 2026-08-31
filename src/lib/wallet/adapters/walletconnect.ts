/**
 * WalletConnect v2 adapter for Stellar wallets.
 *
 * ## Singleton vs per-connect state
 *
 * The SignClient SDK is expensive to initialise (opens a WebSocket to the
 * relay) and the upstream library itself is not designed to be multi-instance,
 * so the SignClient instance and its initialisation promise are intentionally
 * module-level singletons.
 *
 * All *pairing* state — the URI that is shown to the user, the current
 * pairing phase, and any error — lives inside each `connectContext` object
 * that is created at the start of every `connect()` call. This means:
 *
 *  - Two concurrent connect() calls each get their own mutable context; they
 *    cannot stomp on each other.
 *  - When a new connect() is attempted while one is already in flight, the
 *    old one is signalled to abort via its AbortSignal and its context is
 *    discarded. "Latest wins" semantics.
 *  - When the component that triggered a connect unmounts, it can call
 *    `abortConnect()` to clean up without touching unrelated state.
 *
 * ## resetWcState scope
 *
 * `resetWcState()` only clears the *current* pending context and aborts it.
 * It does NOT clear all wc@2:* IndexedDB stores app-wide, which would be
 * destructive to unrelated sessions.
 */

import { WalletAdapter, WalletAdapterMeta, ConnectOptions } from "../types"
import { getRelayMonitor } from "../wc2-relay"
import { getWC2SessionStore } from "../wc2-session-store"
import { validateStellarAddress } from "@/lib/stellar/validate-address"

// ---------------------------------------------------------------------------
// Module-level singletons (intentional — one client, one WebSocket)
// ---------------------------------------------------------------------------

let signClientInstance: any = null
let initPromise: Promise<any> | null = null

async function getOrInitSignClient(): Promise<any> {
  if (signClientInstance) return signClientInstance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const { SignClient } = await import("@walletconnect/sign-client")
    const projectId =
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id"

    signClientInstance = await SignClient.init({
      projectId,
      relayUrl: "wss://relay.walletconnect.com",
      metadata: {
        name: "Moistello",
        description: "Decentralized ROSCA platform on Stellar",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://moistello.com",
        icons: ["https://moistello.com/icon.png"],
      },
    })
    return signClientInstance
  })()

  return initPromise
}

// ---------------------------------------------------------------------------
// Per-connect context
// ---------------------------------------------------------------------------

export interface PairingContext {
  /** The WalletConnect pairing URI shown to the user (QR / deeplink). */
  uri: string | null
  /** Current phase of the pairing handshake. */
  state: "idle" | "pairing" | "awaiting_approval" | "approved" | "rejected"
  /** Human-readable error, if any. */
  error: string | null
  /** AbortController so callers can cancel an in-flight connect. */
  abortController: AbortController
}

/**
 * The most-recently started connect() context.
 * Only one active pairing is supported at a time; starting a new one cancels
 * the previous one ("latest wins").
 */
let _currentContext: PairingContext | null = null

/** Listener that the wallet-selector component registers to observe changes. */
let _onContextChange: ((ctx: PairingContext | null) => void) | null = null

function notifyContextChange(): void {
  _onContextChange?.(_currentContext)
}

function createContext(): PairingContext {
  return {
    uri: null,
    state: "idle",
    error: null,
    abortController: new AbortController(),
  }
}

// ---------------------------------------------------------------------------
// Public API consumed by the wallet-selector UI layer
// ---------------------------------------------------------------------------

/**
 * Register a callback that is invoked whenever the active pairing context
 * changes. Pass `null` to unsubscribe. Called immediately with the current
 * context on registration.
 */
export function onPairingContextChange(
  cb: ((ctx: PairingContext | null) => void) | null
): void {
  _onContextChange = cb
  if (cb) cb(_currentContext)
}

/**
 * Abort the currently pending connect attempt and clear the context.
 * Safe to call when a component unmounts mid-pairing.
 * Does NOT close the SignClient or clear IndexedDB stores.
 */
export function abortConnect(): void {
  if (_currentContext) {
    _currentContext.abortController.abort()
    _currentContext = null
    notifyContextChange()
  }
}

/**
 * Reset only the in-memory pairing state for the active context.
 * Equivalent to `abortConnect()` — exported under the legacy name so existing
 * call-sites don't break.
 *
 * Scoped to the owning connect attempt; does **not** touch any wc@2:*
 * IndexedDB stores or other sessions.
 */
export function resetWcState(): void {
  abortConnect()
}

/**
 * Legacy adapter for the wallet-selector component.
 * The component can subscribe to pairing URI events by passing a function:
 *   setOnPairingUri((uri) => updateMyStore(uri))
 * Pass `null` to unsubscribe.
 *
 * In the new architecture this is a thin shim over `onPairingContextChange`.
 */
export function setOnPairingUri(
  uriOrHandler: string | ((uri: string) => void) | null
): void {
  if (typeof uriOrHandler === "function") {
    // Caller is registering a URI listener (the new contract).
    const handler = uriOrHandler
    onPairingContextChange((ctx) => {
      if (ctx?.uri) handler(ctx.uri)
    })
  } else {
    // Caller is passing null to unsubscribe.
    onPairingContextChange(null)
  }
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

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
    description:
      "Connect with Lobstr, xBull, and 200+ mobile Stellar wallets",
    icon: "/icons/walletconnect.svg",
    isAvailable: () => typeof window !== "undefined",
  }

  return {
    meta,

    // Expose per-context state via the current context (backward-compat getters).
    getPairingUri: () => _currentContext?.uri ?? null,
    getPairingState: () => _currentContext?.state ?? "idle",
    getPairingError: () => _currentContext?.error ?? null,

    async connect(options?: ConnectOptions) {
      const relay = getRelayMonitor()
      if (relay.isDownForConnect) {
        const err = new Error(
          "WalletConnect relay is temporarily unavailable. Please try another wallet."
        )
        ;(err as any).code = "relay_down"
        throw err
      }

      // ── Cancel any previous in-flight connect (latest-wins) ──────────────
      if (_currentContext) {
        _currentContext.abortController.abort()
      }

      const ctx: PairingContext = createContext()
      _currentContext = ctx
      ctx.state = "pairing"
      notifyContextChange()

      try {
        const client = await getOrInitSignClient()

        // ── Bail if aborted while initialising the client ─────────────────
        if (ctx.abortController.signal.aborted) {
          throw Object.assign(new Error("Connect aborted"), { code: "user_rejected" })
        }

        // ── Reuse existing live session ───────────────────────────────────
        const sessions = client.session.getAll()
        if (sessions.length > 0) {
          const active = sessions[sessions.length - 1]
          const accounts = active.namespaces?.stellar?.accounts || []
          if (accounts.length > 0) {
            const [, network, address] = accounts[0].split(":")
            if (address && validateStellarAddress(address)) {
              currentPublicKey = address
              currentSession = active
              ctx.state = "approved"
              _currentContext = null
              notifyContextChange()
              relay.recordOutcome("connect", true)
              return {
                publicKey: address,
                network: network === "stellar:testnet" ? "testnet" : "public",
              }
            }
          }
        }

        // ── Initiate new pairing ──────────────────────────────────────────
        const { uri, approval } = await client.connect({
          requiredNamespaces: {
            stellar: {
              methods: [
                "stellar_signTransaction",
                "stellar_signMessage",
              ],
              chains: [
                options?.network === "public"
                  ? "stellar:public"
                  : "stellar:testnet",
              ],
              events: ["session_event", "session_delete"],
            },
          },
        })

        if (ctx.abortController.signal.aborted) {
          throw Object.assign(new Error("Connect aborted"), { code: "user_rejected" })
        }

        if (!uri) {
          throw Object.assign(
            new Error("WalletConnect did not return a pairing URI"),
            { code: "internal" }
          )
        }

        ctx.uri = uri
        ctx.state = "awaiting_approval"
        notifyContextChange()
        options?.onUri?.(uri)

        // ── Race approval against abort ───────────────────────────────────
        const session = await Promise.race([
          approval(),
          new Promise<never>((_, reject) => {
            ctx.abortController.signal.addEventListener("abort", () => {
              reject(
                Object.assign(new Error("Connect aborted"), {
                  code: "user_rejected",
                })
              )
            })
          }),
        ])

        ctx.uri = null
        ctx.state = "approved"
        _currentContext = null
        notifyContextChange()

        const accounts = session.namespaces?.stellar?.accounts || []
        if (accounts.length === 0) {
          throw new Error(
            "No Stellar accounts found in WalletConnect session"
          )
        }

        const [, network, address] = accounts[0].split(":")
        if (!address || !validateStellarAddress(address)) {
          throw new Error(
            "Invalid Stellar address returned from WalletConnect session"
          )
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
        // Only update ctx if it is still the active one (another connect may
        // have already replaced it).
        if (_currentContext === ctx) {
          ctx.uri = null
          ctx.state = "rejected"
          ctx.error = err?.message || "Connection failed"
          _currentContext = null
          notifyContextChange()
        }
        relay.recordOutcome("connect", false)
        throw {
          code: err?.code ?? "user_rejected",
          message: err?.message || "Connection rejected",
          adapter: "walletconnect",
        }
      }
    },

    async disconnect() {
      // Cancel any pending connect for this adapter instance.
      abortConnect()

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

      // Clear persisted session without nuking all IndexedDB stores.
      getWC2SessionStore().clear()
    },

    async isConnected() {
      if (!currentPublicKey || !currentSession) return false
      try {
        const client = await getOrInitSignClient()
        const sessions = client.session.getAll()
        return sessions.some((s: any) => s.topic === currentSession.topic)
      } catch {
        return false
      }
    },

    async signTransaction(xdr: string) {
      if (!currentPublicKey || !currentSession) {
        throw {
          code: "not_connected",
          message: "Not connected to WalletConnect",
          adapter: "walletconnect",
        }
      }
      const relay = getRelayMonitor()
      if (relay.isDownForSign) {
        throw {
          code: "relay_down",
          message: "Relay is down for signing",
          adapter: "walletconnect",
        }
      }

      try {
        const client = await getOrInitSignClient()
        const chainId =
          currentSession.namespaces?.stellar?.chains?.[0] || "stellar:testnet"

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
        throw {
          code: "user_rejected",
          message: err?.message || "Signing rejected",
          adapter: "walletconnect",
        }
      }
    },

    async signMessage(message: string) {
      if (!currentPublicKey || !currentSession) {
        throw {
          code: "not_installed",
          message: "WalletConnect not connected",
          adapter: "walletconnect",
        }
      }
      try {
        const client = await getOrInitSignClient()
        const chainId =
          currentSession.namespaces?.stellar?.chains?.[0] || "stellar:testnet"

        const result = await client.request({
          chainId,
          request: {
            method: "stellar_signMessage",
            params: { message, accountId: currentPublicKey },
          },
        })
        return (result as any)?.signedMessage || (result as string)
      } catch (err: any) {
        throw {
          code: "user_rejected",
          message: err?.message || "Message signing rejected",
          adapter: "walletconnect",
        }
      }
    },

    async getPublicKey() {
      if (!currentPublicKey) {
        throw {
          code: "not_installed",
          message: "WalletConnect not connected",
          adapter: "walletconnect",
        }
      }
      return currentPublicKey
    },

    async getNetwork() {
      if (!currentSession) return "testnet"
      const chainId =
        currentSession.namespaces?.stellar?.chains?.[0] || ""
      return chainId.includes("public") ? "public" : "testnet"
    },
  }
}
