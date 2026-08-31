import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { User } from "@/types"

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock("@/lib/api-client", () => ({
  post: mockPost,
}))

vi.mock("@/lib/wallet/registry", () => ({
  getWalletRegistry: () => ({
    getAdapter: () => undefined,
  }),
}))

import { useAuthStore } from "@/stores/auth-store"
import { decryptFromStorage } from "@/lib/security/encryption"
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/token-store"

const USER_DATA_KEY = "moistello_user"
const getPassphrase = () =>
  `moistello-user-v1:${window.navigator.userAgent}-${window.screen.width}x${window.screen.height}`
const LEGACY_KEYS = [
  "moistello_token",
  "moistello_refresh",
  "moistello_access_token",
  "moistello_refresh_token",
]

const user: User = {
  id: "user-123",
  walletAddress: "GBD7M3GZ6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z",
  preferredLanguage: "en",
  moiScore: 250,
  createdAt: "2026-01-01T00:00:00.000Z",
}

/** Build a JWT-shaped token whose payload carries the given `exp` (seconds). */
function makeToken(expSeconds?: number): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
  const payload = btoa(JSON.stringify(expSeconds === undefined ? {} : { exp: expSeconds }))
  return `${header}.${payload}.signature`
}

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

function resetState() {
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    tokenExpiresAt: null,
  })
  clearAccessToken()
  localStorage.clear()
  mockPost.mockReset()
}

import { _setHmacKeyForTest } from "@/lib/wallet/hmac"

describe("useAuthStore", () => {
  beforeEach(() => {
    resetState()
    _setHmacKeyForTest("00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff")
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    resetState()
  })

  describe("setTokens", () => {
    it("marks the session authenticated and stores the token", async () => {
      const future = Math.floor(Date.now() / 1000) + 3600
      await useAuthStore.getState().setTokens(makeToken(future), "refresh-123", user)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe(makeToken(future))
      expect(state.tokenExpiresAt).toBe(future * 1000)
      expect(state.user).toEqual(user)
    })

    it("persists the token pair to the HttpOnly session cookie endpoint", async () => {
      await useAuthStore.getState().setTokens(makeToken(), "refresh-123")

      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe("/api/auth/session")
      expect(init.method).toBe("POST")
      expect(JSON.parse(init.body as string)).toEqual({
        token: makeToken(),
        refreshToken: "refresh-123",
      })
    })

    it("persists the user profile with an HMAC signature", async () => {
      await useAuthStore.getState().setTokens(makeToken(), "refresh-123", user)
      await new Promise((r) => setTimeout(r, 50))

      const stored =
        (await decryptFromStorage<{ user: User; hmac: string }>(USER_DATA_KEY, getPassphrase())) ??
        JSON.parse(localStorage.getItem(USER_DATA_KEY) ?? "null")
      expect(stored.user).toEqual(user)
      expect(typeof stored.hmac).toBe("string")
    })

    it("falls back to a 15-minute expiry when the token has no exp", async () => {
      vi.useFakeTimers()
      vi.setSystemTime(1_700_000_000_000)

      await useAuthStore.getState().setTokens(makeToken(undefined), "refresh-123")
      expect(useAuthStore.getState().tokenExpiresAt).toBe(1_700_000_000_000 + 15 * 60 * 1000)
      vi.useRealTimers()
    })
  })

  describe("checkAuth", () => {
    it("restores an unexpired in-memory token without touching the network", async () => {
      const future = Math.floor(Date.now() / 1000) + 3600
      setAccessToken(makeToken(future))

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe(makeToken(future))
      expect(state.isLoading).toBe(false)
      expect(mockPost).not.toHaveBeenCalled()
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("rehydrates the access token from the session cookie when memory is empty", async () => {
      const future = Math.floor(Date.now() / 1000) + 3600
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue(okJson({ authenticated: true, token: makeToken(future) }))

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe(makeToken(future))
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/session")
      expect(mockPost).not.toHaveBeenCalled()
    })

    it("logs out when the session cookie yields no token", async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue(new Response("{}", { status: 401 }))

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it("refreshes the profile via /auth/me when the token has expired", async () => {
      const expired = Math.floor(Date.now() / 1000) - 3600
      setAccessToken(makeToken(expired))
      mockPost.mockResolvedValue({ data: { user } })

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(mockPost).toHaveBeenCalledWith("/auth/me")
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(user)
      // The refreshed profile is persisted with its HMAC signature.
      await new Promise((r) => setTimeout(r, 50))
      const stored =
        (await decryptFromStorage<{ user: User; hmac: string }>(USER_DATA_KEY, getPassphrase())) ??
        JSON.parse(localStorage.getItem(USER_DATA_KEY) ?? "null")
      expect(stored.user).toEqual(user)
    })

    it("logs the user out when the token refresh fails", async () => {
      const expired = Math.floor(Date.now() / 1000) - 3600
      setAccessToken(makeToken(expired))
      mockPost.mockRejectedValue(new Error("refresh failed"))

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(getAccessToken()).toBeNull()
    })
  })

  describe("logout", () => {
    it("clears auth state and asks the server to drop the session", async () => {
      useAuthStore.setState({
        isAuthenticated: true,
        user,
        token: makeToken(),
        tokenExpiresAt: Date.now() + 1000,
      })
      localStorage.setItem(USER_DATA_KEY, JSON.stringify({ user, hmac: "x" }))
      localStorage.setItem("moistello_token", "legacy")
      mockPost.mockResolvedValue({ success: true })

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(mockPost).toHaveBeenCalledWith("/auth/logout")
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/session", expect.objectContaining({ method: "DELETE" }))
      expect(localStorage.getItem(USER_DATA_KEY)).toBeNull()
      expect(localStorage.getItem("moistello_token")).toBeNull()
    })
  })

  describe("clearTokens", () => {
    it("removes the in-memory token, stored user and legacy credential keys", async () => {
      setAccessToken(makeToken())
      useAuthStore.setState({ token: makeToken(), tokenExpiresAt: Date.now() + 1000 })
      localStorage.setItem(USER_DATA_KEY, JSON.stringify({ user, hmac: "x" }))
      for (const key of LEGACY_KEYS) localStorage.setItem(key, "legacy")

      await useAuthStore.getState().clearTokens()

      expect(getAccessToken()).toBeNull()
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().tokenExpiresAt).toBeNull()
      expect(localStorage.getItem(USER_DATA_KEY)).toBeNull()
      for (const key of LEGACY_KEYS) expect(localStorage.getItem(key)).toBeNull()
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/session", expect.objectContaining({ method: "DELETE" }))
    })
  })
})