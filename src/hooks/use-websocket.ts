"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_URL } from "@/lib/constants";

export interface WebSocketMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export type WsConnectionState = "connecting" | "connected" | "disconnected" | "polling";

interface UseWebSocketOptions {
  onEvent?: (message: WebSocketMessage) => void;
  /** Called periodically when the socket is disconnected. */
  onPoll?: () => void;
  /** How often (ms) to call onPoll when disconnected. Default: 30 000. */
  pollInterval?: number;
}

export function useWebSocket(options?: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<WsConnectionState>("connecting");
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => undefined);
  const onEventRef = useRef(options?.onEvent);
  const onPollRef = useRef(options?.onPoll);
  const pollIntervalRef = useRef(options?.pollInterval ?? 30000);

  useEffect(() => {
    onEventRef.current = options?.onEvent;
  }, [options?.onEvent]);

  useEffect(() => {
    onPollRef.current = options?.onPoll;
  }, [options?.onPoll]);

  useEffect(() => {
    pollIntervalRef.current = options?.pollInterval ?? 30000;
  }, [options?.pollInterval]);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPollTimer = useCallback(() => {
    // Only start polling if there is a callback to call
    if (!onPollRef.current) return;
    clearPollTimer();
    pollTimerRef.current = setInterval(() => {
      if (mountedRef.current) {
        onPollRef.current?.();
      }
    }, pollIntervalRef.current);
    setConnectionState("polling");
  }, [clearPollTimer]);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === "string" ? message : JSON.stringify(message));
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;

    const attempts = reconnectAttemptRef.current + 1;
    reconnectAttemptRef.current = attempts;

    const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000);

    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionState("connecting");

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      setIsConnected(true);
      setConnectionState("connected");
      clearPollTimer();
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
        onEventRef.current?.(message);
      } catch {
        // Non-JSON WebSocket message — ignore
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      startPollTimer();
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [clearPollTimer, scheduleReconnect, startPollTimer]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;

      clearPollTimer();

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearPollTimer]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    send,
  };
}
