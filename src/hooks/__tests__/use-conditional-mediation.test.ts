import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useConditionalMediation } from "../use-conditional-mediation"

const mockConnectStart = vi.fn()
const mockSetStep = vi.fn()
const mockCaptureAuthError = vi.fn()

const mockStore = {
  getState: vi.fn(() => ({ mode: "login" } as const)),
  connectStart: mockConnectStart,
  setStep: mockSetStep,
}

vi.mock("@/stores/auth-flow-store", () => ({
  useAuthFlowStore: mockStore,
}))

vi.mock("@/lib/monitoring", () => ({
  captureAuthError: mockCaptureAuthError,
}))

const originalPublicKeyCredential = window.PublicKeyCredential
const originalCredentials = navigator.credentials
const originalAbortController = window.AbortController

beforeEach(() => {
  vi.clearAllMocks()
  mockConnectStart.mockClear()
  mockSetStep.mockClear()
  mockCaptureAuthError.mockClear()
  mockStore.getState.mockReturnValue({ mode: "login" })
  window.PublicKeyCredential = originalPublicKeyCredential
  navigator.credentials = originalCredentials
  window.AbortController = originalAbortController
})

afterEach(() => {
  window.PublicKeyCredential = originalPublicKeyCredential
  navigator.credentials = originalCredentials
  window.AbortController = originalAbortController
})

function installBrowserApis({
  mediationAvailable = true,
  credential = { id: "cred-1", rawId: new ArrayBuffer(8), type: "public-key" as const },
  credentialError,
}: {
  mediationAvailable?: boolean
  credential?: unknown
  credentialError?: unknown
} = {}) {
  window.PublicKeyCredential = {
    isConditionalMediationAvailable: vi.fn(() => Promise.resolve(mediationAvailable)),
  } as unknown

  const get = vi.fn()
  if (credentialError) {
    get.mockRejectedValue(credentialError)
  } else {
    get.mockResolvedValue(credential)
  }
  navigator.credentials = { get } as unknown

  window.AbortController = class {
    signal = { aborted: false }
    abort = vi.fn()
  } as unknown as typeof AbortController

  return { get }
}

describe("useConditionalMediation", () => {
  it("returns an abort function", () => {
    installBrowserApis()
    const { result } = renderHook(() => useConditionalMediation())
    expect(typeof result.current).toBe("function")
  })

  it("skips the flow when PublicKeyCredential is unavailable", () => {
    window.PublicKeyCredential = undefined
    const { get } = installBrowserApis()
    renderHook(() => useConditionalMediation())
    expect(get).not.toHaveBeenCalled()
  })

  it("skips the flow when the store mode is not login", async () => {
    mockStore.getState.mockReturnValue({ mode: "register" })
    const { get } = installBrowserApis()
    renderHook(() => useConditionalMediation())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(get).not.toHaveBeenCalled()
    expect(mockConnectStart).not.toHaveBeenCalled()
    expect(mockSetStep).not.toHaveBeenCalled()
    expect(mockCaptureAuthError).not.toHaveBeenCalled()
  })

  it("connects passkey and advances to sign step when mediation is available", async () => {
    const { get } = installBrowserApis()
    renderHook(() => useConditionalMediation())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(get).toHaveBeenCalledTimes(1)
    const options = get.mock.calls[0][0]
    expect(options.mediation).toBe("conditional")
    expect(mockConnectStart).toHaveBeenCalledWith("passkey")
    expect(mockSetStep).toHaveBeenCalledWith("sign")
    expect(mockCaptureAuthError).not.toHaveBeenCalled()
  })

  it("ignores AbortError without reporting it", async () => {
    const { get } = installBrowserApis({
      credentialError: Object.assign(new Error("The operation was aborted."), { name: "AbortError" }),
    })
    renderHook(() => useConditionalMediation())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockCaptureAuthError).not.toHaveBeenCalled()
    expect(mockConnectStart).not.toHaveBeenCalled()
  })

  it("reports non-abort errors to captureAuthError", async () => {
    const { get } = installBrowserApis({
      credentialError: new Error("boom"),
    })
    renderHook(() => useConditionalMediation())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockCaptureAuthError).toHaveBeenCalledTimes(1)
    expect(mockCaptureAuthError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(mockCaptureAuthError.mock.calls[0][1]).toMatchObject({
      step: "choose",
      mode: "login",
      errorCode: "internal_error",
    })
  })

  it("aborts the in-flight controller on unmount", async () => {
    const { get } = installBrowserApis()
    const { unmount } = renderHook(() => useConditionalMediation())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    unmount()
    expect(get).toHaveBeenCalled()
  })
})
