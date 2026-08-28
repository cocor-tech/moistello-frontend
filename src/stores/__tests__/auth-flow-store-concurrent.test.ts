/**
 * Tests for concurrent signAndSubmit invocations.
 *
 * Covers:
 * - In-flight guard: a second call while one is in-flight is a no-op
 * - isSigningInFlight is true during the call and false after completion
 * - isSigningInFlight is false after an error
 * - clearError resets isSigningInFlight
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  post: mockPost,
}))

vi.mock("@/lib/monitoring", () => ({
  recordMetric: vi.fn(),
  captureAuthError: vi.fn(),
}))

const mockSignMessage = vi.fn()
const mockSetTokens = vi.fn()

vi.mock("@/stores/multi-wallet-store", () => ({
  useMultiWalletStore: {
    getState: () => ({
      wallets: {
        freighter: {
          adapter: { signMessage: mockSignMessage },
        },
      },
    }),
  },
}))

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: {
    getState: () => ({
      setTokens: mockSetTokens,
    }),
  },
}))

import { useAuthFlowStore } from "@/stores/auth-flow-store"

function seedConnectedState() {
  useAuthFlowStore.getState().reset()
  useAuthFlowStore.setState({
    mode: "login",
    step: "sign",
    status: { status: "idle" },
    isSigningInFlight: false,
    connection: {
      walletId: "freighter",
      address: "GABC123DEF456...",
      pairingUri: null,
      protocol: null,
      relayStatus: "healthy",
    },
    auth: { nonce: null, signature: null, nonceTimestamp: null },
    emailVerification: {
      email: "",
      verificationId: null,
      codeSent: false,
      codeVerified: false,
      expiresAt: null,
      remainingAttempts: 5,
    },
  })
}

describe("AuthFlowStore - concurrent signAndSubmit guard", () => {
  beforeEach(() => {
    seedConnectedState()
    vi.clearAllMocks()
  })

  it("sets isSigningInFlight=true while the call is in-flight", async () => {
    let resolveSign: (v: { signature: string }) => void
    mockSignMessage.mockImplementation(
      () => new Promise<{ signature: string }>((res) => { resolveSign = res }),
    )
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })

    // Start but don't await
    const inflightPromise = useAuthFlowStore.getState().signAndSubmit()

    // Allow microtasks to run (nonce fetch starts)
    await Promise.resolve()
    await Promise.resolve()

    expect(useAuthFlowStore.getState().isSigningInFlight).toBe(true)

    // Resolve to complete
    resolveSign!({ signature: "sig-ok" })
    mockPost.mockResolvedValueOnce({ data: { token: "t", user: {} } })
    await inflightPromise
  })

  it("second concurrent call is a complete no-op and does not call post again", async () => {
    let resolveSign: (v: { signature: string }) => void
    mockSignMessage.mockImplementation(
      () => new Promise<{ signature: string }>((res) => { resolveSign = res }),
    )
    mockPost.mockResolvedValue({ data: { nonce: { nonce: "n1" } } })

    // Start first call but don't await
    const first = useAuthFlowStore.getState().signAndSubmit()

    // Yield to allow first call to hit in-flight guard
    await Promise.resolve()
    await Promise.resolve()

    expect(useAuthFlowStore.getState().isSigningInFlight).toBe(true)

    // Second call should return immediately without touching state
    const postCallCountBefore = mockPost.mock.calls.length
    await useAuthFlowStore.getState().signAndSubmit()
    const postCallCountAfter = mockPost.mock.calls.length

    // No extra API calls were made
    expect(postCallCountAfter).toBe(postCallCountBefore)

    // Resolve and clean up the first call
    resolveSign!({ signature: "sig-ok" })
    mockPost.mockResolvedValueOnce({ data: { token: "t", user: {} } })
    await first
  })

  it("isSigningInFlight resets to false after a successful submission", async () => {
    mockSignMessage.mockResolvedValueOnce({ signature: "sig-abc" })
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n2" } } })
      .mockResolvedValueOnce({ data: { token: "jwt", refreshToken: "ref", user: { id: "u1" } } })

    await useAuthFlowStore.getState().signAndSubmit()

    expect(useAuthFlowStore.getState().isSigningInFlight).toBe(false)
    expect(useAuthFlowStore.getState().status).toEqual({ status: "authenticated" })
  })

  it("isSigningInFlight resets to false after an error", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network failure"))

    await useAuthFlowStore.getState().signAndSubmit()

    expect(useAuthFlowStore.getState().isSigningInFlight).toBe(false)
    expect(useAuthFlowStore.getState().status.status).toBe("error")
  })

  it("clearError resets isSigningInFlight", () => {
    useAuthFlowStore.setState({ isSigningInFlight: true })
    useAuthFlowStore.getState().clearError()

    expect(useAuthFlowStore.getState().isSigningInFlight).toBe(false)
  })

  it("allows a new call once the previous one has completed", async () => {
    // First call succeeds
    mockSignMessage.mockResolvedValueOnce({ signature: "sig-1" })
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
      .mockResolvedValueOnce({ data: { token: "t1", user: {} } })

    await useAuthFlowStore.getState().signAndSubmit()
    expect(useAuthFlowStore.getState().isSigningInFlight).toBe(false)

    // Re-seed connected state for second call
    seedConnectedState()

    // Second call also succeeds
    mockSignMessage.mockResolvedValueOnce({ signature: "sig-2" })
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n2" } } })
      .mockResolvedValueOnce({ data: { token: "t2", user: {} } })

    await useAuthFlowStore.getState().signAndSubmit()

    expect(useAuthFlowStore.getState().isSigningInFlight).toBe(false)
    expect(useAuthFlowStore.getState().status).toEqual({ status: "authenticated" })
  })

  it("concurrent calls only produce one nonce request and one sign", async () => {
    let resolvePost1: (v: unknown) => void
    mockPost.mockImplementationOnce(
      () => new Promise((res) => { resolvePost1 = res }),
    )
    mockSignMessage.mockResolvedValue({ signature: "sig-concurrent" })

    // Fire two calls simultaneously
    const p1 = useAuthFlowStore.getState().signAndSubmit()
    const p2 = useAuthFlowStore.getState().signAndSubmit()

    // Allow microtasks
    await Promise.resolve()
    await Promise.resolve()

    // Resolve the nonce
    resolvePost1!({ data: { nonce: { nonce: "n-only-once" } } })
    mockPost.mockResolvedValueOnce({ data: { token: "t", user: {} } })

    await Promise.all([p1, p2])

    // Only one nonce call and one verify call
    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockSignMessage).toHaveBeenCalledTimes(1)
  })
})
