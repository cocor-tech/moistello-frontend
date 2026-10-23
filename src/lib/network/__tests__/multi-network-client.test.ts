import { describe, expect, it, vi } from "vitest"

import { NETWORK_CONFIG } from "../config"
import { MultiNetworkClient, type NetworkAdapter } from "../multi-network-client"

const adapterReporting = (passphrase: string): NetworkAdapter => ({
  getNetwork: vi.fn().mockResolvedValue({ passphrase }),
})

describe("MultiNetworkClient", () => {
  it("starts on the initial network and exposes its config", () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: vi.fn(),
    })

    expect(client.network).toBe("testnet")
    expect(client.config).toEqual(NETWORK_CONFIG.testnet)
  })

  it("returns the configured contract id for a known name", () => {
    const client = new MultiNetworkClient({
      initialNetwork: "mainnet",
      createAdapter: vi.fn(),
    })

    expect(client.getContractId("primary")).toBe(
      NETWORK_CONFIG.mainnet.contractIds.primary,
    )
  })

  it("throws naming the network when a contract is not configured", () => {
    const client = new MultiNetworkClient({
      initialNetwork: "mainnet",
      createAdapter: vi.fn(),
    })

    expect(() => client.getContractId("missing")).toThrow(
      'Contract "missing" is not configured for mainnet',
    )
  })

  it("does not build an adapter when switching to the network already active", async () => {
    const createAdapter = vi.fn()
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter,
    })

    await client.switchNetwork("testnet")

    expect(createAdapter).not.toHaveBeenCalled()
    expect(client.network).toBe("testnet")
  })

  it("switches once the RPC reports the target network's passphrase", async () => {
    const createAdapter = vi.fn(() =>
      adapterReporting(NETWORK_CONFIG.mainnet.networkPassphrase),
    )
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter,
    })

    await client.switchNetwork("mainnet")

    expect(createAdapter).toHaveBeenCalledWith(NETWORK_CONFIG.mainnet)
    expect(client.network).toBe("mainnet")
    expect(client.config.network).toBe("mainnet")
  })

  it("stays on the current network when the RPC reports a different passphrase", async () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: () => adapterReporting(NETWORK_CONFIG.testnet.networkPassphrase),
    })

    await expect(client.switchNetwork("mainnet")).rejects.toThrow(
      `RPC network mismatch for mainnet: expected ${NETWORK_CONFIG.mainnet.networkPassphrase}`,
    )
    expect(client.network).toBe("testnet")
  })

  it("stays on the current network when the RPC request itself fails", async () => {
    const client = new MultiNetworkClient({
      initialNetwork: "testnet",
      createAdapter: () => ({
        getNetwork: vi.fn().mockRejectedValue(new Error("RPC unreachable")),
      }),
    })

    await expect(client.switchNetwork("mainnet")).rejects.toThrow("RPC unreachable")
    expect(client.network).toBe("testnet")
  })
})
