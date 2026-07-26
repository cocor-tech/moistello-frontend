import type { WalletAdapter, WalletSession, EncryptedSessionStore, WalletId } from "./types"
import { computeHmacSha256 } from "./hmac"

const STORAGE_KEY = "moistello_wallet_sessions"
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000
const CHANNEL_NAME = "moistello-wallet"

export class WalletSessionManager {
  private sessions: WalletSession[] = []
  private activeWalletId: string | null = null
  private channel: BroadcastChannel | null = null

  constructor() {
    // SSR guard — no browser APIs available during server-side rendering
    if (typeof window === "undefined") return

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = event => this.handleChannelMessage(event)
    } else {
      this.setupStorageFallback()
    }
    this.restore()
  }

  async connect(adapter: WalletAdapter, publicKey: string): Promise<void> {
    const network = await adapter.getNetwork()
    const session: WalletSession = {
      walletId: adapter.meta.id,
      publicKey,
      lastConnected: Date.now(),
      network,
    }
    this.addOrUpdateSession(session)
    this.activeWalletId = adapter.meta.id
    this.persist()
    this.broadcast({
      type: "wallet_connected",
      walletId: adapter.meta.id,
      publicKey,
      lastConnected: Date.now(),
    })
  }

  disconnect(walletId: WalletId): void {
    this.sessions = this.sessions.filter(s => s.walletId !== walletId)
    if (this.activeWalletId === walletId) {
      this.activeWalletId = this.sessions.length > 0 ? this.sessions[0].walletId : null
    }
    this.persist()
    this.broadcast({ type: "wallet_disconnected", walletId })
  }

  switchTo(walletId: WalletId): void {
    const session = this.sessions.find(s => s.walletId === walletId)
    if (session) {
      this.activeWalletId = walletId
      this.broadcast({ type: "active_switched", walletId })
    }
  }

  getActive(): WalletSession | null {
    return this.sessions.find(s => s.walletId === this.activeWalletId) ?? null
  }

  getAll(): WalletSession[] {
    return [...this.sessions]
  }

  getCount(): number {
    return this.sessions.length
  }

  private addOrUpdateSession(session: WalletSession): void {
    const index = this.sessions.findIndex(s => s.walletId === session.walletId)
    if (index >= 0) {
      this.sessions[index] = session
    } else {
      this.sessions.push(session)
    }
  }

  private persist(): void {
    if (typeof window === "undefined") return
    try {
      const hmac = computeHmacSha256(JSON.stringify(this.sessions))
      const store: EncryptedSessionStore = {
        sessions: this.sessions,
        hmac,
        activeWalletId: this.activeWalletId,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        console.warn("[SessionManager] localStorage full — sessions not persisted")
        return
      }
      console.warn("[SessionManager] Failed to persist sessions:", e)
    }
  }

  private restore(): void {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const store: EncryptedSessionStore = JSON.parse(raw)
      if (!store.hmac || !store.sessions) return

      const expectedHMAC = computeHmacSha256(JSON.stringify(store.sessions))
      if (store.hmac !== expectedHMAC) {
        console.warn("[SessionManager] HMAC mismatch — session store may be tampered")
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      const now = Date.now()
      this.sessions = store.sessions.filter(s => now - s.lastConnected < SESSION_TTL)
      this.activeWalletId = store.activeWalletId
    } catch (e) {
      console.warn("[session-manager] Failed to restore sessions from storage:", e)
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  private broadcast(message: Record<string, unknown>): void {
    if (this.channel) {
      this.channel.postMessage(message)
    }
  }

  private handleChannelMessage(event: MessageEvent): void {
    if (event.origin && event.origin !== window.location.origin) return

    const { type } = event.data
    switch (type) {
      case "wallet_connected":
      case "wallet_disconnected":
      case "active_switched":
        this.restore()
        break
    }
  }

  private setupStorageFallback(): void {
    window.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY) {
        this.restore()
      }
    })
  }

  destroy(): void {
    if (typeof window === "undefined") return
    if (this.channel) {
      this.channel.close()
    }
    localStorage.removeItem(STORAGE_KEY)
  }
}

let _sessionManager: WalletSessionManager | null = null

export function getSessionManager(): WalletSessionManager {
  if (typeof window === "undefined") {
    return new Proxy({} as WalletSessionManager, {
      get() {
        return undefined
      },
    })
  }
  if (!_sessionManager) {
    _sessionManager = new WalletSessionManager()
  }
  return _sessionManager
}

export const sessionManager = new Proxy({} as WalletSessionManager, {
  get(_target, prop: string | symbol) {
    return (getSessionManager() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
