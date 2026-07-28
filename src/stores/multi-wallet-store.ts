"use client";

import { create } from "zustand";
import { getWalletRegistry } from "@/lib/wallet/registry";
import { getSessionManager } from "@/lib/wallet/session-manager";
import { WC2_QR_EXPIRATION_MS, STELLAR_NETWORK } from "@/lib/constants";
import { fetchBalanceWithBackoff } from "@/lib/wallet/balance-cache";
import type {
  WalletAdapter,
  WalletId,
  WalletError,
  NetworkType,
} from "@/lib/wallet/types";

interface WalletEntry {
  adapter: WalletAdapter;
  publicKey: string;
  network: NetworkType;
  balance: { xlm: string; usdc: string } | null;
  lastConnected: number;
  error: WalletError | null;
  status: "connecting" | "connected" | "reconnecting" | "disconnected" | "error";
}

interface MultiWalletState {
  activeWalletId: WalletId | null;
  wallets: Record<WalletId, WalletEntry>;
  detectedWallets: Array<{
    id: WalletId;
    name: string;
    category: string;
    icon: string;
    installUrl: string;
    description: string;
    priority: number;
    status: "detected" | "not_detected";
  }>;
  isScanning: boolean;
  isInitializing: boolean;

  /* Convenience state for auth / UI pages */
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  connectingWalletId: WalletId | null;
  error: string | null;
  activeAdapter: WalletAdapter | null;
  isSelectorOpen: boolean;

  /* Route-specific error isolation for enterprise-grade UX */
  loginError: string | null;
  registerError: string | null;

  /* WC2-specific state */
  wc2PairingUri: string | null;
  wc2PairingState: "idle" | "connecting" | "pairing" | "awaiting_approval" | "approved" | "rejected" | "timeout" | "error";
  wc2RelayStatus: "healthy" | "degraded" | "down";
  wc2PairingError: string | null;
  wc2QrExpiresAt: number | null;

  /* Passkey-specific state */
  passkeyState: "idle" | "registering" | "awaiting_biometric" | "authenticating" | "deriving" | "connected" | "error";
  passkeyError: string | null;
  passkeyPublicKey: string | null;

  /* Ledger-specific state */
  ledgerTransportType: "usb" | "ble" | null;
  ledgerConnectionState: "idle" | "detecting" | "connecting" | "waiting_for_app" | "waiting_for_confirm" | "connected" | "disconnected" | "error" | "waiting_for_reconnect";
  ledgerFirmwareVersion: string | null;
  ledgerStellarAppVersion: string | null;
  ledgerFirmwareWarnings: string[];
  ledgerConnectionError: string | null;

  /* Actions */
  scanWallets: () => void;
  connect: (walletId: WalletId) => Promise<void>;
  disconnect: (walletId: WalletId) => void;
  switchWallet: (walletId: WalletId) => void;
  refreshBalance: (walletId: WalletId) => Promise<void>;
  clearError: (walletId: WalletId) => void;
  init: () => Promise<void>;
  updateWalletStatus: (walletId: WalletId, status: WalletEntry["status"]) => void;
  signMessage: (message: string) => Promise<string>;
  setSelectorOpen: (open: boolean) => void;
  /* Route-specific error isolation for enterprise-grade UX */
  setLoginError: (error: string | null) => void;
  setRegisterError: (error: string | null) => void;
  clearLoginError: () => void;
  clearRegisterError: () => void;
  /* WC2 actions */
  setWc2PairingUri: (uri: string | null) => void;
  setWc2PairingState: (state: MultiWalletState["wc2PairingState"]) => void;
  setWc2PairingError: (error: string | null) => void;
  setWc2RelayStatus: (status: MultiWalletState["wc2RelayStatus"]) => void;
  resetWc2Pairing: () => void;
  /* Passkey actions */
  setPasskeyState: (state: MultiWalletState["passkeyState"]) => void;
  setPasskeyError: (error: string | null) => void;
  setPasskeyPublicKey: (key: string | null) => void;
  resetPasskeyState: () => void;

