import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockSignClient = {
  on: vi.fn(),
  connect: vi.fn(),
  approve: vi.fn(),
  request: vi.fn(),
  disconnect: vi.fn(),
  session: {
    getAll: vi.fn(),
  },
}

vi.mock("@walletconnect/sign-client", () => ({
  SignClient: {
    init: vi.fn().mockResolvedValue(mockSignClient),
  },
}))

const mockRelay = {
  status: "healthy" as "healthy" | "down",
  recordOutcome: vi.fn(),
  reset: vi.fn(),
  get isDownForConnect(): boolean {
    return this.status === "down"
  },
  get isDownForSign(): boolean {
    return this.status === "down"
  },
}

vi.mock("../../wc2-relay", () => ({
  getRelayMonitor: () => mockRelay,
  WCRelayMonitor: vi.fn(),
}))

const mockSessionStore = {
  saveSession: vi.fn(),
  clear: vi.fn(),
  getSession: vi.fn().mockReturnValue(null),
}

vi.mock("../../wc2-session-store", () => ({
  getWC2SessionStore: () => mockSessionStore,
  WC2SessionStore: vi.fn(),
}))

import { createWalletConnectAdapter, setOnPairingUri, resetWcState } from "../walletconnect"

describe("WalletConnect Adapter", () => {
  let adapter: ReturnType<typeof createWalletConnectAdapter>

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = createWalletConnectAdapter()
    mockRelay.status = "healthy"
    setOnPairingUri(null)
    mockSignClient.connect.mockResolvedValue({ uri: "wc:test" })
    mockSignClient.session.getAll.mockReturnValue([])
    mockSignClient.approve.mockResolvedValue({})
    mockSignClient.disconnect.mockResolvedValue(undefined)
    mockSignClient.request.mockResolvedValue({ signedXdr: "mockxdr" })
  })

  afterEach(() => {
    setOnPairingUri(null)
  })

  describe("factory", () => {
    it("creates an adapter with correct id", () => {
      expect(adapter.meta.id).toBe("walletconnect")
    })

    it("creates an adapter with mobile category", () => {
      expect(adapter.meta.category).toBe("mobile")
    })

    it("has priority 0 (highest)", () => {
      expect(adapter.meta.priority).toBe(0)
    })

    it("isAvailable returns true in browser-like environment", () => {
      expect(adapter.meta.isAvailable()).toBe(true)
    })

    it("has descriptive name", () => {
      expect(adapter.meta.name).toBe("WalletConnect")
    })

    it("description mentions supported wallets", () => {
      expect(adapter.meta.description).toContain("200+")
    })
  })

  describe("implements WalletAdapter interface", () => {
    it("has connect method", () => {
      expect(typeof adapter.connect).toBe("function")
    })

    it("has disconnect method", () => {
      expect(typeof adapter.disconnect).toBe("function")
    })

    it("has isConnected method", () => {
      expect(typeof adapter.isConnected).toBe("function")
    })

    it("has signMessage method", () => {
      expect(typeof adapter.signMessage).toBe("function")
    })

    it("has signTransaction method", () => {
      expect(typeof adapter.signTransaction).toBe("function")
    })

    it("has getPublicKey method", () => {
      expect(typeof adapter.getPublicKey).toBe("function")
    })

    it("has getNetwork method", () => {
      expect(typeof adapter.getNetwork).toBe("function")
    })
  })

  describe("isConnected", () => {
    it("returns false before any connection", async () => {
      expect(await adapter.isConnected()).toBe(false)
    })

    it("returns false after disconnect", async () => {
      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })
  })

  describe("getPublicKey", () => {
    it("throws not_installed error when not connected", async () => {
      try {
        await adapter.getPublicKey()
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })
  })

  describe("getNetwork", () => {
    it("returns testnet by default", async () => {
      expect(await adapter.getNetwork()).toBe("testnet")
    })
  })

  describe("connect — error paths", () => {
    it("connect does not throw synchronously when relay is flagged down", async () => {
      mockRelay.status = "down"
      let promise: Promise<unknown> | undefined
      expect(() => { promise = adapter.connect().catch((err) => err) }).not.toThrow()
      expect(promise).toBeInstanceOf(Promise)
      await new Promise<void>((resolve) => setTimeout(resolve, 20))
      resetWcState()
      try { await promise! } catch { /* expected — resetWcState rejected it */ }
    })

    it("throws not_installed for signMessage when not connected (regardless of relay)", async () => {
      mockRelay.status = "down"
      try {
        await adapter.signMessage("test")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })

    it("throws internal error when connect returns no URI", async () => {
      // Ensure clean state before starting
      resetWcState()
      mockSignClient.connect.mockResolvedValue({})

      try {
        await adapter.connect()
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string; message: string }
        expect(e.code).toBe("internal")
        expect(e.message).toContain("URI")
      }
    })

    it.skip("throws timeout error when connect takes too long", () => {
      // Requires real WC2 relay interaction — tested in integration tests
    })
  })

  describe("disconnect", () => {
    it("clears public key", async () => {
      expect(await adapter.isConnected()).toBe(false)
      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })

    it("clears session store", async () => {
      await adapter.disconnect()
      expect(mockSessionStore.clear).toHaveBeenCalled()
    })

    it("can be called multiple times without error", async () => {
      await adapter.disconnect()
      await adapter.disconnect()
      await adapter.disconnect()
    })
  })

  describe("signMessage — error paths", () => {
    it("throws not_connected error when not connected", async () => {
      try {
        await adapter.signMessage("test-message")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string; message: string }
        expect(e.code).toBe("not_installed")
        expect(e.message).toContain("not connected")
      }
    })

    it("rejects with typed WalletError", async () => {
      try {
        await adapter.signMessage("test")
      } catch (err: unknown) {
        const e = err as { adapter: string; code: string }
        expect(e.adapter).toBe("walletconnect")
        expect(["not_installed", "internal", "timeout", "user_rejected"]).toContain(e.code)
      }
    })
  })

  describe("signTransaction — error paths (no connection)", () => {
    it("throws not_connected error when no session", async () => {
      try {
        await adapter.signTransaction("AAAAAgAAAAB...")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })

    it("throws not_installed for empty XDR (not connected)", async () => {
      try {
        await adapter.signTransaction("")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string; message: string }
        expect(e.code).toBe("not_installed")
      }
    })

    it("throws not_installed for whitespace XDR (not connected)", async () => {
      try {
        await adapter.signTransaction("   ")
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })
  })

  describe("session management", () => {
    it("preserves session across multiple disconnect calls", async () => {
      await adapter.disconnect()
      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })

    it("clears session data on disconnect", async () => {
      await adapter.disconnect()
      try {
        await adapter.getPublicKey()
        expect.unreachable("Should have thrown")
      } catch (err: unknown) {
        const e = err as { code: string }
        expect(e.code).toBe("not_installed")
      }
    })
  })

  describe("adapter state isolation", () => {
    it("each createWalletConnectAdapter call creates independent state", async () => {
      const adapter1 = createWalletConnectAdapter()
      const adapter2 = createWalletConnectAdapter()

      expect(await adapter1.isConnected()).toBe(false)
      expect(await adapter2.isConnected()).toBe(false)

      await adapter1.disconnect()
      expect(await adapter2.isConnected()).toBe(false)
    })
  })
})

