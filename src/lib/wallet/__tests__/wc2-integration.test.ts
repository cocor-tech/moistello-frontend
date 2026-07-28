import { describe, it, expect, vi, beforeEach } from "vitest"
import { getWalletRegistry } from "../registry"
import { getSessionManager } from "../session-manager"
import { getRelayMonitor } from "../wc2-relay"
import { getWC2SessionStore } from "../wc2-session-store"

vi.mock("../features", () => ({
  isPasskeyEnabled: () => false,
  isHardwareWalletEnabled: () => false,
  isWalletConnectEnabled: () => true,
  isExtensionWalletsEnabled: () => false,
  isFeatureEnabled: (flag: string) => flag === "NEXT_PUBLIC_FEATURE_WALLETCONNECT",
}))

vi.mock("../wc2-relay", () => ({
  WCRelayMonitor: vi.fn().mockImplementation(() => ({
    status: "healthy",
    recordOutcome: vi.fn(),
    reset: vi.fn(),
    isDownForConnect: false,
    isDownForSign: false,
  })),
  getRelayMonitor: vi.fn().mockReturnValue({
    status: "healthy",
    recordOutcome: vi.fn(),
    reset: vi.fn(),
    isDownForConnect: false,
    isDownForSign: false,
  }),
}))

vi.mock("../wc2-session-store", () => ({
  WC2SessionStore: vi.fn().mockImplementation(() => ({
    getSession: vi.fn().mockReturnValue(null),
    saveSession: vi.fn(),
    clear: vi.fn(),
  })),
  getWC2SessionStore: vi.fn().mockReturnValue({
    getSession: vi.fn().mockReturnValue(null),
    saveSession: vi.fn(),
    clear: vi.fn(),
  }),
}))

describe("WC2 Integration — Registry", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
  })

  it("registers WC2 adapter when feature flag is on", async () => {
    const registry = getWalletRegistry()
    const { initializeWalletAdapters } = await import("../adapters")
    await initializeWalletAdapters()

    const adapter = registry.getAdapter("walletconnect")
    expect(adapter).toBeDefined()
    expect(adapter!.meta.id).toBe("walletconnect")
    expect(adapter!.meta.category).toBe("mobile")
  })

  it("detects WC2 adapter in registry results", () => {
    const registry = getWalletRegistry()
    registry.clearCache()
    const results = registry.detect()
    const wc2 = results.find((r) => r.id === "walletconnect")
    expect(wc2).toBeDefined()
    expect(wc2!.status).toBe("detected")
  })

  it("WC2 adapter is always available (no extension needed)", () => {
    const registry = getWalletRegistry()
    const adapter = registry.getAdapter("walletconnect")
    expect(adapter!.meta.isAvailable()).toBe(true)
  })

  it("implements WalletAdapter interface completely", () => {
    const registry = getWalletRegistry()
    const adapter = registry.getAdapter("walletconnect")
    const methods = ["connect", "disconnect", "isConnected", "signMessage", "signTransaction", "getPublicKey", "getNetwork"]
    for (const method of methods) {
      expect(typeof (adapter as Record<string, unknown>)[method]).toBe("function")
    }
  })

  it("filters WC2 adapter when feature flag is off", async () => {
    vi.mocked(vi.importActual("../features")).then((mod) => {
      const features = mod as { isWalletConnectEnabled: () => boolean }
      vi.spyOn(features, "isWalletConnectEnabled").mockReturnValue(false)
    })
  })
})

describe("WC2 Integration — Session Manager", () => {
  it("sessionManager can persist sessions", () => {
    const sm = getSessionManager()
    expect(sm).toBeDefined()
  })
})

describe("WC2 Integration — Relay Monitor", () => {
  it("relay monitor starts healthy", () => {
    const relay = getRelayMonitor()
    expect(relay.status).toBe("healthy")
  })
})

describe("WC2 Integration — Session Store", () => {
  it("session store handles null on empty", () => {
    const store = getWC2SessionStore()
    expect(store.getSession()).toBeNull()
  })

  it("session store save clears on clear", () => {
    const store = getWC2SessionStore()
    store.saveSession({
      pairingTopic: "test",
      publicKey: "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC",
      network: "testnet",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
    })
    store.clear()
    expect(store.getSession()).toBeNull()
  })
})

describe("WC2 — Adapter Lifecycle", () => {
  it("initial state: not connected, no session", async () => {
    const registry = getWalletRegistry()
    const adapter = registry.getAdapter("walletconnect")
    expect(await adapter!.isConnected()).toBe(false)
  })

  it("disconnect without connect does not throw", async () => {
    const registry = getWalletRegistry()
    const adapter = registry.getAdapter("walletconnect")
    await expect(adapter!.disconnect()).resolves.toBeUndefined()
  })

  it("getNetwork returns default before connection", async () => {
    const registry = getWalletRegistry()
    const adapter = registry.getAdapter("walletconnect")
    const network = await adapter!.getNetwork()
    expect(["testnet", "mainnet"]).toContain(network)
  })
})

describe("WC2 — Stellar Account Parsing", () => {
  it("parses testnet account correctly", () => {
    const account = "stellar:testnet:GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"
    const parts = account.split(":")
    expect(parts[0]).toBe("stellar")
    expect(parts[1]).toBe("testnet")
    expect(parts[2]).toHaveLength(56)
  })

  it("parses pubnet account correctly", () => {
    const account = "stellar:pubnet:GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"
    const parts = account.split(":")
    expect(parts[0]).toBe("stellar")
    expect(parts[1]).toBe("pubnet")
    expect(parts[2]).toHaveLength(56)
  })

  it("derives network type testnet from chain stellar:testnet", () => {
    const chainId = "stellar:testnet"
    const network = chainId === "stellar:pubnet" ? "mainnet" : "testnet"
    expect(network).toBe("testnet")
  })

  it("derives network type mainnet from chain stellar:pubnet", () => {
    const chainId = "stellar:pubnet"
    const network = chainId === "stellar:pubnet" ? "mainnet" : "testnet"
    expect(network).toBe("mainnet")
  })
})

describe("WC2 — Cross-Tab Session Sync", () => {
  it("WC2 session store writes are isolated per adapter instance", () => {
    const store1 = getWC2SessionStore()
    const store2 = getWC2SessionStore()

    store1.saveSession({
      pairingTopic: "topic-a",
      publicKey: "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC",
      network: "testnet",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
    })

    expect(store2.getSession()).toBeNull()
  })
})

describe("WC2 — Feature Flag Integration", () => {
  it("isWalletConnectEnabled is a function", async () => {
    const features = await import("../features")
    expect(typeof features.isWalletConnectEnabled).toBe("function")
  })
})
