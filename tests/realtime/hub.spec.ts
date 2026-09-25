import { describe, expect, it, vi } from "vitest";
import { RealtimeHub, type HubConnection } from "@/lib/realtime/hub";

function connection(id: string): HubConnection {
  return { id, send: vi.fn(), close: vi.fn(), isAlive: vi.fn(() => true), markAlive: vi.fn() };
}

describe("RealtimeHub", () => {
  it("broadcasts only to subscribers of the event circle", async () => {
    const a = connection("a");
    const b = connection("b");
    const hub = new RealtimeHub({ canSubscribe: vi.fn().mockResolvedValue(true) });
    hub.addConnection(a);
    hub.addConnection(b);
    await hub.subscribe("a", "circle-a", "r1");
    await hub.subscribe("b", "circle-b", "r2");

    expect(hub.broadcast({
      eventId: "evt-1", sequence: 1, circleId: "circle-a",
      eventType: "contribution.created", occurredAt: new Date().toISOString(),
      payload: { amount: "10" },
    })).toBe(1);
    expect(a.send).toHaveBeenCalledWith(expect.objectContaining({ type: "event" }));
    expect(b.send).not.toHaveBeenCalledWith(expect.objectContaining({ type: "event" }));
  });

  it("rejects unauthorized subscriptions", async () => {
    const client = connection("client");
    const hub = new RealtimeHub({ canSubscribe: vi.fn().mockResolvedValue(false) });
    hub.addConnection(client);
    await hub.subscribe("client", "private-circle", "r1");
    expect(client.send).toHaveBeenCalledWith({
      type: "error", requestId: "r1", code: "FORBIDDEN",
      message: "Subscription is not authorized",
    });
  });

  it("removes stale connections during heartbeat", () => {
    const client = connection("client");
    client.isAlive = vi.fn(() => false);
    const hub = new RealtimeHub({ canSubscribe: vi.fn() });
    hub.addConnection(client);
    expect(hub.heartbeat()).toEqual(["client"]);
    expect(client.close).toHaveBeenCalledWith(1001, "Heartbeat timeout");
    expect(hub.size()).toBe(0);
  });
});
