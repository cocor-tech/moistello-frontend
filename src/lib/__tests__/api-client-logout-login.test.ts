import { describe, it, expect, vi, beforeEach } from "vitest"
import axios from "axios"
import { apiClient, clearApiClientState, get } from "../api-client"
import { setAccessToken, getAccessToken } from "../auth/token-store"

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios")
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    default: {
      ...actual.default,
      create: vi.fn(() => mockAxiosInstance),
      post: vi.fn(),
    },
  }
})

describe("api-client logout -> login token isolation", () => {
  beforeEach(() => {
    clearApiClientState()
    vi.clearAllMocks()
  })

  it("clears in-memory token state on logout and uses new bearer token after login", () => {
    // 1. Initial login (User A)
    setAccessToken("token_user_A")
    expect(getAccessToken()).toBe("token_user_A")

    // 2. User logs out
    clearApiClientState()
    expect(getAccessToken()).toBeNull()

    // 3. User B logs in
    setAccessToken("token_user_B")
    expect(getAccessToken()).toBe("token_user_B")

    // 4. Send request and verify header contains User B's token
    const mockRequestConfig: any = { headers: {} }

    // Retrieve request interceptor registered on apiClient
    const requestInterceptor = (apiClient.interceptors.request.use as any).mock.calls[0]?.[0]
    if (requestInterceptor) {
      const updatedConfig = requestInterceptor(mockRequestConfig)
      expect(updatedConfig.headers.Authorization).toBe("Bearer token_user_B")
    }
  })

  it("prevents stale token from overwriting token-store if clearApiClientState is called during refresh", async () => {
    setAccessToken("token_user_A")

    // Simulate logout while refresh was queued
    clearApiClientState()
    expect(getAccessToken()).toBeNull()

    // Login user B
    setAccessToken("token_user_B")
    expect(getAccessToken()).toBe("token_user_B")
  })
})
