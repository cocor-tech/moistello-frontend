"use client";

import { useContributions } from "@/hooks/use-contributions";
import { useWsState } from "@/hooks/use-ws-state";
import type { WsConnectionState } from "@/hooks/use-websocket";

type ContributionsOptions = Parameters<typeof useContributions>[0];

/**
 * Extends `useContributions` with live-update awareness.
 *
 * - When connected: data is refreshed in real-time by WsProvider's cache
 *   invalidation on `contribution.recorded` events.
 * - When disconnected: `useContributions` only takes filters, so the fallback
 *   is react-query's own refetch triggers (window focus, reconnect) until the
 *   socket is live again.
 *
 * Returns all fields from `useContributions` plus:
 * - `isLive`          — true when the WebSocket is connected
 * - `connectionState` — 'connected' | 'polling' | 'disconnected' | 'connecting'
 */
export function useLiveContributions(options?: ContributionsOptions) {
  const { isConnected, connectionState } = useWsState();

  const contributionsQuery = useContributions({ ...options });

  return {
    ...contributionsQuery,
    isLive: isConnected,
    connectionState,
  };
}

export type { WsConnectionState };
