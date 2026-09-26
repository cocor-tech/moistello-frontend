import { SupportedNetwork } from "./network/config"

/**
 * Returns the Stellar Expert explorer URL for a given transaction hash.
 * @param txnHash - The transaction hash.
 * @param network - "testnet" | "mainnet", defaults to "testnet".
 */
export function getExplorerTxUrl(
  txnHash: string,
  network: SupportedNetwork = "testnet"
): string {
  const netSegment = network === "mainnet" ? "public" : "testnet"
  return `https://stellar.expert/explorer/${netSegment}/tx/${txnHash}`
}

/**
 * Returns the Stellar Expert explorer URL for a given account address.
 * @param address - The Stellar account address.
 * @param network - "testnet" | "mainnet", defaults to "testnet".
 */
export function getExplorerAddressUrl(
  address: string,
  network: SupportedNetwork = "testnet"
): string {
  const netSegment = network === "mainnet" ? "public" : "testnet"
  return `https://stellar.expert/explorer/${netSegment}/account/${address}`
}
