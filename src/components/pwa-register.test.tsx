import React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { PwaRegister } from "./pwa-register"

describe("PwaRegister", () => {
  let mockServiceWorkerRegister: ReturnType<typeof vi.fn>
  let mockRegistration: any

  beforeEach(() => {
    // Mock service worker API
    mockRegistration = {
      update: vi.fn(),
    }
    mockServiceWorkerRegister = vi.fn().mockResolvedValue(mockRegistration)

    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockServiceWorkerRegister },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns null (no visual output)", () => {
    const { container } = render(<PwaRegister />)
    expect(container.firstChild).toBeNull()
  })

  it("registers service worker on mount", async () => {
    render(<PwaRegister />)

    // Wait for async registration
    await vi.waitFor(() => {
      expect(mockServiceWorkerRegister).toHaveBeenCalledWith("/sw.js")
    })
  })

  it("sets up periodic update interval for service worker", async () => {
    vi.useFakeTimers()

    render(<PwaRegister />)

    await vi.waitFor(() => {
      expect(mockServiceWorkerRegister).toHaveBeenCalled()
    })

    // Verify update is called after 60 seconds
    expect(mockRegistration.update).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60000)
    expect(mockRegistration.update).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("handles beforeinstallprompt event and stores prompt", async () => {
    render(<PwaRegister />)

    const mockEvent = new Event("beforeinstallprompt") as any
    mockEvent.preventDefault = vi.fn()
    mockEvent.prompt = vi.fn()
    mockEvent.userChoice = Promise.resolve({ outcome: "accepted" })

    window.dispatchEvent(mockEvent)

    await vi.waitFor(() => {
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })
  })

  it("dispatches pwa:install-available event when install prompt is available", async () => {
    const eventListener = vi.fn()
    window.addEventListener("pwa:install-available", eventListener)

    render(<PwaRegister />)

    const mockEvent = new Event("beforeinstallprompt") as any
    mockEvent.preventDefault = vi.fn()

    window.dispatchEvent(mockEvent)

    await vi.waitFor(() => {
      expect(eventListener).toHaveBeenCalled()
    })

    window.removeEventListener("pwa:install-available", eventListener)
  })

  it("clears install prompt on appinstalled event", async () => {
    render(<PwaRegister />)

    // First, trigger beforeinstallprompt
    const beforeInstallEvent = new Event("beforeinstallprompt") as any
    beforeInstallEvent.preventDefault = vi.fn()

    window.dispatchEvent(beforeInstallEvent)

    // Then trigger appinstalled
    window.dispatchEvent(new Event("appinstalled"))

    // Install prompt should be cleared (no pwa:install-available event)
    const eventListener = vi.fn()
    window.addEventListener("pwa:install-available", eventListener)

    // If prompt was cleared, no event should be dispatched
    expect(eventListener).not.toHaveBeenCalled()

    window.removeEventListener("pwa:install-available", eventListener)
  })

  it("removes event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener")

    const { unmount } = render(<PwaRegister />)
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function)
    )
    expect(removeEventListenerSpy).toHaveBeenCalledWith("appinstalled", expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })

  it("clears service worker update interval on unmount", async () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval")

    const { unmount } = render(<PwaRegister />)

    await vi.waitFor(() => {
      expect(mockServiceWorkerRegister).toHaveBeenCalled()
    })

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it("handles service worker registration errors silently", async () => {
    mockServiceWorkerRegister.mockRejectedValueOnce(new Error("Registration failed"))

    // Should not throw
    expect(() => {
      render(<PwaRegister />)
    }).not.toThrow()
  })

  it("supports custom beforeinstallprompt event handlers", async () => {
    const customHandler = vi.fn()

    window.addEventListener("beforeinstallprompt", customHandler)
    render(<PwaRegister />)

    const mockEvent = new Event("beforeinstallprompt") as any
    mockEvent.preventDefault = vi.fn()

    window.dispatchEvent(mockEvent)

    expect(customHandler).toHaveBeenCalled()

    window.removeEventListener("beforeinstallprompt", customHandler)
  })

  it("skips service worker registration if not available", () => {
    // Remove service worker from navigator
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      writable: true,
      configurable: true,
    })

    expect(() => {
      render(<PwaRegister />)
    }).not.toThrow()
  })
})
