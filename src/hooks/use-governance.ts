"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { queryKeys } from "@/lib/query-keys";
import {
  listProposals,
  getProposal,
  createProposal,
  voteOnProposal,
  VOTE_PATH,
  type ProposalStatus,
  type GovernanceProposal,
  type VoteChoice,
} from "@/lib/governance-api";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { useGovernanceVotes } from "@/stores/governance-votes-store";
import type { QueryClient } from "@tanstack/react-query";

export function useGovernanceProposals(status: ProposalStatus) {
  return useQuery({
    queryKey: queryKeys.governance.list({ status }),
    queryFn: () => listProposals(status),
    staleTime: 30_000,
  });
}

export function useGovernanceProposal(id: string) {
  return useQuery({
    queryKey: queryKeys.governance.detail(id),
    queryFn: () => getProposal(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

type CreateProposalInput = Parameters<typeof createProposal>[0];

export function useCreateProposal() {
  return useOptimisticMutation<CreateProposalInput, GovernanceProposal>({
    mutationFn: createProposal,
    queryKeys: [queryKeys.governance.all],
    // Creating a proposal is an append, not an edit, so there is nothing
    // meaningful to paint optimistically — the list simply refreshes.
    applyOptimistic: () => {},
  });
}

/**
 * Apply a one-vote delta to a proposal without mutating the cached object.
 *
 * Returns a new object rather than incrementing in place: React Query compares
 * cache entries by reference, so mutating in place would leave the list showing
 * the old tally even though the data changed — the precise symptom in the issue.
 */
function applyVoteDelta(
  proposal: GovernanceProposal,
  choice: VoteChoice,
): GovernanceProposal {
  return {
    ...proposal,
    votesFor: proposal.votesFor + (choice === "for" ? 1 : 0),
    votesAgainst: proposal.votesAgainst + (choice === "against" ? 1 : 0),
    votesAbstain: (proposal.votesAbstain ?? 0) + (choice === "abstain" ? 1 : 0),
  };
}

export function useVoteOnProposal(id: string) {
  /**
   * Snapshots of every cached *list* entry, captured inside `applyOptimistic`
   * and replayed in `onError`.
   *
   * `useOptimisticMutation` snapshots exactly the keys it is given, but the
   * optimistic write here goes through `setQueriesData`, which prefix-matches
   * every `list({status})` variant. Those concrete keys are therefore not in the
   * helper's snapshot set, and relying on it alone would roll the detail entry
   * back while leaving the list permanently showing +1 — a partial rollback
   * that is harder to spot than either extreme. The helper's `onError` runs
   * before ours, so restoring here wins.
   *
   * Keyed by the serialised query key. The mutation is deduped per proposal, so
   * at most one is in flight and a single map is sufficient.
   */
  const listSnapshots = useRef<Map<string, unknown>>(new Map());
  const queryClient = useQueryClient();

  return useOptimisticMutation<boolean | VoteChoice, Awaited<ReturnType<typeof voteOnProposal>>>({
    mutationFn: (support) => voteOnProposal(id, support),

    // Every cached view of this proposal has to move together: the detail page
    // reads `detail(id)`, the list reads `list({status})`, and a user who votes
    // from the detail page then navigates back must not see the old total.
    queryKeys: [queryKeys.governance.all, queryKeys.governance.detail(id)],

    dedupeKey: () => `vote:${id}`,

    applyOptimistic: (support, _tempId, queryClient: QueryClient) => {
      const choice: VoteChoice =
        support === true ? "for" : support === false ? "against" : "abstain";

      // Capture every list cache before touching it, including any that is
      // currently undefined so a removed entry is restored as undefined rather
      // than silently resurrected.
      listSnapshots.current = new Map();
      for (const cached of queryClient.getQueriesData<GovernanceProposal[]>({
        queryKey: queryKeys.governance.all,
      })) {
        listSnapshots.current.set(JSON.stringify(cached[0]), cached[1]);
      }

      // The detail entry.
      queryClient.setQueryData<GovernanceProposal>(
        queryKeys.governance.detail(id),
        (previous) => (previous ? applyVoteDelta(previous, choice) : previous),
      );

      // The same proposal inside any cached list, whatever its status filter.
      queryClient.setQueriesData<GovernanceProposal[]>(
        { queryKey: queryKeys.governance.all },
        (previous) =>
          Array.isArray(previous)
            ? previous.map((p) => (p.id === id ? applyVoteDelta(p, choice) : p))
            : previous,
      );
    },

    onError: () => {
      // Runs after the helper has restored its own snapshots, so this wins.
      for (const [keyJson, data] of listSnapshots.current) {
        queryClient.setQueryData(JSON.parse(keyJson) as readonly unknown[], data);
      }
      listSnapshots.current = new Map();
    },

    onSuccess: (_data, support) => {
      const choice: VoteChoice =
        support === true ? "for" : support === false ? "against" : "abstain";
      // Record only once the request has succeeded, so a failed vote does not
      // leave a "you voted" marker behind.
      useGovernanceVotes.getState().recordVote(id, choice);
    },
  });
}

/** The path a vote for `id` would be submitted to. Exported for tests. */
export { VOTE_PATH };
