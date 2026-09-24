import { logger } from "@/lib/logger"
export type TransportType = "webusb" | "webble" | "none"

export interface LedgerTransport {
  type: TransportType
  create(): Promise<unknown>
  isSupported(): boolean
}

const LEDGER_VENDOR_ID = 0x2c97
const PING_INTERVAL_MS = 5000
const MAX_PING_FAILURES = 3
const RECONNECT_TIMEOUT_MS = 60_000
const RECONNECT_POLL_MS = 2000

export function detectAvailableTransport(): TransportType {
  if (typeof window === "undefined") return "none"
  if (typeof navigator === "undefined") return "none"

  const hasWebUSB = "usb" in navigator && typeof (navigator.usb as { getDevices?: () => unknown }).getDevices === "function"
  if (hasWebUSB) {
    return "webusb"
  }

  const hasWebBLE = "bluetooth" in navigator && typeof (navigator.bluetooth as { requestDevice?: () => unknown }).requestDevice === "function"
  if (hasWebBLE) {
    return "webble"
  }

  return "none"
}

export async function createTransport(type: TransportType): Promise<LedgerTransport> {
  switch (type) {
    case "webusb": {
      const TransportWebUSB = (await import("@ledgerhq/hw-transport-webusb")).default
      return {
        type: "webusb",
        isSupported: () => "usb" in navigator,
        create: async () => TransportWebUSB.create(),
      }
    }
    case "webble": {
      try {
        const TransportWebBLE = (await import("@ledgerhq/hw-transport-web-ble")).default
        return {
          type: "webble",
          isSupported: () => "bluetooth" in navigator,
          create: async () => TransportWebBLE.create(),
        }
      } catch {
        throw new Error(
          "Web Bluetooth is not available in this browser. Try Chrome on Android or desktop.",
        )
      }
    }
    default:
      throw new Error(
        "No compatible transport available. Connect your Ledger via USB on desktop or Bluetooth on mobile.",
      )
  }
}

export async function enumerateAuthorizedDevices(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!("usb" in navigator)) return false
  try {
    const devices = await (navigator.usb as { getDevices: () => Promise<Array<{ vendorId: number }>> }).getDevices()
    return devices.some(d => d.vendorId === LEDGER_VENDOR_ID)
  } catch {
    return false
  }
}

export function getTransportDescription(type: TransportType): string {
  switch (type) {
    case "webusb":
      return "Connect your Ledger to your computer via USB cable"
    case "webble":
      return "Open Bluetooth settings and connect your Ledger"
    case "none":
      return "Your browser does not support hardware wallet connections. Try Chrome on desktop."
  }
}

export function getTransportIcon(type: TransportType): string {
  switch (type) {
    case "webusb":
      return "USB"
    case "webble":
      return "Bluetooth"
    case "none":
      return "NotSupported"
  }
}

export function isHardwareWalletSupported(): boolean {
  return detectAvailableTransport() !== "none"
}

export type ConnectionState =
  | "idle"
  | "detecting"
  | "connecting"
  | "waiting_for_app"
  | "waiting_for_confirm"
  | "connected"
  | "disconnected"
  | "error"
  | "waiting_for_reconnect"

export type ReconnectCallback = (state: ConnectionState) => void

export class LedgerTransportManager {
  private transportInstance: unknown = null
  private transportType: TransportType = "none"
  private connectionState: ConnectionState = "idle"
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private pingFailures = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectPollTimer: ReturnType<typeof setInterval> | null = null
  private onStateChange: ReconnectCallback | null = null
  private deviceSerial: string | null = null
  private cachedBLEDevice: unknown = null

  constructor(onStateChange?: ReconnectCallback) {
    this.onStateChange = onStateChange ?? null
  }

  getState(): ConnectionState {
    return this.connectionState
  }

  getTransportType(): TransportType {
    return this.transportType
  }

  getTransport(): unknown {
    return this.transportInstance
  }

  private setState(state: ConnectionState): void {
    this.connectionState = state
    this.onStateChange?.(state)
  }

