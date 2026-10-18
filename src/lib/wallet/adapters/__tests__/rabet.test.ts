import { afterEach, describe, expect, it, vi } from "vitest"
import { createRabetAdapter } from "../rabet"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createRabetAdapter", () => {
  it("exposes Rabet metadata and reports an unavailable wallet", async () => {
    const adapter = createRabetAdapter()

    expect(adapter.meta.id).toBe("rabet")
    expect(adapter.meta.name).toBe("Rabet")
    expect(adapter.meta.category).toBe("extension")
    expect(adapter.meta.installUrl).toBe("https://rabet.io")
    expect(adapter.meta.isAvailable()).toBe(false)
    await expect(adapter.connect()).rejects.toMatchObject({
      adapter: "rabet",
      code: "not_installed",
    })
  })

  it("delegates connection, signing, network, and lifecycle calls to Rabet", async () => {
    const api = {
      connect: vi.fn().mockResolvedValue({ publicKey: "GABC" }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockResolvedValue(true),
      sign: vi.fn().mockResolvedValue({ xdr: "signed-xdr", signature: "signature" }),
      getPublicKey: vi.fn().mockResolvedValue("GABC"),
    }
    vi.stubGlobal("window", { rabet: api })

    const adapter = createRabetAdapter()

    expect(adapter.meta.isAvailable()).toBe(true)
    await expect(adapter.connect()).resolves.toEqual({ publicKey: "GABC" })
    await expect(adapter.isConnected()).resolves.toBe(true)
    await expect(adapter.getPublicKey()).resolves.toBe("GABC")
    await expect(adapter.signMessage("message")).resolves.toEqual({
      signature: "signature",
      publicKey: "GABC",
    })
    await expect(adapter.signTransaction("xdr", { network: "mainnet" })).resolves.toEqual({
      signedXdr: "signed-xdr",
    })
    await expect(adapter.getNetwork()).resolves.toBe("testnet")
    await expect(adapter.disconnect()).resolves.toBeUndefined()

    expect(api.connect).toHaveBeenCalledOnce()
    expect(api.sign).toHaveBeenNthCalledWith(1, "message", "testnet")
    expect(api.sign).toHaveBeenNthCalledWith(2, "xdr", "mainnet")
    expect(api.disconnect).toHaveBeenCalledOnce()
  })

  it("returns safe defaults when the wallet disappears", async () => {
    vi.stubGlobal("window", {})
    const adapter = createRabetAdapter()

    await expect(adapter.isConnected()).resolves.toBe(false)
    await expect(adapter.getNetwork()).resolves.toBe("testnet")
    await expect(adapter.signTransaction("xdr")).rejects.toMatchObject({ code: "not_installed" })
  })
})