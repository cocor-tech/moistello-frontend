import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AxiosError, InternalAxiosRequestConfig } from "axios"

const mockGetAccessToken = vi.fn(() => null)
const mockSetAccessToken = vi.fn()
const mockClearAccessToken = vi.fn()
const mockGetCsrfToken = vi.fn(() => undefined)
const mockLogger = { warn: vi.fn(), error: vi.fn() }

vi.mock("@/lib/auth/token-store", () => ({
  getAccessToken: mockGetAccessToken,
  setAccessToken: mockSetAccessToken,
  clearAccessToken: mockClearAccessToken,
}))

vi.mock("@/lib/auth/csrf", () => ({
  getCsrfToken: mockGetCsrfToken,
  getCsrfHeaders: vi.fn(() => ({})),
}))

vi.mock("@/lib/logger", () => ({ logger: mockLogger }))

vi.mock("@/lib/constants", () => ({ API_BASE_URL: "http://localhost:1100/v1" }))

vi.mock("axios", () => {
  const requestHandlers: Array<(c: InternalAxiosRequestConfig) => unknown> = []
  const responseHandlers: Array<(e: unknown) => unknown> = []
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: (fulfilled: (c: InternalAxiosRequestConfig) => unknown) => requestHandlers.push(fulfilled) },
      response: { use: (_fulfilled: unknown, rejected: (e: unknown) => unknown) => responseHandlers.push(rejected) },
    },
  }
  return {
    default: { create: vi.fn(() => client) },
    create: vi.fn(() => client),
    __testOnly: { requestHandlers, responseHandlers, client },
  }
})

import {
  clearApiClientState,
  getErrorMessage,
} from "@/lib/api-client"
import { __testOnly } from "axios"

afterEach(() => {
  vi.clearAllMocks()
  mockGetAccessToken.mockReturnValue(null)
})

describe("getErrorMessage", () => {
  it("maps AxiosError statuses to user-facing messages", () => {
    const build = (status: number): AxiosError =>
      ({
        isAxiosError: true,
        response: { status, data: {}, headers: {} },
        message: `Request failed with status code ${status}`,
      } as unknown as AxiosError)

    expect(getErrorMessage(build(400))).toBe("Invalid request. Please check your inputs.")
    expect(getErrorMessage(build(401))).toBe("Authentication required. Please log in.")
    expect(getErrorMessage(build(403))).toBe("You do not have permission to perform this action.")
    expect(getErrorMessage(build(404))).toBe("The requested resource was not found.")
    expect(getErrorMessage(build(409))).toBe("A conflict occurred. The resource may already exist.")
    expect(getErrorMessage(build(422))).toBe("Validation failed. Please check your inputs.")
    expect(getErrorMessage(build(429))).toBe("Too many requests. Please try again later.")
    expect(getErrorMessage(build(500))).toBe("Internal server error. Please try again later.")
    expect(getErrorMessage(build(599))).toBe(`Request failed with status code 599`)
  })

  it("uses the error body when present", () => {
    expect(
      getErrorMessage({
        isAxiosError: true,
        response: { status: 422, data: { error: "username taken" }, headers: {} },
        message: "bad",
      } as unknown as AxiosError),
    ).toBe("username taken")

    expect(
      getErrorMessage({
        isAxiosError: true,
        response: { status: 422, data: { message: "bad field" }, headers: {} },
        message: "bad",
      } as unknown as AxiosError),
    ).toBe("bad field")

    expect(
      getErrorMessage({
        isAxiosError: true,
        response: { status: 422, data: "plain string body", headers: {} },
        message: "bad",
      } as unknown as AxiosError),
    ).toBe("plain string body")
  })

  it("falls back to Error message and string errors", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom")
    expect(getErrorMessage("raw string")).toBe("raw string")
    expect(getErrorMessage({})).toBe("An unexpected error occurred.")
    expect(getErrorMessage(null)).toBe("An unexpected error occurred.")
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred.")
  })
})

describe("clearApiClientState", () => {
  it("clears the in-memory token and drops the in-flight refresh", () => {
    mockGetAccessToken.mockReturnValue("stored-token")
    clearApiClientState()
    expect(mockClearAccessToken).toHaveBeenCalledTimes(1)
  })
})

describe("request interceptor", () => {
  function requestHandler() {
    const fulfilled = __testOnly.requestHandlers[0]
    if (!fulfilled) throw new Error("Axios request interceptor is not configured")
    return fulfilled
  }

  it("attaches the bearer token when one is stored", async () => {
    mockGetAccessToken.mockReturnValue("access-token-123")
    const config = { url: "/wallets", method: "get", headers: {} } as InternalAxiosRequestConfig
    const result = await requestHandler()(config)
    expect(result.headers.Authorization).toBe("Bearer access-token-123")
  })

  it("leaves the request unchanged when no token is stored", async () => {
    mockGetAccessToken.mockReturnValue(null)
    const config = { url: "/wallets", method: "get", headers: {} } as InternalAxiosRequestConfig
    const result = await requestHandler()(config)
    expect(result.headers.Authorization).toBeUndefined()
  })
})
