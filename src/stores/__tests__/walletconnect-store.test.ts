import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/wallet/registry", () => ({
  getWalletRegistry: vi.fn(),
}))

vi.mock("@/lib/wallet/constants", () => ({
  WC2_QR_EXPIRATION_MS: 300000,
}))

import { useWalletConnectStore } from "@/stores/walletconnect-store"

describe("WalletConnectStore", () => {
  beforeEach(() => {
    useWalletConnectStore.setState({
      pairingUri: null,
      pairingState: "idle",
      relayStatus: "healthy",
      pairingError: null,
      qrExpiresAt: null,
    })
  })

  it("sets pairing URI and updates state", () => {
    const { setPairingUri } = useWalletConnectStore.getState()
    setPairingUri("uri://test")
    const state = useWalletConnectStore.getState()
    expect(state.pairingUri).toBe("uri://test")
    expect(state.pairingState).toBe("pairing")
    expect(state.qrExpiresAt).toBeGreaterThan(Date.now())
  })

  it("clears pairing URI and resets state", () => {
    const { setPairingUri, reset } = useWalletConnectStore.getState()
    setPairingUri("uri://test")
    reset()
    const state = useWalletConnectStore.getState()
    expect(state.pairingUri).toBeNull()
    expect(state.pairingState).toBe("idle")
    expect(state.qrExpiresAt).toBeNull()
  })

  it("sets pairing state", () => {
    const { setPairingState } = useWalletConnectStore.getState()
    setPairingState("connecting")
    expect(useWalletConnectStore.getState().pairingState).toBe("connecting")
  })

  it("sets pairing error", () => {
    const { setPairingError, setPairingState } = useWalletConnectStore.getState()
    setPairingError("Connection failed")
    expect(useWalletConnectStore.getState().pairingError).toBe("Connection failed")
    expect(useWalletConnectStore.getState().pairingState).toBe("error")
  })

  it("sets relay status", () => {
    const { setRelayStatus } = useWalletConnectStore.getState()
    setRelayStatus("degraded")
    expect(useWalletConnectStore.getState().relayStatus).toBe("degraded")
  })
})