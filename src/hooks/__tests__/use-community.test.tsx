import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCommunity, useCommunityMembers, useCommunityMutation } from "../use-community";
import { ReactNode } from "react";

// Mock API client
vi.mock("@/lib/api-client", () => ({
  get: vi.fn((url: string) => {
    if (url.includes("/communities/test-id")) {
      return Promise.resolve({
        data: {
          community: {
            id: "test-id",
            name: "Test Community",
            slug: "test-community",
            description: "A test community",
            category: "savings",
            tags: ["test"],
            ownerId: "owner-1",
            memberCount: 10,
            totalSaved: 1000,
            isFeatured: false,
            createdAt: "2024-01-01",
          },
        },
      });
    }
    if (url.includes("/members")) {
      return Promise.resolve({
        data: {
          members: [
            { userId: "user-1", role: "admin", joinedAt: "2024-01-01" },
            { userId: "user-2", role: "member", joinedAt: "2024-01-02" },
          ],
        },
      });
    }
    return Promise.resolve({ data: {} });
  }),
  post: vi.fn(() => Promise.resolve({ success: true })),
  patch: vi.fn(() => Promise.resolve({ success: true })),
  del: vi.fn(() => Promise.resolve({ success: true })),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCommunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches community data successfully", async () => {
    const { result } = renderHook(() => useCommunity("test-id"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.id).toBe("test-id");
    expect(result.current.data?.name).toBe("Test Community");
  });

  it("respects enabled flag", () => {
    const { result } = renderHook(() => useCommunity("test-id", false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useCommunity(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useCommunityMembers", () => {
  it("fetches members list successfully", async () => {
    const { result } = renderHook(() => useCommunityMembers("test-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].userId).toBe("user-1");
  });

  it("returns empty array when no members found", async () => {
    const { get } = await import("@/lib/api-client");
    vi.mocked(get).mockResolvedValueOnce({ data: { members: [] } });

    const { result } = renderHook(() => useCommunityMembers("empty-id"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe("useCommunityMutation", () => {
  it("returns mutation functions", () => {
    const { result } = renderHook(() => useCommunityMutation("test-id"), {
      wrapper: createWrapper(),
    });

    expect(result.current.join).toBeDefined();
    expect(result.current.togglePin).toBeDefined();
    expect(result.current.deleteAnnouncement).toBeDefined();
    expect(result.current.removeMember).toBeDefined();
    expect(result.current.transferOwnership).toBeDefined();
    expect(result.current.createAnnouncement).toBeDefined();
  });

  it("calls join mutation successfully", async () => {
    const { post } = await import("@/lib/api-client");
    const { result } = renderHook(() => useCommunityMutation("test-id"), {
      wrapper: createWrapper(),
    });

    result.current.join.mutate();

    await waitFor(() => expect(result.current.join.isSuccess).toBe(true));

    expect(post).toHaveBeenCalledWith("/communities/test-id/join");
  });

  it("calls createAnnouncement mutation with content", async () => {
    const { post } = await import("@/lib/api-client");
    const { result } = renderHook(() => useCommunityMutation("test-id"), {
      wrapper: createWrapper(),
    });

    result.current.createAnnouncement.mutate("New announcement");

    await waitFor(() => expect(result.current.createAnnouncement.isSuccess).toBe(true));

    expect(post).toHaveBeenCalledWith("/communities/test-id/announcements", {
      content: "New announcement",
    });
  });

  it("handles mutation errors gracefully", async () => {
    const { post } = await import("@/lib/api-client");
    vi.mocked(post).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCommunityMutation("test-id"), {
      wrapper: createWrapper(),
    });

    result.current.join.mutate();

    await waitFor(() => expect(result.current.join.isError).toBe(true));

    expect(result.current.join.error).toBeDefined();
  });
});
