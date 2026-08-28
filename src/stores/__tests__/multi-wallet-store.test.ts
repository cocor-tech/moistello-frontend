import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletAdapter, WalletSession } from "@/lib/wallet/types";

const { detect, getAdapter, sessionConnect, getAll, getActive, fetchBalanceWithBackoff } = vi.hoisted(() => ({
  detect: vi.fn(() => []),
  getAdapter: vi.fn(),
  sessionConnect: vi.fn(),
  getAll: vi.fn<() => WalletSession[]>(() => []),
  getActive: vi.fn<() => WalletSession | null>(() => null),
  fetchBalanceWithBackoff: vi.fn(),
}));

vi.mock("@/lib/wallet/registry", () => ({
  getWalletRegistry: () => ({
    detect,
    getAdapter,
  }),
}));

vi.mock("@/lib/wallet/session-manager", () => ({
  getSessionManager: () => ({
    connect: sessionConnect,
    disconnect: vi.fn(),
    switchTo: vi.fn(),
    getAll,
    getActive,
  }),
}));

vi.mock("@/lib/wallet/adapters", () => ({
  initializeWalletAdapters: vi.fn(),
}));

vi.mock("@/lib/wallet/balance-cache", () => ({
  fetchBalanceWithBackoff,
}));

import { useMultiWalletStore } from "@/stores/multi-wallet-store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createAdapter(
  connect: WalletAdapter["connect"]
): WalletAdapter {
  return {
    meta: {
      id: "freighter",
      name: "Freighter",
      category: "extension",
      icon: "",
      installUrl: "",
      description: "",
      priority: 1,
      isAvailable: () => true,
    },
    connect,
    disconnect: vi.fn(),
    isConnected: vi.fn(),
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    getPublicKey: vi.fn(),
    getNetwork: vi.fn().mockResolvedValue("testnet"),
  };
}

describe("multi-wallet-store connect concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detect.mockReturnValue([]);
    getAll.mockReturnValue([]);
    getActive.mockReturnValue(null);
    useMultiWalletStore.setState({
      activeWalletId: null,
      wallets: {},
      isConnected: false,
      address: null,
      isConnecting: false,
      connectingWalletId: null,
      error: null,
      activeAdapter: null,
    });
  });

  it("ignores a double-click while the same wallet is connecting", async () => {
    const pendingConnection = deferred<{ publicKey: string }>();
    const adapter = createAdapter(
      vi.fn().mockReturnValue(pendingConnection.promise)
    );
    getAdapter.mockReturnValue(adapter);

    const first = useMultiWalletStore.getState().connect("freighter");
    const second = useMultiWalletStore.getState().connect("freighter");

    expect(adapter.connect).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeUndefined();

    pendingConnection.resolve({ publicKey: "GDOUBLECLICK" });
    await first;
  });

  it("still connects a wallet with a single call", async () => {
    const adapter = createAdapter(
      vi.fn().mockResolvedValue({ publicKey: "GSINGLECONNECT" })
    );
    getAdapter.mockReturnValue(adapter);

    await useMultiWalletStore.getState().connect("freighter");

    expect(adapter.connect).toHaveBeenCalledTimes(1);
    expect(sessionConnect).toHaveBeenCalledWith(adapter, "GSINGLECONNECT");
    expect(useMultiWalletStore.getState().wallets.freighter).toMatchObject({
      publicKey: "GSINGLECONNECT",
      network: "testnet",
      status: "connected",
      error: null,
    });
  });

  it("keeps state consistent after rapid duplicate calls", async () => {
    const pendingConnection = deferred<{ publicKey: string }>();
    const adapter = createAdapter(
      vi.fn().mockReturnValue(pendingConnection.promise)
    );
    getAdapter.mockReturnValue(adapter);

    const attempts = [
      useMultiWalletStore.getState().connect("freighter"),
      useMultiWalletStore.getState().connect("freighter"),
      useMultiWalletStore.getState().connect("freighter"),
    ];

    expect(useMultiWalletStore.getState()).toMatchObject({
      activeWalletId: "freighter",
      isConnecting: true,
      connectingWalletId: "freighter",
    });

    pendingConnection.resolve({ publicKey: "GRAPIDCLICKS" });
    await Promise.all(attempts);

    expect(adapter.connect).toHaveBeenCalledTimes(1);
    expect(sessionConnect).toHaveBeenCalledTimes(1);
    expect(useMultiWalletStore.getState()).toMatchObject({
      activeWalletId: "freighter",
      address: "GRAPIDCLICKS",
      isConnected: true,
      isConnecting: false,
      connectingWalletId: null,
    });
    expect(Object.keys(useMultiWalletStore.getState().wallets)).toEqual([
      "freighter",
    ]);
  });

  it("checks saved wallet sessions with bounded parallel probes during init", async () => {
    const slowProbe = deferred<boolean>();
    const fastAdapter = createAdapter(vi.fn());
    const slowAdapter = createAdapter(vi.fn());
    fastAdapter.isConnected = vi.fn().mockResolvedValue(true);
    slowAdapter.isConnected = vi.fn().mockReturnValue(slowProbe.promise);
    getAll.mockReturnValue([
      {
        walletId: "freighter",
        publicKey: "GFAST",
        network: "testnet",
        lastConnected: 2,
      },
      {
        walletId: "xbull",
        publicKey: "GSLOW",
        network: "testnet",
        lastConnected: 1,
      },
    ]);
    getActive.mockReturnValue({
      walletId: "freighter",
      publicKey: "GFAST",
      network: "testnet",
      lastConnected: 2,
    });
    getAdapter.mockImplementation((walletId: string) =>
      walletId === "freighter" ? fastAdapter : slowAdapter
    );

    const initPromise = useMultiWalletStore.getState().init();
    await vi.waitFor(() => {
      expect(fastAdapter.isConnected).toHaveBeenCalled();
      expect(slowAdapter.isConnected).toHaveBeenCalled();
    });

    slowProbe.resolve(false);
    await initPromise;

    expect(useMultiWalletStore.getState().wallets.freighter.status).toBe("connected");
    expect(useMultiWalletStore.getState().wallets.xbull.status).toBe("disconnected");
    expect(useMultiWalletStore.getState()).toMatchObject({
      activeWalletId: "freighter",
      address: "GFAST",
      isConnected: true,
    });
  });

  it("resyncs convenience state after refreshing an active wallet balance", async () => {
    const adapter = createAdapter(vi.fn());
    fetchBalanceWithBackoff.mockResolvedValue({ xlm: "42", usdc: "7" });
    useMultiWalletStore.setState({
      activeWalletId: "freighter",
      wallets: {
        freighter: {
          adapter,
          publicKey: "GBALANCE",
          network: "testnet",
          balance: null,
          lastConnected: Date.now(),
          error: null,
          status: "connected",
        },
      },
      isConnected: false,
      address: null,
      activeAdapter: null,
    });

    await useMultiWalletStore.getState().refreshBalance("freighter");

    expect(fetchBalanceWithBackoff).toHaveBeenCalledWith("GBALANCE", {
      forceRefresh: false,
    });
    expect(useMultiWalletStore.getState()).toMatchObject({
      isConnected: true,
      address: "GBALANCE",
      activeAdapter: adapter,
    });
    expect(useMultiWalletStore.getState().wallets.freighter.balance).toEqual({
      xlm: "42",
      usdc: "7",
    });
  });
});
