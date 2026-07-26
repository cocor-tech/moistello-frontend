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

function resetStore() {
  useAuthFlowStore.getState().reset()
  useAuthFlowStore.setState({
    mode: "login",
    step: "sign",
    status: { status: "idle" },
    connection: {
      walletId: "freighter",
      address: "GABC123...",
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

describe("AuthFlowStore - signAndSubmit", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("persists auth flow state in localStorage so other tabs can receive storage events", () => {
    localStorage.clear()
    sessionStorage.clear()

    useAuthFlowStore.getState().setStep("sign")

    expect(localStorage.getItem("moistello-auth-flow")).not.toBeNull()
    expect(sessionStorage.getItem("moistello-auth-flow")).toBeNull()
  })

  it("fails early if no wallet connected", async () => {
    useAuthFlowStore.setState({
      connection: {
        walletId: null,
        address: null,
        pairingUri: null,
        protocol: null,
        relayStatus: "healthy",
      },
    })

    await useAuthFlowStore.getState().signAndSubmit()

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "internal_error",
      message: "No wallet connected.",
      canRetry: false,
    })
    expect(mockPost).not.toHaveBeenCalled()
  })

  it("fetches nonce, signs message, submits, and authenticates", async () => {
    mockSignMessage.mockResolvedValueOnce({ signature: "sig-abc" })
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } }).mockResolvedValueOnce({
      data: {
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: { id: "user-1" },
      },
    })

    await useAuthFlowStore.getState().signAndSubmit()

    expect(mockPost).toHaveBeenCalledWith("/auth/nonce", { walletAddress: "GABC123..." }, { _retry: true })
    expect(mockSignMessage).toHaveBeenCalledWith("nonce-123")
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/verify",
      {
        walletAddress: "GABC123...",
        signature: "sig-abc",
        nonce: "nonce-123",
        passkeyVersion: 0,
      },
      { _retry: true },
    )
    expect(mockSetTokens).toHaveBeenCalledWith("jwt-token", "refresh-token")

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({ status: "authenticated" })
  })

  it("uses current state after asynchronous signing steps", async () => {
    mockPost
      .mockImplementationOnce(async () => {
        useAuthFlowStore.setState({ passkeyVersion: 2 })
        return { data: { nonce: { nonce: "nonce-123" } } }
      })
      .mockResolvedValueOnce({
        data: {
          token: "jwt-token",
          user: { id: "user-1" },
        },
      })
    mockSignMessage.mockImplementationOnce(async () => {
      useAuthFlowStore.setState({
        mode: "register",
        passkeyVersion: 3,
        profile: {
          displayName: "Current User",
          countryCode: "NG",
          language: "en",
          fieldErrors: {},
        },
      })
      return { signature: "sig-abc" }
    })

    await useAuthFlowStore.getState().signAndSubmit()

    expect(mockPost).toHaveBeenCalledWith(
      "/auth/register",
      {
        walletAddress: "GABC123...",
        signature: "sig-abc",
        nonce: "nonce-123",
        passkeyVersion: 3,
        displayName: "Current User",
        countryCode: "NG",
        preferredLanguage: "en",
      },
      { _retry: true },
    )
  })

  it("sets error when nonce fetch fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network error"))

    await useAuthFlowStore.getState().signAndSubmit()

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "auth_server_error",
      message: "Network error",
      canRetry: true,
    })
    expect(mockSignMessage).not.toHaveBeenCalled()
  })

  it("sets error when signature verification fails on server", async () => {
    mockSignMessage.mockResolvedValueOnce({ signature: "sig-bad" })
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } }).mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: "signature verification failed" },
      },
    })

    await useAuthFlowStore.getState().signAndSubmit()

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "auth_server_error",
      message: "signature verification failed",
      canRetry: true,
    })
  })

  it("handles passkey revocation on login", async () => {
    mockSignMessage.mockResolvedValueOnce({ signature: "sig-abc" })
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } }).mockResolvedValueOnce({
      data: {
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: { id: "user-1" },
        expectedPasskeyVersion: 5,
      },
    })

    await useAuthFlowStore.getState().signAndSubmit()

    const state = useAuthFlowStore.getState()
    expect(state.passkeyVersion).toBe(5)
    expect(state.passkeyRevoked).toBe(true)
    expect(state.status).toEqual({
      status: "error",
      code: "passkey_revoked",
      message: "Your passkey has been revoked. Please set up a new one.",
      canRetry: true,
    })
    // Should NOT have called setTokens when passkey is revoked
    expect(mockSetTokens).not.toHaveBeenCalled()
  })

  it("includes profile fields in register mode", async () => {
    useAuthFlowStore.setState({
      mode: "register",
      profile: {
        displayName: "Test User",
        email: "test@example.com",
        countryCode: "US",
        language: "en",
        fieldErrors: {},
      },
    })

    mockSignMessage.mockResolvedValueOnce({ signature: "sig-abc" })
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } }).mockResolvedValueOnce({
      data: {
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: { id: "user-1" },
      },
    })

    await useAuthFlowStore.getState().signAndSubmit()

    expect(mockPost).toHaveBeenCalledWith(
      "/auth/register",
      {
        walletAddress: "GABC123...",
        signature: "sig-abc",
        nonce: "nonce-123",
        passkeyVersion: 0,
        displayName: "Test User",
        email: "test@example.com",
        countryCode: "US",
        preferredLanguage: "en",
      },
      { _retry: true },
    )
  })

  it("transitions state through signing phases", async () => {
    mockSignMessage.mockResolvedValueOnce({ signature: "sig-abc" })
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } }).mockResolvedValueOnce({
      data: {
        token: "jwt-token",
        user: { id: "user-1" },
      },
    })

    const states: string[] = []
    const unsub = useAuthFlowStore.subscribe(s => {
      if (typeof s.status === "object" && s.status !== null && "status" in s.status) {
        states.push((s.status as { status: string }).status)
      }
    })

    await useAuthFlowStore.getState().signAndSubmit()
    unsub()

    expect(states).toContain("signing")
    expect(states).toContain("signed")
    expect(states).toContain("authenticated")
  })

  it("handles missing wallet adapter", async () => {
    useAuthFlowStore.setState({
      connection: {
        walletId: "nonexistent",
        address: "GABC...",
        pairingUri: null,
        protocol: null,
        relayStatus: "healthy",
      },
    })

    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } })

    await useAuthFlowStore.getState().signAndSubmit()

    const state = useAuthFlowStore.getState()
    expect(state.status).toEqual({
      status: "error",
      code: "auth_server_error",
      message: "Wallet adapter not found",
      canRetry: true,
    })
  })
})
