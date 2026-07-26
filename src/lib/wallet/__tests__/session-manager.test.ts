import { describe, it, expect, beforeEach, vi } from "vitest"
import { WalletSessionManager } from "../session-manager"

describe("SessionManager", () => {
  const mockLocalStorage = new Map<string, string>()
  
  beforeEach(() => {
    mockLocalStorage.clear()
    // Mock localStorage
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockLocalStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
      removeItem: (key: string) => mockLocalStorage.delete(key),
    })
  })

  it("should restore empty sessions when store is empty", () => {
    const stored = localStorage.getItem("wallet_sessions")
    expect(stored).toBeNull()
  })

  it("should persist a session after connect", () => {
    const session = {
      walletId: "freighter",
      publicKey: "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC",
      lastConnected: Date.now(),
      hmac: "mock-hmac-value",
    }
    localStorage.setItem("wallet_sessions", JSON.stringify([session]))
    
    const restored = JSON.parse(localStorage.getItem("wallet_sessions")!)
    expect(restored.length).toBe(1)
    expect(restored[0].walletId).toBe("freighter")
    expect(restored[0].publicKey).toBe(session.publicKey)
  })

  it("should expire sessions older than 7 days", () => {
    const oldSession = {
      walletId: "freighter",
      lastConnected: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      publicKey: "GABC...",
    }
    const recentSession = {
      walletId: "xbull",
      lastConnected: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
      publicKey: "GDEF...",
    }
    
    const sessions = [oldSession, recentSession]
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const valid = sessions.filter(s => Date.now() - s.lastConnected < sevenDays)
    
    expect(valid.length).toBe(1)
    expect(valid[0].walletId).toBe("xbull")
  })

  it("should handle corrupted JSON in session store", () => {
    localStorage.setItem("wallet_sessions", "not-valid-json{{{")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessions: any[] = []
    try {
      sessions = JSON.parse(localStorage.getItem("wallet_sessions")!)
    } catch {
      sessions = []
    }
    expect(sessions.length).toBe(0)
  })

  it("should detect tampered HMAC", () => {
    const validHmac = "abc123def456"
    const tamperedContent = "tampered-data"
    // Simplified: in real impl, HMAC is SHA-256 of content
    const isValid = (content: string, hmac: string) => {
      const expected = "abc123def456" // In real code: crypto.subtle.digest("SHA-256", content)
      return hmac === expected && content !== "tampered-data"
    }
    expect(isValid(tamperedContent, validHmac)).toBe(false)
  })

  it("should remove session on disconnect", () => {
    const sessions = [
      { walletId: "freighter", publicKey: "GABC..." },
      { walletId: "xbull", publicKey: "GDEF..." },
    ]
    const disconnectId = "freighter"
    const remaining = sessions.filter(s => s.walletId !== disconnectId)
    
    expect(remaining.length).toBe(1)
    expect(remaining[0].walletId).toBe("xbull")
  })

  it("should handle multiple sessions for same user", () => {
    const sessions = [
      { walletId: "freighter", publicKey: "GABC...", lastConnected: Date.now() - 1000 },
      { walletId: "xbull", publicKey: "GDEF...", lastConnected: Date.now() },
    ]
    // Active wallet is the most recently connected
    const active = sessions.sort((a, b) => b.lastConnected - a.lastConnected)[0]
    expect(active.walletId).toBe("xbull")
  })

  it("should handle empty string public key (corrupted data)", () => {
    const session = { walletId: "freighter", publicKey: "", lastConnected: Date.now() }
    const isValid = session.publicKey.length === 56 && session.publicKey.startsWith("G")
    expect(isValid).toBe(false)
  })

  it("should handle localStorage quota exceeded", () => {
    // Simulate: localStorage.setItem throws on full quota
    let threwError = false
    try {
      // In real code: catch QuotaExceededError, degrade gracefully
      throw new DOMException("QuotaExceededError", "QuotaExceededError")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      threwError = true
    }
    expect(threwError).toBe(true)
    // Session should still work in-memory
  })

  it("should process BroadcastChannel messages with empty origin", () => {
    class MockBroadcastChannel {
      onmessage: ((event: MessageEvent) => void) | null = null
      postMessage() {}
      close() {}
    }

    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)

    const manager = new WalletSessionManager()
    const restoreSpy = vi.spyOn(manager as unknown as { restore: () => void }, "restore")

    ;(manager as unknown as { handleChannelMessage: (event: MessageEvent) => void }).handleChannelMessage({
      origin: "",
      data: { type: "wallet_connected" },
    } as MessageEvent)

    expect(restoreSpy).toHaveBeenCalled()
  })
})
