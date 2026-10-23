import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockWebUSBCreate = vi.fn()
const mockWebBLECreate = vi.fn()

vi.mock("@ledgerhq/hw-transport-webusb", () => ({ default: { create: mockWebUSBCreate } }))
vi.mock("@ledgerhq/hw-transport-web-ble", () => ({ default: { create: mockWebBLECreate } }))
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))

import {
  createTransport,
  createTransportManager,
  detectAvailableTransport,
  enumerateAuthorizedDevices,
  getTransportDescription,
  getTransportIcon,
  isHardwareWalletSupported,
  type LedgerTransportManager,
  type TransportType,
} from "../ledger-transport"

const originalBroadcastChannel = window.BroadcastChannel
const originalNavigator = navigator

beforeEach(() => {
  vi.clearAllMocks()
  mockWebUSBCreate.mockClear()
  mockWebBLECreate.mockClear()
  Object.defineProperty(window, "BroadcastChannel", {
    writable: true,
    value: class {
      postMessage = vi.fn()
      close = vi.fn()
    },
  })
})

afterEach(() => {
  ;(navigator as unknown) = originalNavigator
  window.BroadcastChannel = originalBroadcastChannel
})

function setNavigator(usb?: unknown, bluetooth?: unknown) {
  const nav: Record<string, unknown> = {}
  if (usb !== undefined) nav.usb = usb
  if (bluetooth !== undefined) nav.bluetooth = bluetooth
  ;(navigator as unknown) = nav
}

describe("detectAvailableTransport", () => {
  it("returns none when navigator lacks usb and bluetooth", () => {
    setNavigator()
    expect(detectAvailableTransport()).toBe("none")
  })

  it("returns webusb when navigator.usb.getDevices exists", () => {
    setNavigator({ getDevices: () => [] })
    expect(detectAvailableTransport()).toBe("webusb")
  })

  it("returns webble when only bluetooth.requestDevice exists", () => {
    setNavigator(undefined, { requestDevice: () => null })
    expect(detectAvailableTransport()).toBe("webble")
  })

  it("prefers webusb over webble", () => {
    setNavigator({ getDevices: () => [] }, { requestDevice: () => null })
    expect(detectAvailableTransport()).toBe("webusb")
  })
})

describe("createTransport", () => {
  it("throws for the none transport", async () => {
    await expect(createTransport("none")).rejects.toThrow(
      "No compatible transport available",
    )
  })

  it("builds a webusb transport factory", async () => {
    mockWebUSBCreate.mockResolvedValue({ device: "usb-1" })
    const transport = await createTransport("webusb")
    expect(transport.type).toBe("webusb")
    expect(typeof transport.create).toBe("function")
    expect(typeof transport.isSupported).toBe("function")
    await expect(transport.create()).resolves.toEqual({ device: "usb-1" })
    expect(mockWebUSBCreate).toHaveBeenCalledTimes(1)
  })

  it("throws when web ble import fails", async () => {
    mockWebBLECreate.mockRejectedValue(new Error("ble not available"))
    await expect(createTransport("webble")).rejects.toThrow(
      "Web Bluetooth is not available in this browser",
    )
  })
})

describe("enumerateAuthorizedDevices", () => {
  it("returns false when there is no usb", async () => {
    setNavigator()
    await expect(enumerateAuthorizedDevices()).resolves.toBe(false)
  })

  it("returns true when a ledger vendor id is authorised", async () => {
    setNavigator({ getDevices: () => [{ vendorId: 0x2c97 }] })
    await expect(enumerateAuthorizedDevices()).resolves.toBe(true)
  })

  it("returns false when no authorised device is present", async () => {
    setNavigator({ getDevices: () => [{ vendorId: 0x1234 }] })
    await expect(enumerateAuthorizedDevices()).resolves.toBe(false)
  })
})

describe("descriptions and icons", () => {
  it.each([
    ["webusb", "Connect your Ledger to your computer via USB cable", "USB"],
    ["webble", "Open Bluetooth settings and connect your Ledger", "Bluetooth"],
    ["none", "Your browser does not support hardware wallet connections. Try Chrome on desktop.", "NotSupported"],
  ] as const)("maps %s", (type, description, icon) => {
    expect(getTransportDescription(type as TransportType)).toBe(description)
    expect(getTransportIcon(type as TransportType)).toBe(icon)
  })
})

describe("isHardwareWalletSupported", () => {
  it("mirrors detectAvailableTransport !== none", () => {
    setNavigator()
    expect(isHardwareWalletSupported()).toBe(false)
    setNavigator({ getDevices: () => [] })
    expect(isHardwareWalletSupported()).toBe(true)
  })
})

describe("LedgerTransportManager", () => {
  it("starts idle with no transport", () => {
    const manager = createTransportManager()
    expect(manager.getState()).toBe("idle")
    expect(manager.getTransportType()).toBe("none")
    expect(manager.getTransport()).toBeNull()
  })

  it("detects and creates a webusb transport", async () => {
    setNavigator({ getDevices: () => [] })
    mockWebUSBCreate.mockResolvedValue({ device: "usb-1" })
    const manager = createTransportManager()
    const result = await manager.detectAndCreateTransport()
    expect(result.type).toBe("webusb")
    expect(manager.getState()).toBe("connected")
    expect(manager.getTransportType()).toBe("webusb")
    expect(result.transport).toEqual({ device: "usb-1" })
  })

  it("throws user_rejected when the user cancels", async () => {
    setNavigator({ getDevices: () => [] })
    mockWebUSBCreate.mockRejectedValue(new Error("Connection was denied by the user"))
    const manager = createTransportManager()
    await expect(manager.detectAndCreateTransport()).rejects.toMatchObject({
      code: "user_rejected",
    })
  })

  it("throws device not found for other create failures", async () => {
    setNavigator({ getDevices: () => [] })
    mockWebUSBCreate.mockRejectedValue(new Error("no device"))
    const manager = createTransportManager()
    await expect(manager.detectAndCreateTransport()).rejects.toMatchObject({
      code: "ledger_device_not_found",
    })
  })

  it("closes the transport and returns to idle", async () => {
    setNavigator({ getDevices: () => [] })
    mockWebUSBCreate.mockResolvedValue({ close: vi.fn().mockResolvedValue(undefined) })
    const manager = createTransportManager()
    await manager.detectAndCreateTransport()
    await manager.closeTransport()
    expect(manager.getState()).toBe("idle")
    expect(manager.getTransportType()).toBe("none")
    expect(manager.getTransport()).toBeNull()
  })

  it("drops the state change callback on destroy", () => {
    const onStateChange = vi.fn()
    const manager = createTransportManager(onStateChange)
    manager.destroy()
    expect(manager.getState()).toBe("idle")
  })
})
