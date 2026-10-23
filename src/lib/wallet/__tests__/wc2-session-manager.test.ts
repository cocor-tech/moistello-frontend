import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockSaveSession = vi.fn()
const mockClearSession = vi.fn()
const mockGetSession = vi.fn(() => null)
const mockValidateStellarAddress = vi.fn(() => true)
const mockComputeSessionExpiry = vi.fn(() => 1_700_000_000_000)

const mockRelay = { status: "healthy" as const }
const mockSignClient = {
  init: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn().mockResolvedValue({ uri: "wc://pairing-uri" }),
  approve: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  session: { getAll: vi.fn(() => []) },
}

vi.mock("@/lib/wallet/wc2-relay", () => ({ getRelayMonitor: () => mockRelay }))
vi.mock("@/lib/wallet/wc2-session-store", () => ({
  getWC2SessionStore: () => ({ getSession: mockGetSession, saveSession: mockSaveSession, clear: mockClearSession }),
}))
vi.mock("@/lib/wallet/wc2-sign-client", () => ({
  getSignClientClass: () => Promise.resolve(mockSignClient),
  _resetSignClientCache: vi.fn(),
}))
vi.mock("@/lib/stellar/validate-address", () => ({ validateStellarAddress: mockValidateStellarAddress }))
vi.mock("@/lib/wallet/session-lifecycle", () => ({ computeSessionExpiry: mockComputeSessionExpiry }))
vi.mock("@/lib/constants", () => ({ WC2_QR_EXPIRATION_MS: 60_000 }))
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))

import {
  connectWalletConnect,
  disconnectWalletConnect,
  getWCSessionManager,
  isWalletConnectConnected,
} from "../wc2-session-manager"

beforeEach(() => {
  vi.clearAllMocks()
  mockSaveSession.mockClear()
  mockClearSession.mockClear()
  mockGetSession.mockClear()
  mockGetSession.mockReturnValue(null)
  mockValidateStellarAddress.mockClear()
  mockValidateStellarAddress.mockReturnValue(true)
  mockComputeSessionExpiry.mockClear()
  mockComputeSessionExpiry.mockReturnValue(1_700_000_000_000)
  mockRelay.status = "healthy"
  mockSignClient.init.mockClear()
  mockSignClient.on.mockClear()
  mockSignClient.off.mockClear()
  mockSignClient.connect.mockClear()
  mockSignClient.approve.mockClear()
  mockSignClient.disconnect.mockClear()
  mockSignClient.session.getAll.mockClear()
})

afterEach(() => {
  void disconnectWalletConnect().catch(() => undefined)
})

describe("wallet connect wrappers", () => {
  it("connectWalletConnect delegates to the manager", async () => {
    mockSignClient.connect.mockResolvedValue({ uri: "wc://x" })
    const manager = getWCSessionManager()
    const connectSpy = vi.spyOn(manager, "connect")
    await connectWalletConnect()
    expect(connectSpy).toHaveBeenCalledTimes(1)
    connectSpy.mockRestore()
  })

  it("disconnectWalletConnect delegates to the manager", async () => {
    const manager = getWCSessionManager()
    const disconnectSpy = vi.spyOn(manager, "disconnect")
    await disconnectWalletConnect()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
    disconnectSpy.mockRestore()
  })

  it("isWalletConnectConnected delegates to the manager", async () => {
    const manager = getWCSessionManager()
    const connectedSpy = vi.spyOn(manager, "isConnected")
    await isWalletConnectConnected()
    expect(connectedSpy).toHaveBeenCalledTimes(1)
    connectedSpy.mockRestore()
  })
})

describe("connection state", () => {
  it("starts idle and disconnected", () => {
    const manager = getWCSessionManager()
    expect(manager.getConnectionState()).toMatchObject({
      status: "idle",
      pairingUri: null,
      address: null,
      error: null,
      sessionTopic: null,
    })
  })

  it("reports not connected initially", async () => {
    expect(await isWalletConnectConnected()).toBe(false)
  })
})

describe("connect", () => {
  const stellarProposal = {
    id: 1,
    params: {
      requiredNamespaces: { stellar: { chains: ["stellar:pubnet"] } },
      relays: [],
    },
  }

  const stellarSession = {
    topic: "t1",
    namespaces: {
      stellar: { accounts: ["stellar:pubnet:" + "G" + "A".repeat(55)] },
    },
  }

  it("throws when the walletconnect relay is down", async () => {
    mockRelay.status = "down"
    await expect(connectWalletConnect()).rejects.toThrow("WalletConnect relay is unreachable")
  })

  it("resolves with the stellar public key on an approved session", async () => {
    const publicKey = "G" + "A".repeat(55)
    mockSignClient.session.getAll.mockReturnValue([stellarSession])
    const emitted: string[] = []
    const manager = getWCSessionManager()
    manager.on("connection_approved", (address) => emitted.push(address))

    const promise = connectWalletConnect()

    // Drive the session_proposal handler that connect() registers.
    const proposalHandler = mockSignClient.on.mock.calls.find(
      (call) => call[0] === "session_proposal",
    )?.[1]
    expect(proposalHandler).toBeDefined()
    void proposalHandler(stellarProposal)

    await expect(promise).resolves.toEqual({ publicKey, address: publicKey })
    expect(mockSaveSession).toHaveBeenCalledTimes(1)
    expect(mockSaveSession.mock.calls[0][0].publicKey).toBe(publicKey)
    expect(mockSaveSession.mock.calls[0][0].network).toBe("mainnet")
    expect(emitted).toEqual([publicKey])
  })

  it("rejects when the wallet does not support stellar", async () => {
    const promise = connectWalletConnect()
    const proposalHandler = mockSignClient.on.mock.calls.find(
      (call) => call[0] === "session_proposal",
    )?.[1]
    void proposalHandler({
      id: 2,
      params: { requiredNamespaces: { evm: { chains: ["eip155:1"] } }, relays: [] },
    })
    await expect(promise).rejects.toThrow("Wallet does not support Stellar")
  })
})

describe("events", () => {
  it("registers and invokes event handlers", () => {
    const manager = getWCSessionManager()
    const handler = vi.fn()
    const unsubscribe = manager.on("pairing_uri", handler)
    manager.emit("pairing_uri", "wc://uri")
    expect(handler).toHaveBeenCalledWith("wc://uri")
    unsubscribe()
    manager.emit("pairing_uri", "wc://uri")
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
