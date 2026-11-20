import { describe, it, expect, vi, beforeEach } from "vitest"
import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios"

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

import { useAuthFlowStore } from "@/stores/auth-flow-store"

function resetStore() {
  useAuthFlowStore.getState().reset()
  useAuthFlowStore.setState({
    status: { status: "idle" },
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

function makeAxiosError(status: number, data?: Record<string, unknown>): AxiosError {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_RESPONSE",
    undefined,
    null,
    {
      status,
      data: data ?? { error: "Something went wrong" },
      statusText: "Error",
      headers: new AxiosHeaders(),
      config: {} as InternalAxiosRequestConfig,
    },
  )
}

describe("AuthFlowStore - primary behavior", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("starts login flow and resets to choose step", () => {
    useAuthFlowStore.getState().startLoginFlow()
    const state = useAuthFlowStore.getState()
    expect(state.mode).toBe("login")
    expect(state.step).toBe("choose")
    expect(state.status).toEqual({ status: "idle" })
  })

  it("starts register flow", () => {
    useAuthFlowStore.getState().startRegisterFlow()
    const state = useAuthFlowStore.getState()
    expect(state.mode).toBe("register")
    expect(state.step).toBe("choose")
    expect(state.status).toEqual({ status: "idle" })
  })

  it("resets store to initial state", () => {
    useAuthFlowStore.getState().startLoginFlow()
    useAuthFlowStore.getState().reset()
    const state = useAuthFlowStore.getState()
    expect(state.mode).toBe("login")
    expect(state.step).toBe("choose")
    expect(state.status).toEqual({ status: "idle" })
    expect(state.error).toBeNull()
  })
})

describe("AuthFlowStore - canProceed", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("returns true at choose step when wallet connected", () => {
    useAuthFlowStore.getState().connectStart("freighter")
    ;(useAuthFlowStore.getState().connection as any).address = "0x123"
    const state = useAuthFlowStore.getState()
    expect(state.canProceed()).toBe(true)
  })

  it("returns false at choose step without wallet connected", () => {
    const state = useAuthFlowStore.getState()
    expect(state.canProceed()).toBe(false)
  })

  it("returns true at profile step with valid profile (register mode)", () => {
    useAuthFlowStore.getState().startRegisterFlow()
    useAuthFlowStore.getState().setStep("profile")
    useAuthFlowStore.getState().updateProfileField("displayName", "John Doe")
    useAuthFlowStore.getState().updateProfileField("countryCode", "US")
    const state = useAuthFlowStore.getState()
    expect(state.canProceed()).toBe(true)
  })

  it("returns false at profile step missing display name (register mode)", () => {
    useAuthFlowStore.getState().startRegisterFlow()
    useAuthFlowStore.getState().setStep("profile")
    useAuthFlowStore.getState().updateProfileField("countryCode", "US")
    const state = useAuthFlowStore.getState()
    expect(state.canProceed()).toBe(false)
  })

  it("returns true at sign step (login mode)", () => {
    useAuthFlowStore.getState().startLoginFlow()
    useAuthFlowStore.getState().setStep("sign")
    const state = useAuthFlowStore.getState()
    expect(state.canProceed()).toBe(true)
  })
})

describe("AuthFlowStore - step navigation", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("goes back from sign to choose (login mode)", () => {
    useAuthFlowStore.getState().startLoginFlow()
    useAuthFlowStore.getState().setStep("sign")
    useAuthFlowStore.getState().goBack()
    const state = useAuthFlowStore.getState()
    expect(state.step).toBe("choose")
  })

  it("goes back from sign to profile (register mode)", () => {
    useAuthFlowStore.getState().startRegisterFlow()
    useAuthFlowStore.getState().setStep("sign")
    useAuthFlowStore.getState().goBack()
    const state = useAuthFlowStore.getState()
    expect(state.step).toBe("profile")
  })

  it("goes back from profile to choose (register mode)", () => {
    useAuthFlowStore.getState().startRegisterFlow()
    useAuthFlowStore.getState().setStep("profile")
    useAuthFlowStore.getState().goBack()
    const state = useAuthFlowStore.getState()
    expect(state.step).toBe("choose")
  })
})

describe("AuthFlowStore - signAndSubmit", () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it("bails out if already signing in flight", async () => {
    useAuthFlowStore.setState({ isSigningInFlight: true })
    const result = await useAuthFlowStore.getState().signAndSubmit()
    expect(result).toBeUndefined()
  })

  it("handles missing wallet address", async () => {
    useAuthFlowStore.setState({
      isSigningInFlight: false,
      connection: { walletId: "freighter", address: null, pairingUri: null, protocol: null },
    })
    const result = await useAuthFlowStore.getState().signAndSubmit()
    expect(result).toBeUndefined()
    const state = useAuthFlowStore.getState()
    expect(state.status.status).toBe("error")
    expect(state.error?.code).toBe("internal_error")
  })
})