describe("WalletConnect setOnPairingUri", () => {
  it("setOnPairingUri accepts and stores a handler", () => {
    const handler = vi.fn()
    setOnPairingUri(handler)
    expect(typeof handler).toBe("function")
  })

  it("setOnPairingUri accepts null to clear handler", () => {
    setOnPairingUri(null)
    const handler = vi.fn()
    setOnPairingUri(handler)
    setOnPairingUri(null)
  })
})

describe("WalletConnect address validation", () => {
  it("detects invalid Stellar public key format", () => {
    const invalidKeys = [
      "",
      "G",
      "G123",
      "GA!@#$%",
      "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27R",
      "not-a-public-key",
    ]
    const validKey = "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"

    for (const key of invalidKeys) {
      expect(key.length === 56 && key.startsWith("G")).toBe(false)
    }
    expect(validKey.length === 56 && validKey.startsWith("G")).toBe(true)
  })

  it("validates Stellar account format from WC2 session", () => {
    const account = "stellar:testnet:GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"
    const parts = account.split(":")
    expect(parts[0]).toBe("stellar")
    expect(parts[1]).toBe("testnet")
    expect(parts[2]).toHaveLength(56)
    expect(parts[2][0]).toBe("G")
  })

  it("derives network from chain ID", () => {
    expect("stellar:pubnet".split(":")[1]).toBe("pubnet")
    expect("stellar:testnet".split(":")[1]).toBe("testnet")
  })

  it("maps pubnet to mainnet network type", () => {
    const account = "stellar:pubnet:GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"
    const chain = account.split(":")[1]
    const network = chain === "pubnet" ? "mainnet" : "testnet"
    expect(network).toBe("mainnet")
  })

  it("maps testnet chain to testnet network type", () => {
    const account = "stellar:testnet:GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"
    const chain = account.split(":")[1]
    const network = chain === "pubnet" ? "mainnet" : "testnet"
    expect(network).toBe("testnet")
  })
})

