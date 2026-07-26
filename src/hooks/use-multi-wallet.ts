"use client"

import { useMultiWalletStore } from "@/stores/multi-wallet-store"

/** Connection state slice — subscribe only when connection/address/error changes. */
export function useMultiWalletConnection() {
  return useMultiWalletStore((s) => ({
    isConnected: s.isConnected,
    isConnecting: s.isConnecting,
    address: s.address,
    error: s.error,
    activeAdapter: s.activeAdapter,
  }))
}

/** Active-wallet identity slice — subscribe only when the active wallet/id changes. */
export function useMultiWalletActive() {
  const activeWalletId = useMultiWalletStore((s) => s.activeWalletId)
  const wallets = useMultiWalletStore((s) => s.wallets)
  const activeWallet = activeWalletId ? wallets[activeWalletId] : undefined
  return { activeWalletId, activeWallet, wallets }
}

/** Wallet list slice — subscribe only when the detected/available wallet list changes. */
export function useMultiWalletList() {
  return useMultiWalletStore((s) => ({
    detectedWallets: s.detectedWallets,
    isSelectorOpen: s.isSelectorOpen,
  }))
}

/** Action slice — actions are stable references and never cause re-renders. */
export function useMultiWalletActions() {
  return useMultiWalletStore((s) => ({
    connect: s.connect,
    disconnect: s.disconnect,
    signMessage: s.signMessage,
    switchWallet: s.switchWallet,
    refreshBalance: s.refreshBalance,
    setSelectorOpen: s.setSelectorOpen,
  }))
}

/**
 * Convenience aggregator kept for backwards-compatibility.
 * Prefer the focused hooks above to avoid subscribing to the full state.
 */
export function useMultiWallet() {
  const connection = useMultiWalletConnection()
  const { activeWalletId, activeWallet, wallets } = useMultiWalletActive()
  const { detectedWallets, isSelectorOpen } = useMultiWalletList()
  const actions = useMultiWalletActions()

  return {
    activeWalletId,
    activeWallet,
    wallets,
    detectedWallets,
    adapter: connection.activeAdapter,
    isConnected: connection.isConnected,
    address: connection.address,
    isConnecting: connection.isConnecting,
    error: connection.error,
    isSelectorOpen,
    ...actions,
  }
}
