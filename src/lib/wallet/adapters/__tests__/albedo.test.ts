import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { createAlbedoAdapter } from "@/lib/wallet/adapters/albedo"

const PUBLIC_KEY = "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"

type AlbedoMock = {
  publicKey: ReturnType<typeof vi.fn>
  tx: ReturnType<typeof vi.fn>
  sign: ReturnType<typeof vi.fn>
}

function installAlbedo(): AlbedoMock {
  const api: AlbedoMock = {
    publicKey: vi.fn().mockResolvedValue({ pubkey: PUBLIC_KEY }),
    tx: vi.fn().mockResolvedValue({ xdr: "unsigned", signed_envelope_xdr: "signed-xdr" }),
    sign: vi.fn().mockResolvedValue({ signature: "sig-123" }),
  }
  const injected = window as unknown as Record<string, unknown>
  injected.albedo = api
  return api
}

function removeAlbedo() {
  const injected = window as unknown as Record<string, unknown>
  delete injected.albedo
}

const notInstalled = {
  adapter: "albedo",
  code: "not_installed",
  message: "Albedo is not installed",
}

describe("Albedo wallet adapter", () => {
  beforeEach(() => {
    removeAlbedo()
  })

  afterEach(() => {
    removeAlbedo()
    vi.restoreAllMocks()
  })

  describe("meta", () => {
    it("describes the Albedo extension wallet", () => {
      const { meta } = createAlbedoAdapter()

      expect(meta).toMatchObject({
        id: "albedo",
        name: "Albedo",
        category: "extension",
        installUrl: "https://albedo.link",
        priority: 4,
      })
    })

    it("reports unavailable until window.albedo is injected", () => {
      const { meta } = createAlbedoAdapter()
      expect(meta.isAvailable()).toBe(false)

      installAlbedo()

      expect(meta.isAvailable()).toBe(true)
    })
  })

  describe("when Albedo is not installed", () => {
    it("connect rejects with a not_installed wallet error", async () => {
      await expect(createAlbedoAdapter().connect()).rejects.toEqual(notInstalled)
    })

    it("getPublicKey rejects with a not_installed wallet error", async () => {
      await expect(createAlbedoAdapter().getPublicKey()).rejects.toMatchObject({
        adapter: "albedo",
        code: "not_installed",
      })
    })

    it("signMessage rejects with a not_installed wallet error", async () => {
      await expect(createAlbedoAdapter().signMessage("hello")).rejects.toMatchObject({
        code: "not_installed",
      })
    })

    it("signTransaction rejects with a not_installed wallet error", async () => {
      await expect(createAlbedoAdapter().signTransaction("xdr")).rejects.toMatchObject({
        code: "not_installed",
      })
    })

    it("isConnected resolves to false", async () => {
      await expect(createAlbedoAdapter().isConnected()).resolves.toBe(false)
    })
  })

  describe("when Albedo is installed", () => {
    it("connect returns the public key from Albedo", async () => {
      const api = installAlbedo()

      const result = await createAlbedoAdapter().connect()

      expect(result).toEqual({ publicKey: PUBLIC_KEY })
      expect(api.publicKey).toHaveBeenCalledTimes(1)
    })

    it("getPublicKey returns the public key string", async () => {
      installAlbedo()

      await expect(createAlbedoAdapter().getPublicKey()).resolves.toBe(PUBLIC_KEY)
    })

    it("isConnected is true when Albedo returns a key", async () => {
      installAlbedo()

      await expect(createAlbedoAdapter().isConnected()).resolves.toBe(true)
    })

    it("isConnected is false when Albedo refuses the request", async () => {
      const api = installAlbedo()
      api.publicKey.mockRejectedValueOnce(new Error("user closed popup"))

      await expect(createAlbedoAdapter().isConnected()).resolves.toBe(false)
    })

    it("signMessage signs with the connected key and returns both", async () => {
      const api = installAlbedo()

      const result = await createAlbedoAdapter().signMessage("hello stellar")

      expect(api.sign).toHaveBeenCalledWith({ message: "hello stellar", pubkey: PUBLIC_KEY })
      expect(result).toEqual({ signature: "sig-123", publicKey: PUBLIC_KEY })
    })

    it("signTransaction defaults to testnet and returns the signed envelope", async () => {
      const api = installAlbedo()

      const result = await createAlbedoAdapter().signTransaction("unsigned-xdr")

      expect(api.tx).toHaveBeenCalledWith({ xdr: "unsigned-xdr", network: "testnet" })
      expect(result).toEqual({ signedXdr: "signed-xdr" })
    })

    it("signTransaction passes through the requested network", async () => {
      const api = installAlbedo()

      await createAlbedoAdapter().signTransaction("unsigned-xdr", { network: "mainnet" })

      expect(api.tx).toHaveBeenCalledWith({ xdr: "unsigned-xdr", network: "mainnet" })
    })
  })

  describe("network and lifecycle", () => {
    it("always reports testnet", async () => {
      await expect(createAlbedoAdapter().getNetwork()).resolves.toBe("testnet")
    })

    it("disconnect resolves without touching Albedo", async () => {
      const api = installAlbedo()

      await expect(createAlbedoAdapter().disconnect()).resolves.toBeUndefined()
      expect(api.publicKey).not.toHaveBeenCalled()
    })
  })
})