  /* Ledger actions */
  setLedgerTransportType: (transportType: "usb" | "ble" | null) => void;
  setLedgerConnectionState: (connectionState: MultiWalletState["ledgerConnectionState"]) => void;
  setLedgerFirmwareVersion: (version: string | null) => void;
  setLedgerStellarAppVersion: (version: string | null) => void;
  setLedgerFirmwareWarnings: (warnings: string[]) => void;
  setLedgerConnectionError: (error: string | null) => void;
  resetLedgerState: () => void;
}

/* Helper: sync convenience fields from wallet record */
function syncConvenienceState(
  state: Pick<MultiWalletState, "activeWalletId" | "wallets">
): Partial<MultiWalletState> {
  const { activeWalletId, wallets } = state;
  const activeEntry = activeWalletId ? wallets[activeWalletId] : undefined;

  return {
    isConnected: activeEntry?.status === "connected" || activeEntry?.status === "reconnecting",
    address: activeEntry?.publicKey ?? null,
    isConnecting: activeEntry?.status === "connecting",
    error:
      activeEntry?.error != null
        ? activeEntry.error.message
        : null,
    activeAdapter: activeEntry?.adapter ?? null,
  };
}

export const useMultiWalletStore = create<MultiWalletState>()((set, get) => ({
  activeWalletId: null,
  wallets: {},
  detectedWallets: [],
  isScanning: false,
  isInitializing: false,

  /* Convenience defaults */
  isConnected: false,
  address: null,
  isConnecting: false,
  connectingWalletId: null,
  error: null,
  activeAdapter: null,
  isSelectorOpen: false,

  /* Route-specific error isolation defaults */
  loginError: null,
  registerError: null,

  /* WC2 defaults */
  wc2PairingUri: null,
  wc2PairingState: "idle",
  wc2RelayStatus: "healthy",
  wc2PairingError: null,
  wc2QrExpiresAt: null,

  /* Passkey defaults */
  passkeyState: "idle",
  passkeyError: null,
  passkeyPublicKey: null,

  /* Ledger defaults */
  ledgerTransportType: null,
  ledgerConnectionState: "idle",
  ledgerFirmwareVersion: null,
  ledgerStellarAppVersion: null,
  ledgerFirmwareWarnings: [],
  ledgerConnectionError: null,

  init: async () => {
    if (get().isInitializing) return;
    set({ isInitializing: true });

    try {
      const sessionManager = getSessionManager();
      const sessions = sessionManager.getAll();
      if (sessions.length > 0) {
        const active = sessionManager.getActive();
        const wallets: Record<string, WalletEntry> = {};
        for (const s of sessions) {
          const adapter = getWalletRegistry().getAdapter(s.walletId);
          if (adapter) {
            wallets[s.walletId] = {
              adapter,
              publicKey: s.publicKey,
              network: s.network,
              balance: null,
              lastConnected: s.lastConnected,
              error: null,
              status: "reconnecting",
            };
          }
        }
        const nextActiveId = active?.walletId ?? null;
        set({
          wallets,
          activeWalletId: nextActiveId,
          ...syncConvenienceState({ activeWalletId: nextActiveId, wallets }),
        });

        for (const s of sessions) {
          const adapter = getWalletRegistry().getAdapter(s.walletId);
          if (adapter) {
            adapter
              .isConnected()
              .then((connected) => {
                get().updateWalletStatus(
                  s.walletId,
                  connected ? "connected" : "disconnected"
                );
              })
              .catch(() => {
                get().updateWalletStatus(s.walletId, "disconnected");
              });
          }
        }
      }

      await get().scanWallets();
    } finally {
      set({ isInitializing: false });
    }
  },

  scanWallets: async () => {
    set({ isScanning: true });
    const { initializeWalletAdapters } = await import("@/lib/wallet/adapters");
    await initializeWalletAdapters();
    const results = getWalletRegistry().detect();
    set({
      detectedWallets: results.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        icon: r.icon,
        installUrl: r.installUrl,
        description: r.description,
        priority: r.priority,
        status: r.status,
      })),
      isScanning: false,
    });
  },

  connect: async (walletId: WalletId) => {
    /* ── Duplicate-connect guard — ignore a double-click while this wallet is already connecting ── */
    if (get().wallets[walletId]?.status === "connecting") {
      return;
    }

    /* ── Offline guard ─────────────────────────────────────────── */
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const offlineError: WalletError = {
        adapter: walletId,
        code: "network_offline",
        message:
          "You appear to be offline. Please check your internet connection and try again.",
      };
      set((state) => {
        const existing = state.wallets[walletId];
        const next = {
          wallets: {
            ...state.wallets,
            [walletId]: existing
              ? { ...existing, status: "error" as const, error: offlineError }
              : {
                  adapter: null as unknown as WalletAdapter,
                  publicKey: "",
                  network: STELLAR_NETWORK as NetworkType,
                  balance: null,
                  lastConnected: Date.now(),
                  error: offlineError,
                  status: "error" as const,
                },
          },
          activeWalletId: state.activeWalletId,
        };
        return {
          ...next,
          ...syncConvenienceState(next),
        };
      });
      throw offlineError;
    }

    const adapter = getWalletRegistry().getAdapter(walletId);
    if (!adapter) return;

    set((state) => {
      const existing = state.wallets[walletId];
      const next = {
        wallets: {
          ...state.wallets,
          [walletId]: existing
            ? { ...existing, status: "connecting" as const, error: null }
            : {
                adapter,
                publicKey: "",
                network: STELLAR_NETWORK as NetworkType,
                balance: null,
                lastConnected: Date.now(),
                error: null,
                status: "connecting" as const,
              },
        },
        activeWalletId: walletId as WalletId,
      };
      return {
        ...next,
        connectingWalletId: walletId,
        ...syncConvenienceState(next),
      };
    });

    try {
      const { publicKey } = await adapter.connect();
      const network = await adapter.getNetwork();

      set((state) => {
        const next = {
          wallets: {
            ...state.wallets,
            [walletId]: {
              adapter,
              publicKey,
              network,
              balance: null,
              lastConnected: Date.now(),
              error: null,
              status: "connected" as const,
            },
          },
          activeWalletId: walletId,
        };
        return {
          ...next,
          ...syncConvenienceState(next),
        };
      });

      await getSessionManager().connect(adapter, publicKey);
    } catch (err: unknown) {
      const error: WalletError =
        err && typeof err === "object" && "code" in err
          ? (err as WalletError)
          : {
              adapter: walletId,
              code: "internal",
              message:
                err instanceof Error ? err.message : "Connection failed",
              cause: String(err),
            };

      set((state) => {
        const existing = state.wallets[walletId];
        const next = {
          wallets: {
            ...state.wallets,
            [walletId]: existing
              ? { ...existing, status: "error" as const, error }
              : {
                  adapter,
                  publicKey: "",
                  network: STELLAR_NETWORK as NetworkType,
                  balance: null,
                  lastConnected: Date.now(),
                  error,
                  status: "error" as const,
                },
          },
          activeWalletId: state.activeWalletId,
        };
        return {
          ...next,
          ...syncConvenienceState(next),
        };
      });
      throw error;
    } finally {
      set((state) =>
        state.connectingWalletId === walletId
          ? { connectingWalletId: null }
          : state
      );
    }
  },

  disconnect: (walletId: WalletId) => {
    getSessionManager().disconnect(walletId);
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [walletId]: _, ...remaining } = state.wallets;
      const remainingIds = Object.keys(remaining) as WalletId[];
      const nextActive =
        state.activeWalletId === walletId
          ? remainingIds[0] ?? null
          : state.activeWalletId;
      const next = {
        wallets: remaining,
        activeWalletId: nextActive,
      };
      return {
        ...next,
        ...syncConvenienceState(next),
      };
    });
  },

  switchWallet: (walletId: WalletId) => {
    getSessionManager().switchTo(walletId);
    set((state) => {
      const next = { activeWalletId: walletId };
      return {
        ...next,
        ...syncConvenienceState({ ...state, ...next }),
      };
    });
  },

  refreshBalance: async (walletId: WalletId, forceRefresh = false) => {
    const entry = get().wallets[walletId];
    if (!entry || !entry.publicKey) return;
    try {
      const balance = await fetchBalanceWithBackoff(entry.publicKey, { forceRefresh });
      set((state) => {
        const existing = state.wallets[walletId];
        if (existing) {
          return {
            wallets: {
              ...state.wallets,
              [walletId]: { ...existing, balance },
            },
          };
        }
        return state;
      });
    } catch {
      // non-critical
    }
  },

  clearError: (walletId: WalletId) => {
    set((state) => {
      const existing = state.wallets[walletId];
      if (existing) {
        const next = {
          wallets: {
            ...state.wallets,
            [walletId]: {
              ...existing,
              error: null,
              status: "disconnected" as const,
            },
          },
          activeWalletId: state.activeWalletId,
        };
        return {
          ...next,
          ...syncConvenienceState(next),
        };
      }
      return state;
    });
  },

  updateWalletStatus: (walletId: WalletId, status: WalletEntry["status"]) => {
    set((state) => {
      const existing = state.wallets[walletId];
      if (existing) {
        const next = {
          wallets: {
            ...state.wallets,
            [walletId]: { ...existing, status },
          },
          activeWalletId: state.activeWalletId,
        };
        return {
          ...next,
          ...syncConvenienceState(next),
        };
      }
      return state;
    });
  },

  signMessage: async (message: string) => {
    const { activeWalletId, wallets } = get();
    const entry = activeWalletId ? wallets[activeWalletId] : undefined;
    if (!entry) throw new Error("No wallet connected");
    const result = await entry.adapter.signMessage(message);
    return result.signature;
  },

  setSelectorOpen: (open: boolean) => {
    set({ isSelectorOpen: open });
  },

  /* WC2 actions */
  setWc2PairingUri: (uri: string | null) => {
    set({
      wc2PairingUri: uri,
      wc2PairingState: uri ? "pairing" : "idle",
      wc2QrExpiresAt: uri ? Date.now() + WC2_QR_EXPIRATION_MS : null,
    });
  },

  setWc2PairingState: (state) => {
    set({ wc2PairingState: state });
  },

  setWc2PairingError: (error) => {
    set({
      wc2PairingError: error,
      wc2PairingState: error ? "error" : get().wc2PairingState,
    });
  },

  setWc2RelayStatus: (status) => {
    set({ wc2RelayStatus: status });
  },

  resetWc2Pairing: () => {
    set({
      wc2PairingUri: null,
      wc2PairingState: "idle",
      wc2PairingError: null,
      wc2QrExpiresAt: null,
    });
  },

  /* Passkey actions */
  setPasskeyState: (passkeyState) => {
    set({ passkeyState });
  },

  setPasskeyError: (passkeyError) => {
    set({ passkeyError, passkeyState: passkeyError ? "error" : get().passkeyState });
  },

  setPasskeyPublicKey: (passkeyPublicKey) => {
    set({ passkeyPublicKey });
  },

  resetPasskeyState: () => {
    set({
      passkeyState: "idle",
      passkeyError: null,
      passkeyPublicKey: null,
    });
  },

  /* Ledger actions */
  setLedgerTransportType: (transportType) => {
    set({ ledgerTransportType: transportType });
  },

  setLedgerConnectionState: (connectionState) => {
    set({ ledgerConnectionState: connectionState });
  },

  setLedgerFirmwareVersion: (firmwareVersion) => {
    set({ ledgerFirmwareVersion: firmwareVersion });
  },

  setLedgerStellarAppVersion: (stellarAppVersion) => {
    set({ ledgerStellarAppVersion: stellarAppVersion });
  },

  setLedgerFirmwareWarnings: (warnings) => {
    set({ ledgerFirmwareWarnings: warnings });
  },

  setLedgerConnectionError: (error) => {
    set({ ledgerConnectionError: error });
  },

  resetLedgerState: () => {
    set({
      ledgerTransportType: null,
      ledgerConnectionState: "idle",
      ledgerFirmwareVersion: null,
      ledgerStellarAppVersion: null,
      ledgerFirmwareWarnings: [],
      ledgerConnectionError: null,
    });
  },

  setLoginError: (loginError) => set({ loginError }),
  setRegisterError: (registerError) => set({ registerError }),
  clearLoginError: () => set({ loginError: null }),
  clearRegisterError: () => set({ registerError: null }),
}));