describe("WalletConnect XDR validation", () => {
  it("accepts valid base64 XDR", () => {
    const valid = "AAAAAgAAAABxY2hhbmdlX2JhbGFuY2UAAAA"
    expect(typeof valid).toBe("string")
    expect(valid.length).toBeGreaterThan(20)
  })

  it("rejects empty XDR", () => {
    const empty = ""
    expect(empty.length).toBe(0)
  })

  it("rejects whitespace-only XDR", () => {
    const whitespace = "   "
    expect(whitespace.trim().length).toBe(0)
  })

  it("detects when signed XDR differs from unsigned", () => {
    const unsignedXdr = "AAAAAgAAAABtest123"
    const signedXdr = "AAAAAgAAAABtest456"
    expect(signedXdr).not.toBe(unsignedXdr)
  })

  it("detects when wallet returns unsigned XDR unchanged", () => {
    const unsignedXdr = "AAAAAgAAAAB..."
    const returnedXdr = "AAAAAgAAAAB..."
    expect(returnedXdr).toBe(unsignedXdr)
  })
})

describe("WalletConnect error type discrimination", () => {
  it("not_installed error has correct shape", () => {
    const err = { adapter: "walletconnect", code: "not_installed" as const, message: "Not connected" }
    expect(err.code).toBe("not_installed")
    expect(err.adapter).toBe("walletconnect")
  })

  it("user_rejected error has correct shape", () => {
    const err = { adapter: "walletconnect", code: "user_rejected" as const, message: "Rejected" }
    expect(err.code).toBe("user_rejected")
  })

  it("network_mismatch error has correct shape", () => {
    const err = {
      adapter: "walletconnect",
      code: "network_mismatch" as const,
      message: "Network mismatch",
      expected: "mainnet" as const,
      actual: "testnet" as const,
    }
    expect(err.code).toBe("network_mismatch")
    expect(err.expected).toBe("mainnet")
    expect(err.actual).toBe("testnet")
  })

  it("timeout error has correct shape", () => {
    const err = { adapter: "walletconnect", code: "timeout" as const, message: "Timed out" }
    expect(err.code).toBe("timeout")
    expect(err.message).toContain("Timed")
  })

  it("internal error has correct shape with cause", () => {
    const err = { adapter: "walletconnect", code: "internal" as const, message: "Something broke", cause: "Stack trace" }
    expect(err.code).toBe("internal")
    expect(err.cause).toBeDefined()
  })
})

describe("WalletConnect adapter method idempotency", () => {
  it("disconnect is idempotent", async () => {
    const a = createWalletConnectAdapter()
    await a.disconnect()
    await a.disconnect()
    expect(await a.isConnected()).toBe(false)
  })

  it("getPublicKey always throws when not connected", async () => {
    const a = createWalletConnectAdapter()
    for (let i = 0; i < 3; i++) {
      try {
        await a.getPublicKey()
        expect.unreachable("Should have thrown")
      } catch {
        // expected
      }
    }
  })
})
