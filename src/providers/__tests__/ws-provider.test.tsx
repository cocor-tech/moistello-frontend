import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WsProvider, useWsContext } from "../ws-provider";
import type { WebSocketMessage, WsConnectionState } from "@/hooks/use-websocket";
import { queryKeys } from "@/lib/query-keys";
import type { Notification } from "@/types";

let capturedOnEvent: ((msg: WebSocketMessage) => void) | undefined;
let mockIsConnected = false;
let mockConnectionState: WsConnectionState = "connecting";
let mockLastMessage: WebSocketMessage | null = null;

vi.mock("@/hooks/use-websocket", () => ({
  useWebSocket: vi.fn((options?: { onEvent?: (msg: WebSocketMessage) => void }) => {
    capturedOnEvent = options?.onEvent;
    return {
      isConnected: mockIsConnected,
      connectionState: mockConnectionState,
      lastMessage: mockLastMessage,
    };
  }),
}));

function Consumer() {
  const { isConnected, connectionState, lastMessage } = useWsContext();
  return (
    <div>
      <span data-testid="connected">{String(isConnected)}</span>
      <span data-testid="connection-state">{connectionState}</span>
      <span data-testid="last-message">
        {lastMessage ? JSON.stringify(lastMessage) : "null"}
      </span>
    </div>
  );
}

describe("WsProvider", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnEvent = undefined;
    mockIsConnected = false;
    mockConnectionState = "connecting";
    mockLastMessage = null;

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(queryClient, "setQueryData");
  });

  const renderWithProviders = (ui: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it("provides websocket state via useWsContext", () => {
    mockIsConnected = true;
    mockConnectionState = "connected";
    mockLastMessage = { type: "test", payload: {} };

    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    expect(screen.getByTestId("connected").textContent).toBe("true");
    expect(screen.getByTestId("connection-state").textContent).toBe("connected");
    expect(screen.getByTestId("last-message").textContent).toContain('"type":"test"');
  });

  it("invalidates circles queries on circle.created event", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    expect(capturedOnEvent).toBeDefined();

    act(() => {
      capturedOnEvent!({ type: "circle.created" });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["circles"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["my-circles"] });
  });

  it("invalidates specific circle and circle list on circle.status_changed event", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({
        type: "circle.status_changed",
        payload: { circleId: "circle-abc" },
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle", "circle-abc"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circles"],
    });
  });

  it("invalidates circle and member queries on member.joined and member.left events", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({
        type: "member.joined",
        payload: { circleId: "circle-xyz" },
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle", "circle-xyz"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle-members", "circle-xyz"],
    });

    act(() => {
      capturedOnEvent!({
        type: "member.left",
        payload: { circleId: "circle-xyz" },
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle", "circle-xyz"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle-members", "circle-xyz"],
    });
  });

  it("invalidates contribution and round queries on contribution.recorded event", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({
        type: "contribution.recorded",
        payload: { circleId: "circle-123" },
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle-rounds", "circle-123"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle", "circle-123"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["contributions"],
    });
  });

  it("invalidates payout and round queries on payout.executed event", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({
        type: "payout.executed",
        payload: { circleId: "circle-123" },
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circle-rounds", "circle-123"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["payouts"],
    });
  });

  it("invalidates communities query on community.joined event", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({ type: "community.joined" });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["communities"],
    });
  });

  it("invalidates auth query on user.updated event", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({ type: "user.updated" });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["auth"],
    });
  });

  it("prepends notifications and avoids duplicates on notification events", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    const notif1 = {
      id: "n-1",
      userId: "u-1",
      type: "circle_invite",
      title: "Invite",
      message: "You were invited",
      read: false,
      createdAt: "2026-01-01T00:00:00Z",
    } as Notification;

    act(() => {
      capturedOnEvent!({
        type: "notification.new",
        payload: notif1 as unknown as Record<string, unknown>,
      });
    });

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      queryKeys.notifications.all,
      expect.any(Function)
    );

    // Verify cache updater logic
    const updater = vi.mocked(queryClient.setQueryData).mock.calls[0][1] as (
      old: Notification[] | undefined
    ) => Notification[];

    // 1. Initial state (undefined)
    expect(updater(undefined)).toEqual([notif1]);

    // 2. Existing items
    const notif2 = { ...notif1, id: "n-2" };
    expect(updater([notif2])).toEqual([notif1, notif2]);

    // 3. Duplicate id is skipped
    expect(updater([notif1, notif2])).toEqual([notif1, notif2]);
  });

  it("handles missing circleId gracefully without throwing", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({
        type: "circle.status_changed",
        payload: {},
      });
      capturedOnEvent!({
        type: "member.joined",
        payload: undefined,
      });
      capturedOnEvent!({
        type: "contribution.recorded",
        payload: {},
      });
      capturedOnEvent!({
        type: "payout.executed",
        payload: {},
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["circles"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["contributions"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["payouts"],
    });
  });

  it("ignores unknown event types", () => {
    renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    act(() => {
      capturedOnEvent!({ type: "unknown.event" });
    });

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(queryClient.setQueryData).not.toHaveBeenCalled();
  });

  it("does not process events after unmounting", () => {
    const { unmount } = renderWithProviders(
      <WsProvider>
        <Consumer />
      </WsProvider>
    );

    unmount();

    act(() => {
      capturedOnEvent!({ type: "circle.created" });
    });

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it("returns default fallback context when used outside WsProvider", () => {
    render(<Consumer />);

    expect(screen.getByTestId("connected").textContent).toBe("false");
    expect(screen.getByTestId("connection-state").textContent).toBe("connecting");
    expect(screen.getByTestId("last-message").textContent).toBe("null");
  });
});