  async detectAndCreateTransport(): Promise<{ transport: unknown; type: TransportType }> {
    if (typeof window === "undefined") {
      throw { adapter: "ledger" as const, code: "ledger_unsupported_browser" as const, message: "SSR: no browser APIs available", browser: "ssr" }
    }

    this.setState("detecting")
    const type = detectAvailableTransport()

    if (type === "none") {
      const ua = navigator.userAgent
      this.setState("error")
      throw {
        adapter: "ledger" as const,
        code: "ledger_unsupported_browser" as const,
        message: "Ledger requires Chrome, Edge, or Brave browser.",
        browser: ua,
      }
    }

    this.transportType = type
    this.setState("connecting")

    try {
      const transportFactory = await createTransport(type)
      const transport = await transportFactory.create()
      this.transportInstance = transport
      this.setupDisconnectHandlers()
      return { transport, type }
    } catch (err: unknown) {
      this.setState("error")
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("denied") || msg.includes("cancel") || msg.includes("cancelled")) {
        throw { adapter: "ledger" as const, code: "user_rejected" as const, message: "Connection cancelled on Ledger device." }
      }
      throw {
        adapter: "ledger" as const,
        code: "ledger_device_not_found" as const,
        message: "Ledger not detected. Is it plugged in and unlocked?",
        transportType: type,
      }
    }
  }

  private setupDisconnectHandlers(): void {
    if (typeof window === "undefined") return
    if (!this.transportInstance) return

    const transport = this.transportInstance as Record<string, unknown>

    if (typeof transport.on === "function") {
      transport.on("disconnect", () => {
        this.handleDisconnect("device_unplugged")
      })
    }

    if (this.transportType === "webusb") {
      try {
        const nav = navigator as unknown as { usb?: { addEventListener?: (event: string, handler: (e: Event) => void) => void } }
        const usb = nav.usb
        usb?.addEventListener?.("disconnect", (event: Event) => {
          const e = event as CustomEvent<{ device: { serialNumber?: string } }>
          if (e.detail?.device && e.detail.device.serialNumber === this.deviceSerial) {
            this.handleDisconnect("usb_unplugged")
          }
        })
      } catch (e) {
        logger.warn("[ledger] Failed to register USB disconnect handler:", e)
      }
    }

    if (this.transportType === "webble") {
      this.startPingMonitor()
    }
  }

  private startPingMonitor(): void {
    this.stopPingMonitor()
    this.pingFailures = 0
    this.pingInterval = setInterval(async () => {
      try {
        await this.pingDevice()
        this.pingFailures = 0
      } catch {
        this.pingFailures++
        if (this.pingFailures >= MAX_PING_FAILURES) {
          this.handleDisconnect("ble_out_of_range")
        }
      }
    }, PING_INTERVAL_MS)
  }

  private stopPingMonitor(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private async pingDevice(): Promise<boolean> {
    if (!this.transportInstance) return false
    try {
      const sendCustom = (this.transportInstance as { sendCustom?: (...args: unknown[]) => Promise<unknown> }).sendCustom
      if (typeof sendCustom === "function") {
        await sendCustom(
          new Uint8Array([0xE0, 0x01, 0x00, 0x00, 0x00])
        )
      }
      return true
    } catch {
      return false
    }
  }

  private handleDisconnect(cause: string): void {
    if (this.connectionState === "disconnected" || this.connectionState === "waiting_for_reconnect") return

    this.setState("disconnected")
    this.stopPingMonitor()
    this.broadcastEvent("ledger_disconnected", { cause })
    this.attemptReconnect()
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.reconnectPollTimer) clearInterval(this.reconnectPollTimer)

    this.setState("waiting_for_reconnect")
    let elapsed = 0

    this.reconnectPollTimer = setInterval(async () => {
      elapsed += RECONNECT_POLL_MS
      if (elapsed >= RECONNECT_TIMEOUT_MS) {
        this.reconnectFailed()
        return
      }

      try {
        if (this.transportType === "webusb") {
          const hasDevice = await enumerateAuthorizedDevices()
          if (hasDevice) {
            await this.performReconnect()
          }
        }
      } catch (e) {
        logger.warn("[ledger] Reconnect poll failed:", e)
      }
    }, RECONNECT_POLL_MS)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectFailed()
    }, RECONNECT_TIMEOUT_MS)
  }

  private async performReconnect(): Promise<void> {
    this.cleanupReconnectTimers()
    try {
      const transportFactory = await createTransport(this.transportType)
      const transport = await transportFactory.create()
      this.transportInstance = transport
      this.setState("connected")
      this.broadcastEvent("ledger_reconnected", {})
      if (this.transportType === "webble") {
        this.startPingMonitor()
      }
    } catch {
      this.setState("waiting_for_reconnect")
    }
  }

  private reconnectFailed(): void {
    this.cleanupReconnectTimers()
    this.setState("error")
    this.transportInstance = null
    this.broadcastEvent("ledger_reconnect_failed", {})
  }

  private cleanupReconnectTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.reconnectPollTimer) {
      clearInterval(this.reconnectPollTimer)
      this.reconnectPollTimer = null
    }
  }

  private broadcastEvent(type: string, data: Record<string, unknown>): void {
    if (typeof window === "undefined") return
    try {
      const channel = new BroadcastChannel("moistello-wallet")
      channel.postMessage({ type, ...data })
      channel.close()
    } catch (e) {
      logger.warn("[ledger] BroadcastChannel unavailable:", e)
    }
  }

  async closeTransport(): Promise<void> {
    this.stopPingMonitor()
    this.cleanupReconnectTimers()
    this.cachedBLEDevice = null
    this.deviceSerial = null
    this.pingFailures = 0

    if (this.transportInstance) {
      try {
        const transport = this.transportInstance as { close?: () => Promise<void> }
        if (typeof transport.close === "function") {
          await transport.close()
        }
      } catch (e) {
        logger.warn("[ledger] Failed to close transport:", e)
      }
      this.transportInstance = null
    }

    this.transportType = "none"
    this.setState("idle")
  }

  destroy(): void {
    this.closeTransport()
    this.onStateChange = null
  }
}

export function createTransportManager(): LedgerTransportManager {
  return new LedgerTransportManager()
}
