import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/wallet/balance-cache", () => ({
  fetchBalanceWithBackoff: vi.fn(),
}))

import {
  connectFreighter,
  formatStroopsToXLM,
  formatXLMToStroops,
  getFreighterPublicKey,
  getNetworkDetails,
  isFreighterInstalled,
  signMessage,
} from "@/lib/stellar"

describe("stellar helpers", () => {
  it("formats stroops and XLM without losing fractional precision", () => {
    expect(formatStroopsToXLM("0")).toBe("0.0000000")
    expect(formatStroopsToXLM("10000000")).toBe("1.0000000")
    expect(formatStroopsToXLM("12345678")).toBe("1.2345678")
    expect(formatXLMToStroops("1")).toBe("10000000")
    expect(formatXLMToStroops("1.25")).toBe("12500000")
    expect(formatXLMToStroops("0.0000001")).toBe("1")
  })

  it("reports the configured testnet details", async () => {
    await expect(getNetworkDetails()).resolves.toEqual({
      network: "testnet",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
  })

  it("detects a missing Freighter extension and reports a useful error", async () => {
    delete (window as Window & { freighterApi?: unknown }).freighterApi
    expect(isFreighterInstalled()).toBe(false)
    await expect(connectFreighter()).rejects.toThrow("Freighter wallet is not installed")
  })

  it("connects, reads the public key, and signs through Freighter", async () => {
    const freighterApi = {
      isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
      getPublicKey: vi.fn().mockResolvedValue({ publicKey: "GABC" }),
      signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "signed-xdr" }),
    }
    ;(window as Window & { freighterApi?: typeof freighterApi }).freighterApi = freighterApi

    await expect(connectFreighter()).resolves.toBe("GABC")
    await expect(getFreighterPublicKey()).resolves.toBe("GABC")
    await expect(signMessage("hello")).resolves.toBe("signed-xdr")
    expect(freighterApi.signTransaction).toHaveBeenCalledWith(
      expect.stringContaining("aGVsbG8="),
      expect.objectContaining({
        network: "testnet",
        networkPassphrase: "Test SDF Network ; September 2015",
      }),
    )
  })
})