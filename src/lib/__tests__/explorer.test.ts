import { describe, it, expect } from "vitest"
import { getExplorerTxUrl, getExplorerAddressUrl } from "../explorer"

describe("explorer utils", () => {
  describe("getExplorerTxUrl", () => {
    it("returns correct URL for testnet by default", () => {
      const hash = "1234567890abcdef"
      expect(getExplorerTxUrl(hash)).toBe(
        "https://stellar.expert/explorer/testnet/tx/1234567890abcdef"
      )
    })

    it("returns correct URL for testnet when explicitly specified", () => {
      const hash = "1234567890abcdef"
      expect(getExplorerTxUrl(hash, "testnet")).toBe(
        "https://stellar.expert/explorer/testnet/tx/1234567890abcdef"
      )
    })

    it("returns correct URL for mainnet", () => {
      const hash = "1234567890abcdef"
      expect(getExplorerTxUrl(hash, "mainnet")).toBe(
        "https://stellar.expert/explorer/public/tx/1234567890abcdef"
      )
    })
  })

  describe("getExplorerAddressUrl", () => {
    it("returns correct URL for testnet by default", () => {
      const address = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
      expect(getExplorerAddressUrl(address)).toBe(
        "https://stellar.expert/explorer/testnet/account/GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
      )
    })

    it("returns correct URL for testnet when explicitly specified", () => {
      const address = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
      expect(getExplorerAddressUrl(address, "testnet")).toBe(
        "https://stellar.expert/explorer/testnet/account/GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
      )
    })

    it("returns correct URL for mainnet", () => {
      const address = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
      expect(getExplorerAddressUrl(address, "mainnet")).toBe(
        "https://stellar.expert/explorer/public/account/GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
      )
    })
  })
})
