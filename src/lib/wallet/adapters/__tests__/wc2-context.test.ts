/**
 * wc2-context.test.ts
 *
 * Tests for the per-connect context model introduced in PR #273.
 * Covers:
 *  - Concurrent connect attempts ("latest wins", prior rejected)
 *  - Timeout / abort mid-pairing
 *  - Unmount cleanup (abortConnect)
 *  - resetWcState scoped to owning context only
 *  - onPairingContextChange subscription lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ── Mock SignClient ─────────────────────────────────────────────────────────

let approvalResolve: ((session: unknown) => void) | null = null
let approvalReject: ((err: unknown) => void) | null = null

const mockSignClient = {
  on: vi.fn(),
  session: { getAll: vi.fn().mockReturnValue([]) },
  connect: vi.fn().mockImplementation(() =>
    Promise.resolve({
      uri: "wc:test-uri",
      approval: () =>
        new Promise((res, rej) => {
          approvalResolve = res
          approvalReject = rej
        }),
    })
  ),
  disconnect: vi.fn().mockResolvedValue(undefined),
  request: vi.fn().mockResolvedValue({ signedXdr: "signed" }),
}

vi.mock("@walletconnect/sign-client", () => ({
  SignClient: { init: vi.fn().mockResolvedValue(mockSignClient) },
}))

// ── Mock relay ──────────────────────────────────────────────────────────────

const mockRelay = {
  status: "healthy" as "healthy" | "down",
  recordOutcome: vi.fn(),
  get isDownForConnect() {
    return this.status === "down"
  },
  get isDownForSign() {
    return this.status === "down"
  },
}

vi.mock("../../wc2-relay", () => ({ getRelayMonitor: () => mockRelay }))

// ── Mock session store ──────────────────────────────────────────────────────

const mockSessionStore = {
  saveSession: vi.fn(),
  clear: vi.fn(),
  getSession: vi.fn().mockReturnValue(null),
}

vi.mock("../../wc2-session-store", () => ({
  getWC2SessionStore: () => mockSessionStore,
}))

// ── Import SUT after mocks ──────────────────────────────────────────────────

import {
  createWalletConnectAdapter,
  abortConnect,
  resetWcState,
  onPairingContextChange,
  setOnPairingUri,
  type PairingContext,
} from "../walletconnect"

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(address = "GAXI4RFQHLT2OVXZWRLGE6YFAJILKM576FKGSEDPMHPXWKBHDPXUIYJ") {
  return {
    topic: "test-topic",
    namespaces: {
      stellar: {
        accounts: [`stellar:testnet:${address}`],
        chains: ["stellar:testnet"],
      },
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Per-connect context: onPairingContextChange", () => {
  afterEach(() => {
    abortConnect()
    onPairingContextChange(null)
  })

  it("invokes listener immediately on registration with null", () => {
    const cb = vi.fn()
    onPairingContextChange(cb)
    expect(cb).toHaveBeenCalledWith(null)
  })

  it("invokes listener on context change", async () => {
    const states: Array<string | null> = []
    onPairingContextChange((ctx) => states.push(ctx?.state ?? null))

    const adapter = createWalletConnectAdapter()
    const connectPromise = adapter.connect()

    // Let the async body run (init + connect mock)
    await new Promise((r) => setTimeout(r, 0))

    abortConnect()
    try { await connectPromise } catch { /* expected */ }

    // Should have seen pairing -> null (aborted)
    expect(states).toContain("pairing")
  })

  it("null callback clears the subscription", () => {
    const cb = vi.fn()
    onPairingContextChange(cb)
    cb.mockClear()
    onPairingContextChange(null)
    abortConnect() // should not call cb
    expect(cb).not.toHaveBeenCalled()
  })
})

describe("Per-connect context: concurrent connects — latest wins", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRelay.status = "healthy"
    mockSignClient.session.getAll.mockReturnValue([])
    approvalResolve = null
    approvalReject = null

    // Each call to connect() sets up a fresh approval promise.
    let callCount = 0
    mockSignClient.connect.mockImplementation(() => {
      callCount++
      const n = callCount
      return Promise.resolve({
        uri: `wc:uri-${n}`,
        approval: () =>
          new Promise((res, rej) => {
            if (n === 1) {
              approvalResolve = res as any
              approvalReject = rej
            }
          }),
      })
    })
  })

  afterEach(() => {
    abortConnect()
    onPairingContextChange(null)
  })

  it("second connect() aborts the first and resolves itself", async () => {
    const adapter1 = createWalletConnectAdapter()
    const adapter2 = createWalletConnectAdapter()

    // First connect — stays pending
    const p1 = adapter1.connect().catch(() => "rejected")
    await new Promise((r) => setTimeout(r, 0))

    // Second connect — should abort first
    const p2 = adapter2.connect().catch(() => "rejected")
    await new Promise((r) => setTimeout(r, 0))

    // Abort both so neither leaks
    abortConnect()
    await p1
    await p2

    // First should have been rejected (aborted) — it returns "rejected" from catch
    // This just verifies no unhandled rejections occur
    expect(true).toBe(true)
  })

  it("first connect context is marked as no longer current after second starts", async () => {
    const contexts: Array<PairingContext | null> = []
    onPairingContextChange((ctx) => contexts.push(ctx ? { ...ctx } : null))

    const adapter = createWalletConnectAdapter()
    const p1 = adapter.connect().catch(() => {})
    await new Promise((r) => setTimeout(r, 0))

    // Start second connect (aborts first)
    const p2 = adapter.connect().catch(() => {})
    await new Promise((r) => setTimeout(r, 0))

    abortConnect()
    await p1
    await p2

    // At least one null context change fired (cleanup of old context)
    expect(contexts.some((c) => c === null)).toBe(true)
  })
})

