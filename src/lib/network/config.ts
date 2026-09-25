export type SupportedNetwork = "testnet" | "mainnet";

export interface NetworkConfig {
  network: SupportedNetwork;
  rpcUrl: string;
  horizonUrl?: string;
  networkPassphrase: string;
  contractIds: Record<string, string>;
}

const configuredContractId = (name: string): string =>
  process.env[name] ?? `UNCONFIGURED_${name}`;

export const NETWORK_CONFIG: Record<SupportedNetwork, NetworkConfig> = {
  testnet: {
    network: "testnet",
    rpcUrl:
      process.env.NEXT_PUBLIC_STELLAR_TESTNET_RPC_URL ??
      "https://soroban-testnet.stellar.org",
    horizonUrl:
      process.env.NEXT_PUBLIC_STELLAR_TESTNET_HORIZON_URL ??
      "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contractIds: {
      primary: configuredContractId(
        "NEXT_PUBLIC_TESTNET_PRIMARY_CONTRACT_ID",
      ),
    },
  },
  mainnet: {
    network: "mainnet",
    rpcUrl:
      process.env.NEXT_PUBLIC_STELLAR_MAINNET_RPC_URL ??
      "REPLACE_WITH_VERIFIED_MAINNET_RPC_URL",
    horizonUrl: process.env.NEXT_PUBLIC_STELLAR_MAINNET_HORIZON_URL,
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    contractIds: {
      primary: configuredContractId(
        "NEXT_PUBLIC_MAINNET_PRIMARY_CONTRACT_ID",
      ),
    },
  },
};

export const getNetworkConfig = (
  network: SupportedNetwork,
): NetworkConfig => NETWORK_CONFIG[network];
