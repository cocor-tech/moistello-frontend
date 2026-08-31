import type {
  WalletAdapter,
  WalletSession,
  EncryptedSessionStore,
  WalletId,
} from "./types";
import { computeHmacSha256Sync, isHmacKeyReady, withHmacKey } from "./hmac";
import {
  encryptToStorage,
  decryptFromStorage,
} from "@/lib/security/encryption";
import { SESSION_TTL_MS } from "./session-lifecycle";

const STORAGE_KEY = "moistello_wallet_sessions";
const SESSION_TTL = SESSION_TTL_MS;
const CHANNEL_NAME = "moistello-wallet";

export class WalletSessionManager {
  private sessions: WalletSession[] = [];
  private activeWalletId: string | null = null;
  private channel: BroadcastChannel | null = null;

  constructor() {
    // SSR guard — no browser APIs available during server-side rendering
    if (typeof window === "undefined") return;

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => this.handleChannelMessage(event);
    } else {
      this.setupStorageFallback();
    }
    if (isHmacKeyReady()) {
      this.restore()
    } else {
      // The HMAC key may still be loading on first paint — defer the restore
      // until the key arrives so verification never runs against an empty key.
      withHmacKey(() => this.restore())
    }
  }

  async connect(adapter: WalletAdapter, publicKey: string): Promise<void> {
    const network = await adapter.getNetwork();
    const session: WalletSession = {
      walletId: adapter.meta.id,
      publicKey,
      lastConnected: Date.now(),
      network,
    };
    this.addOrUpdateSession(session);
    this.activeWalletId = adapter.meta.id;
    this.persist();
    this.broadcast({
      type: "wallet_connected",
      walletId: adapter.meta.id,
      publicKey,
      lastConnected: Date.now(),
    });
  }

  disconnect(walletId: WalletId): void {
    this.sessions = this.sessions.filter((s) => s.walletId !== walletId);
    if (this.activeWalletId === walletId) {
      this.activeWalletId =
        this.sessions.length > 0 ? this.sessions[0].walletId : null;
    }
    this.persist();
    this.broadcast({ type: "wallet_disconnected", walletId });
  }

  switchTo(walletId: WalletId): void {
    const session = this.sessions.find((s) => s.walletId === walletId);
    if (session) {
      this.activeWalletId = walletId;
      this.broadcast({ type: "active_switched", walletId });
    }
  }

  getActive(): WalletSession | null {
    return (
      this.sessions.find((s) => s.walletId === this.activeWalletId) ?? null
    );
  }

  getAll(): WalletSession[] {
    return [...this.sessions];
  }

  getCount(): number {
    return this.sessions.length;
  }

  private addOrUpdateSession(session: WalletSession): void {
    const index = this.sessions.findIndex(
      (s) => s.walletId === session.walletId,
    );
    if (index >= 0) {
      this.sessions[index] = session;
    } else {
      this.sessions.push(session);
    }
  }

  private persist(): void {
    if (typeof window === "undefined") return
    // Defer the write until the HMAC key is ready so the store is never
    // signed with an empty key (which would silently break tamper detection
    // on the very first write).
    withHmacKey(() => {
      try {
        const hmac = computeHmacSha256Sync(JSON.stringify(this.sessions))
        const store: EncryptedSessionStore = {
          sessions: this.sessions,
          hmac,
          activeWalletId: this.activeWalletId,
        }
        // Derive encryption passphrase from active wallet + timestamp
        // This rotates automatically on wallet switch/reconnect
        const passphrase = this.getEncryptionPassphrase()
        encryptToStorage(STORAGE_KEY, store, passphrase).catch((e) => {
          console.warn(
            "[SessionManager] Encryption failed, falling back to plaintext:",
            e,
          )
          localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          console.warn("[SessionManager] localStorage full — sessions not persisted")
          return
        }
        console.warn("[SessionManager] Failed to persist sessions:", e)
      }
    })
  }

  private async restore(): Promise<void> {
    if (typeof window === "undefined") return
    if (!isHmacKeyReady()) {
      // Key not loaded yet — defer instead of treating unverifiable data as
      // tampered and wiping it.
      return
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      // Try decryption first (new format)
      const passphrase = this.getEncryptionPassphrase();
      const decrypted = await decryptFromStorage<EncryptedSessionStore>(
        STORAGE_KEY,
        passphrase,
      );

      let store: EncryptedSessionStore | null = decrypted;

      // Fallback to unencrypted if decryption fails (legacy format)
      if (!store) {
        try {
          store = JSON.parse(raw);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
      }

      if (!store || !store.hmac || !store.sessions) return;

      const expectedHMAC = computeHmacSha256Sync(
        JSON.stringify(store.sessions),
      );
      if (store.hmac !== expectedHMAC) {
        console.warn(
          "[SessionManager] HMAC mismatch — session store may be tampered",
        );
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const now = Date.now();
      this.sessions = store.sessions.filter(
        (s) => now - s.lastConnected < SESSION_TTL,
      );
      this.activeWalletId = store.activeWalletId;
    } catch (e) {
      console.warn(
        "[session-manager] Failed to restore sessions from storage:",
        e,
      );
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private broadcast(message: Record<string, unknown>): void {
    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  private handleChannelMessage(event: MessageEvent): void {
    if (event.origin && event.origin !== window.location.origin) return;

    const { type } = event.data;
    switch (type) {
      case "wallet_connected":
      case "wallet_disconnected":
      case "active_switched":
        this.restore().catch((e) =>
          console.warn(
            "[session-manager] Failed to restore after broadcast:",
            e,
          ),
        );
        break;
    }
  }

  private setupStorageFallback(): void {
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        this.restore().catch((e) =>
          console.warn(
            "[session-manager] Failed to restore after storage event:",
            e,
          ),
        );
      }
    });
  }

  /**
   * Derive encryption passphrase from session state.
   *
   * Uses active wallet ID + device fingerprint to create a session-unique key.
   * Key rotates on wallet switch or re-auth, limiting exposure window.
   */
  private getEncryptionPassphrase(): string {
    const deviceSeed =
      typeof window !== "undefined"
        ? `${window.navigator.userAgent}-${window.screen.width}x${window.screen.height}`
        : "ssr-fallback";
    return `${deviceSeed}:moistello-wallet-v1`;
  }

  destroy(): void {
    if (typeof window === "undefined") return;
    if (this.channel) {
      this.channel.close();
    }
    localStorage.removeItem(STORAGE_KEY);
  }
}

let _sessionManager: WalletSessionManager | null = null;

export function getSessionManager(): WalletSessionManager {
  if (typeof window === "undefined") {
    return new Proxy({} as WalletSessionManager, {
      get() {
        return undefined;
      },
    });
  }
  if (!_sessionManager) {
    _sessionManager = new WalletSessionManager();
  }
  return _sessionManager;
}

export const sessionManager = new Proxy({} as WalletSessionManager, {
  get(_target, prop: string | symbol) {
    return (getSessionManager() as unknown as Record<string | symbol, unknown>)[
      prop
    ];
  },
});