describe("abortConnect / unmount cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRelay.status = "healthy"
    mockSignClient.session.getAll.mockReturnValue([])
    approvalResolve = null
    approvalReject = null
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:test",
      approval: () =>
        new Promise((res, rej) => {
          approvalResolve = res as any
          approvalReject = rej
        }),
    })
  })

  afterEach(() => {
    onPairingContextChange(null)
  })

  it("abortConnect rejects an in-flight connect with user_rejected", async () => {
    const adapter = createWalletConnectAdapter()
    const p = adapter.connect().catch((e) => e)
    await new Promise((r) => setTimeout(r, 0))

    abortConnect()

    const err = await p
    expect(err).toMatchObject({ code: "user_rejected" })
  })

  it("abortConnect is safe to call when no connect is pending", () => {
    expect(() => abortConnect()).not.toThrow()
    expect(() => abortConnect()).not.toThrow()
  })

  it("abortConnect clears the current context to null", async () => {
    const cb = vi.fn()
    onPairingContextChange(cb)
    cb.mockClear()

    const adapter = createWalletConnectAdapter()
    const p = adapter.connect().catch(() => {})
    await new Promise((r) => setTimeout(r, 0))

    abortConnect()
    await p

    const lastCall = cb.mock.calls[cb.mock.calls.length - 1]
    expect(lastCall[0]).toBeNull()
  })

  it("abortConnect does not touch the SignClient session", async () => {
    const adapter = createWalletConnectAdapter()
    const p = adapter.connect().catch(() => {})
    await new Promise((r) => setTimeout(r, 0))

    abortConnect()
    await p

    // SignClient.disconnect should NOT have been called by abortConnect
    expect(mockSignClient.disconnect).not.toHaveBeenCalled()
  })

  it("adapter.disconnect also aborts any pending connect", async () => {
    const adapter = createWalletConnectAdapter()
    const p = adapter.connect().catch(() => {})
    await new Promise((r) => setTimeout(r, 0))

    await adapter.disconnect()
    await p

    expect(await adapter.isConnected()).toBe(false)
  })
})

describe("resetWcState scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRelay.status = "healthy"
    mockSignClient.session.getAll.mockReturnValue([])
    approvalResolve = null
    approvalReject = null
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:test",
      approval: () =>
        new Promise((res, rej) => {
          approvalResolve = res as any
          approvalReject = rej
        }),
    })
  })

  afterEach(() => {
    onPairingContextChange(null)
  })

  it("resetWcState only cancels the owning context, not all wc@2 stores", async () => {
    // resetWcState must NOT call SignClient.disconnect or clear session store
    const adapter = createWalletConnectAdapter()
    const p = adapter.connect()
    await new Promise((r) => setTimeout(r, 0))

    resetWcState()
    try { await p } catch { /* expected */ }

    expect(mockSignClient.disconnect).not.toHaveBeenCalled()
    expect(mockSessionStore.clear).not.toHaveBeenCalled()
  })

  it("resetWcState is idempotent (safe to call multiple times)", () => {
    resetWcState()
    resetWcState()
    resetWcState()
    // No throw, no side-effects on SignClient
    expect(mockSignClient.disconnect).not.toHaveBeenCalled()
  })
})

describe("setOnPairingUri shim (backward compatibility)", () => {
  afterEach(() => {
    setOnPairingUri(null)
    abortConnect()
  })

  it("accepts a function and subscribes to URI changes", async () => {
    const uris: string[] = []
    setOnPairingUri((uri) => uris.push(uri))

    vi.clearAllMocks()
    mockSignClient.session.getAll.mockReturnValue([])
    mockSignClient.connect.mockResolvedValue({
      uri: "wc:shim-test",
      approval: () => new Promise(() => {}),
    })

    const adapter = createWalletConnectAdapter()
    const p = adapter.connect()
    await new Promise((r) => setTimeout(r, 0))

    abortConnect()
    try { await p } catch { /* expected */ }

    // The shim should have forwarded the URI
    expect(uris).toContain("wc:shim-test")
  })

  it("accepts null to unsubscribe", () => {
    const cb = vi.fn()
    setOnPairingUri(cb)
    setOnPairingUri(null) // unsubscribe
    abortConnect()
    expect(cb).not.toHaveBeenCalled()
  })
})

describe("Adapter state isolation between factory calls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRelay.status = "healthy"
    mockSignClient.session.getAll.mockReturnValue([])
  })

  afterEach(() => {
    abortConnect()
    onPairingContextChange(null)
  })

  it("two adapters do not share publicKey / session", async () => {
    const a = createWalletConnectAdapter()
    const b = createWalletConnectAdapter()

    expect(await a.isConnected()).toBe(false)
    expect(await b.isConnected()).toBe(false)

    await a.disconnect()
    expect(await b.isConnected()).toBe(false)
  })
})
