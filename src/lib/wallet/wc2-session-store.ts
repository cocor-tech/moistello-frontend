import type { NetworkType } from "./types"
import { computeHmacSha256Sync, isHmacKeyReady, withHmacKey } from "./hmac"
import { SESSION_TTL_MS } from "./session-lifecycle"

const STORAGE_KEY = "moistello_wc2_session"
const SESSION_TTL = SESSION_TTL_MS

interface WC2SessionData {
  pairingTopic: string
  publicKey: string
  network: NetworkType
  createdAt: number
  expiresAt: number
}

interface StoredPayload {
  data: WC2SessionData
  hmac: string
}

function computeHMAC(data: WC2SessionData): string {
  const input = `${data.pairingTopic}|${data.publicKey}|${data.network}|${data.createdAt}|${data.expiresAt}`
  return computeHmacSha256Sync(input)
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export class WC2SessionStore {
  private _getStorage(): Storage | null {
    if (!isBrowser()) return null
    return localStorage
  }

  getSession(): WC2SessionData | null {
    const storage = this._getStorage()
    if (!storage) return null

    // If the HMAC key is not loaded yet we cannot verify the payload. Defer
    // (return null) instead of treating it as tampered and clearing it.
    if (!isHmacKeyReady()) return null

    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return null

      const payload: StoredPayload = JSON.parse(raw)
      if (!payload.data || payload.hmac === undefined || payload.hmac === null) return null

      const expectedHMAC = computeHMAC(payload.data)
      if (payload.hmac !== expectedHMAC) {
        this.clear()
        return null
      }

      if (Date.now() > payload.data.expiresAt) {
        this.clear()
        return null
      }

      return payload.data
    } catch (e) {
      console.warn("[wc-session-store] Failed to read session, clearing:", e)
      this.clear()
      return null
    }
  }

  saveSession(data: WC2SessionData): void {
    const storage = this._getStorage()
    if (!storage) return

    // Defer the write until the HMAC key is ready — saving with an empty key
    // would silently break tamper detection for this session.
    withHmacKey(() => {
      try {
        const payload: StoredPayload = {
          data: {
            ...data,
            createdAt: data.createdAt || Date.now(),
            expiresAt: data.expiresAt || Date.now() + SESSION_TTL,
          },
          hmac: "",
        }
        payload.hmac = computeHMAC(payload.data)
        storage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch {
        console.warn("[WC2SessionStore] Failed to save session")
      }
    })
  }

  clear(): void {
    const storage = this._getStorage()
    if (!storage) return
    try {
      storage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn("[wc-session-store] Failed to clear session:", e)
    }
  }
}

let _sessionStore: WC2SessionStore | null = null

export function getWC2SessionStore(): WC2SessionStore {
  if (!_sessionStore) {
    _sessionStore = new WC2SessionStore()
  }
  return _sessionStore
}
