/**
 * Optimistic vote tests for the governance hook.
 *
 * The issue's acceptance criteria are: the tally and the "you voted" state must
 * update without a manual refresh, and an optimistic update must roll back when
 * the vote fails. These cover both, and the concurrency cases that make the
 * difference between an optimistic update that feels instant and one that
 * double-counts.
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { get, post } from "@/lib/api-client";
import { useGovernanceProposal, useVoteOnProposal } from "@/hooks/use-governance";
import { useGovernanceVotes } from "@/stores/governance-votes-store";
import { queryKeys } from "@/lib/query-keys";
import { createQueryWrapper } from "./test-utils";

vi.mock("@/lib/api-client", () => ({ get: vi.fn(), post: vi.fn() }));

const mockedGet = vi.mocked(get);
const mockedPost = vi.mocked(post);

const PROPOSAL = {
  id: "p1",
  title: "MIP-14: Lower Circle Collateral Requirement",
  description: "d",
  status: "active" as const,
  votesFor: 100,
  votesAgainst: 20,
  votesAbstain: 5,
  timelockEndsAt: null,
};

/** Seed both cache entries the hook touches, as a loaded page would. */
function seedCaches(queryClient: ReturnType<typeof createQueryWrapper>["queryClient"]) {
  queryClient.setQueryData(queryKeys.governance.detail("p1"), { ...PROPOSAL });
  queryClient.setQueryData(queryKeys.governance.list({ status: "all" }), [{ ...PROPOSAL }]);
  queryClient.setQueryData(queryKeys.governance.list({ status: "active" }), [{ ...PROPOSAL }]);
}

const readDetail = (queryClient: ReturnType<typeof createQueryWrapper>["queryClient"]) =>
  queryClient.getQueryData<typeof PROPOSAL>(queryKeys.governance.detail("p1"));
const readList = (queryClient: ReturnType<typeof createQueryWrapper>["queryClient"]) =>
  queryClient.getQueryData<typeof PROPOSAL[]>(queryKeys.governance.list({ status: "all" }));

beforeEach(() => {
  vi.clearAllMocks();
  useGovernanceVotes.getState().clearAll();
  mockedGet.mockResolvedValue({ proposal: { ...PROPOSAL } });
});

describe("optimistic vote", () => {
  it("updates the detail and list tallies before the request resolves", async () => {
    mockedPost.mockResolvedValue({});
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });

    // Hold the request open so only the optimistic write can explain the change.
    let release: (v: unknown) => void = () => {};
    mockedPost.mockImplementation(
      () => new Promise((resolve) => { release = resolve; }),
    );

    act(() => {
      void result.current.mutateAsync(true);
    });

    // Before the network answers, the tally has already moved.
    await waitFor(() => expect(readDetail(queryClient)?.votesFor).toBe(101));
    expect(readList(queryClient)?.[0].votesFor).toBe(101);

    await act(async () => { release({}); });
  });

  it("returns a new object rather than mutating the cached proposal", async () => {
    mockedPost.mockResolvedValue({});
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);
    const before = readDetail(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });
    await act(async () => { await result.current.mutateAsync(true); });

    const after = readDetail(queryClient);
    // React Query compares by reference; an in-place increment would leave the
    // list rendering the old number even though the data changed.
    expect(after).not.toBe(before);
    expect(before?.votesFor).toBe(100);
    expect(after?.votesFor).toBe(101);
  });

  it("moves the list entry too, not just the detail entry", async () => {
    mockedPost.mockResolvedValue({});
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });
    await act(async () => { await result.current.mutateAsync(false); });

    // Voting "against" must not touch the FOR tally.
    expect(readList(queryClient)?.[0].votesAgainst).toBe(21);
    expect(readList(queryClient)?.[0].votesFor).toBe(100);
  });

  it("counts an abstention separately", async () => {
    mockedPost.mockResolvedValue({});
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });
    await act(async () => { await result.current.mutateAsync("abstain"); });

    expect(readDetail(queryClient)?.votesAbstain).toBe(6);
    expect(readDetail(queryClient)?.votesFor).toBe(100);
    expect(readDetail(queryClient)?.votesAgainst).toBe(20);
  });
});

describe("rollback on failure", () => {
  it("restores the previous tally when the vote request fails", async () => {
    mockedPost.mockRejectedValue(new Error("rejected by signer"));
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(true)).rejects.toThrow();
    });

    // Both cache entries must be back to their pre-vote values.
    expect(readDetail(queryClient)?.votesFor).toBe(100);
    expect(readDetail(queryClient)?.votesAgainst).toBe(20);
    expect(readList(queryClient)?.[0].votesFor).toBe(100);
    expect(readList(queryClient)?.[0].votesAgainst).toBe(20);
  });

  it("restores the list entry as well as the detail entry", async () => {
    mockedPost.mockRejectedValue(new Error("network down"));
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(true)).rejects.toThrow();
    });

    // A partial rollback would leave the list permanently showing +1.
    expect(readList(queryClient)?.[0].votesFor).toBe(100);
  });

  it("does not record a vote when the request failed", async () => {
    mockedPost.mockRejectedValue(new Error("rejected by signer"));
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(true)).rejects.toThrow();
    });

    // A "you voted" marker surviving a failed vote is worse than no marker.
    expect(useGovernanceVotes.getState().getVote("p1")).toBeUndefined();
  });

  it("leaves the cache usable for a retry after a failure", async () => {
    mockedPost.mockRejectedValueOnce(new Error("network down"));
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(true)).rejects.toThrow();
    });

    mockedPost.mockResolvedValue({});
    await act(async () => { await result.current.mutateAsync(true); });

    expect(readDetail(queryClient)?.votesFor).toBe(101);
  });
});

describe("double submission", () => {
  it("does not count a second concurrent vote", async () => {
    mockedPost.mockResolvedValue({});
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });

    // Two rapid clicks, as a double-click produces.
    await act(async () => {
      void result.current.mutateAsync(true);
      await result.current.mutateAsync(true);
    });

    // A user gets one vote, so a double-submit must not inflate the tally.
    await waitFor(() => {
      const detail = readDetail(queryClient);
      expect(detail?.votesFor ?? 0).toBeLessThanOrEqual(101);
    });
  });
});

describe("user vote record", () => {
  it("records the vote once the request succeeds", async () => {
    mockedPost.mockResolvedValue({});
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });
    await act(async () => { await result.current.mutateAsync(true); });

    await waitFor(() =>
      expect(useGovernanceVotes.getState().getVote("p1")?.choice).toBe("for"),
    );
  });

  it("records the choice matching the button pressed", async () => {
    mockedPost.mockResolvedValue({});
    const { queryClient, QueryWrapper } = createQueryWrapper();
    seedCaches(queryClient);

    const { result } = renderHook(() => useVoteOnProposal("p1"), { wrapper: QueryWrapper });
    await act(async () => { await result.current.mutateAsync(false); });

    await waitFor(() =>
      expect(useGovernanceVotes.getState().getVote("p1")?.choice).toBe("against"),
    );
  });
});
