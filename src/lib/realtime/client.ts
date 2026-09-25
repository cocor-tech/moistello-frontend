import type { ClientMessage, ServerMessage } from "./protocol";

export interface RealtimeClientOptions {
  url: string;
  onMessage: (message: ServerMessage) => void;
  onStateChange?: (state: number) => void;
}

export class RealtimeClient {
  private socket: WebSocket | null = null;

  constructor(private readonly options: RealtimeClientOptions) {}

  connect(): void {
    this.socket = new WebSocket(this.options.url);
    this.socket.onopen = () => this.options.onStateChange?.(this.socket!.readyState);
    this.socket.onclose = () => this.options.onStateChange?.(this.socket!.readyState);
    this.socket.onerror = () => this.options.onStateChange?.(this.socket!.readyState);
    this.socket.onmessage = (event) => this.options.onMessage(JSON.parse(event.data) as ServerMessage);
  }

  subscribe(circleId: string, requestId = crypto.randomUUID()): void {
    this.send({ type: "subscribe", requestId, circleId });
  }

  unsubscribe(circleId: string, requestId = crypto.randomUUID()): void {
    this.send({ type: "unsubscribe", requestId, circleId });
  }

  ping(requestId = crypto.randomUUID()): void {
    this.send({ type: "ping", requestId });
  }

  close(): void {
    this.socket?.close(1000, "Client disconnect");
    this.socket = null;
  }

  private send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.socket.send(JSON.stringify(message));
  }
}
