export type CircleId = string;

export type ClientMessage =
  | { type: "subscribe"; requestId: string; circleId: CircleId }
  | { type: "unsubscribe"; requestId: string; circleId: CircleId }
  | { type: "ping"; requestId?: string };

export type ServerMessage =
  | { type: "ready"; connectionId: string; heartbeatIntervalMs: number }
  | { type: "subscribed" | "unsubscribed"; requestId: string; circleId: CircleId }
  | { type: "event"; eventId: string; sequence: number; circleId: CircleId; eventType: string; occurredAt: string; payload: Record<string, unknown> }
  | { type: "pong"; requestId?: string }
  | { type: "error"; requestId?: string; code: "INVALID_MESSAGE" | "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "INTERNAL"; message: string };

export interface RealtimeEvent {
  eventId: string;
  sequence: number;
  circleId: CircleId;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}
