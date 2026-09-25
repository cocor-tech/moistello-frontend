import {
  getNetworkConfig,
  NetworkConfig,
  SupportedNetwork,
} from "./config";

export interface NetworkAdapter {
  getNetwork(): Promise<{ passphrase: string }>;
}

export interface MultiNetworkClientOptions {
  initialNetwork: SupportedNetwork;
  createAdapter: (config: NetworkConfig) => NetworkAdapter;
}

export class MultiNetworkClient {
  private activeNetwork: SupportedNetwork;
  private readonly createAdapter: MultiNetworkClientOptions["createAdapter"];

  constructor(options: MultiNetworkClientOptions) {
    this.activeNetwork = options.initialNetwork;
    this.createAdapter = options.createAdapter;
  }

  get network(): SupportedNetwork {
    return this.activeNetwork;
  }

  get config(): NetworkConfig {
    return getNetworkConfig(this.activeNetwork);
  }

  getContractId(name: string): string {
    const contractId = this.config.contractIds[name];

    if (!contractId) {
      throw new Error(
        `Contract "${name}" is not configured for ${this.activeNetwork}`,
      );
    }

    return contractId;
  }

  async switchNetwork(nextNetwork: SupportedNetwork): Promise<void> {
    if (nextNetwork === this.activeNetwork) {
      return;
    }

    const nextConfig = getNetworkConfig(nextNetwork);
    const adapter = this.createAdapter(nextConfig);
    const networkInfo = await adapter.getNetwork();

    if (networkInfo.passphrase !== nextConfig.networkPassphrase) {
      throw new Error(
        `RPC network mismatch for ${nextNetwork}: expected ${nextConfig.networkPassphrase}`,
      );
    }

    this.activeNetwork = nextNetwork;
  }
}
