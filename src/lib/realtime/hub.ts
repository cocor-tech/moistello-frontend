import type { CircleId, RealtimeEvent, ServerMessage } from "./protocol";

export interface HubConnection {
  id: string;
  send(message: ServerMessage): void;
  close(code: number, reason: string): void;
  isAlive(): boolean;
  markAlive(): void;
}

export interface CircleAuthorizer {
  canSubscribe(connectionId: string, circleId: CircleId): Promise<boolean>;
}

interface ConnectionState {
  connection: HubConnection;
  subscriptions: Set<CircleId>;
  connectedAt: number;
  lastSeenAt: number;
}

export class RealtimeHub {
  private readonly connections = new Map<string, ConnectionState>();

  constructor(
    private readonly authorizer: CircleAuthorizer,
    private readonly maxSubscriptionsPerConnection = 25,
  ) {}

  addConnection(connection: HubConnection): void {
    this.connections.set(connection.id, {
      connection,
      subscriptions: new Set(),
      connectedAt: Date.now(),
      lastSeenAt: Date.now(),
    });
  }

  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  markAlive(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (!state) return;
    state.lastSeenAt = Date.now();
    state.connection.markAlive();
  }

  async subscribe(connectionId: string, circleId: CircleId, requestId: string): Promise<void> {
    const state = this.requireConnection(connectionId);
    if (state.subscriptions.size >= this.maxSubscriptionsPerConnection) {
      state.connection.send({ type: "error", requestId, code: "RATE_LIMITED", message: "Subscription limit reached" });
      return;
    }
    if (!(await this.authorizer.canSubscribe(connectionId, circleId))) {
      state.connection.send({ type: "error", requestId, code: "FORBIDDEN", message: "Subscription is not authorized" });
      return;
    }
    state.subscriptions.add(circleId);
    state.connection.send({ type: "subscribed", requestId, circleId });
  }

  unsubscribe(connectionId: string, circleId: CircleId, requestId: string): void {
    const state = this.requireConnection(connectionId);
    state.subscriptions.delete(circleId);
    state.connection.send({ type: "unsubscribed", requestId, circleId });
  }

  broadcast(event: RealtimeEvent): number {
    let delivered = 0;
    for (const state of this.connections.values()) {
      if (!state.subscriptions.has(event.circleId) || !state.connection.isAlive()) continue;
      state.connection.send({
        type: "event",
        eventId: event.eventId,
        sequence: event.sequence,
        circleId: event.circleId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        payload: event.payload,
      });
      delivered += 1;
    }
    return delivered;
  }

  heartbeat(now = Date.now(), timeoutMs = 30_000): string[] {
    const stale: string[] = [];
    for (const [connectionId, state] of this.connections) {
      if (now - state.lastSeenAt > timeoutMs || !state.connection.isAlive()) {
        stale.push(connectionId);
        state.connection.close(1001, "Heartbeat timeout");
        this.connections.delete(connectionId);
      }
    }
    return stale;
  }

  size(): number {
    return this.connections.size;
  }

  private requireConnection(connectionId: string): ConnectionState {
    const state = this.connections.get(connectionId);
    if (!state) throw new Error("Connection not found");
    return state;
  }
}
