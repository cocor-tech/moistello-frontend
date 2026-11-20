"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  useWebSocket,
  type WebSocketMessage,
  type WsConnectionState,
} from "@/hooks/use-websocket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Notification } from "@/types";

// ── WebSocket context ────────────────────────────────────────────────────────

export interface WsContextValue {
  isConnected: boolean;
  connectionState: WsConnectionState;
  lastMessage: WebSocketMessage | null;
}

const WsContext = createContext<WsContextValue>({
  isConnected: false,
  connectionState: "connecting",
  lastMessage: null,
});

/**
 * Read the global WebSocket connection state without creating a second
 * connection. Use this inside pages/hooks that only need the connection
 * status, not a new independent WebSocket.
 */
export function useWsContext(): WsContextValue {
  return useContext(WsContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

interface WsProviderProps {
  children: ReactNode;
}

export function WsProvider({ children }: WsProviderProps) {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);

  const handleEventRef = useRef<(msg: WebSocketMessage) => void>(() => {});

  handleEventRef.current = (msg: WebSocketMessage) => {
    if (!mountedRef.current) return;

    const payload = msg.payload as Record<string, unknown> | undefined;
    const circleId = payload?.circleId as string | undefined;

    switch (msg.type) {
      // ── Circle events ──
      case "circle.created":
        queryClient.invalidateQueries({ queryKey: ["circles"] });
        queryClient.invalidateQueries({ queryKey: ["my-circles"] });
        break;

      case "circle.status_changed":
        if (circleId) {
          queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
        }
        queryClient.invalidateQueries({ queryKey: ["circles"] });
        break;

      case "member.joined":
      case "member.left":
        if (circleId) {
          queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
          queryClient.invalidateQueries({ queryKey: ["circle-members", circleId] });
        }
        break;

      case "contribution.recorded":
        if (circleId) {
          queryClient.invalidateQueries({ queryKey: ["circle-rounds", circleId] });
          queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
        }
        queryClient.invalidateQueries({ queryKey: ["contributions"] });
        break;

      case "payout.executed":
        if (circleId) {
          queryClient.invalidateQueries({ queryKey: ["circle-rounds", circleId] });
        }
        queryClient.invalidateQueries({ queryKey: ["payouts"] });
        break;

      // ── Community events ──
      case "community.joined":
        queryClient.invalidateQueries({ queryKey: ["communities"] });
        break;

      // ── Notification events ──
      case "notification.new":
      case "notification":
      case "new_notification": {
        const notification = msg.payload as unknown as Notification;
        // Prepend into the react-query cache; the page/header read from the
        // same query, so no separate store round-trip is needed.
        queryClient.setQueryData<Notification[]>(
          queryKeys.notifications.all,
          (old) => {
            if (!old) return [notification];
            if (old.some((n) => n.id === notification.id)) return old;
            return [notification, ...old];
          }
        );
        break;
      }

      // ── User events ──
      case "user.updated":
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        break;

      default:
        break;
    }
  };

  const handleEvent = useCallback((msg: WebSocketMessage) => {
    handleEventRef.current(msg);
  }, []);

  const { isConnected, connectionState, lastMessage } = useWebSocket({
    onEvent: handleEvent,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <WsContext.Provider value={{ isConnected, connectionState, lastMessage }}>
      {children}
    </WsContext.Provider>
  );
}
