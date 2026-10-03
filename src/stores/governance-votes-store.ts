"use client"

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VoteChoice } from "@/lib/governance-api";

/**
 * The user's own votes, keyed by proposal id.
 *
 * The proposal detail page used to hold this in a bare `useState`, so the
 * "You voted FOR" banner disappeared on every navigation and on reload — the
 * user could not tell whether they had already voted, which is exactly the
 * state a voter needs. Persisting it also lets the proposal list show a marker
 * without a second request.
 */
interface UserVote {
  choice: VoteChoice;
  /** Epoch ms, for display and for ordering. */
  at: number;
}

interface GovernanceVotesState {
  votes: Record<string, UserVote>;
  recordVote: (proposalId: string, choice: VoteChoice) => void;
  getVote: (proposalId: string) => UserVote | undefined;
  clearVote: (proposalId: string) => void;
  clearAll: () => void;
}

export const useGovernanceVotes = create<GovernanceVotesState>()(
  persist(
    (set, get) => ({
      votes: {},

      recordVote: (proposalId, choice) =>
        set((state) => ({
          votes: { ...state.votes, [proposalId]: { choice, at: Date.now() } },
        })),

      getVote: (proposalId) => get().votes[proposalId],

      clearVote: (proposalId) =>
        set((state) => {
          if (!state.votes[proposalId]) return state;
          const next = { ...state.votes };
          delete next[proposalId];
          return { votes: next };
        }),

      clearAll: () => set({ votes: {} }),
    }),
    { name: "moistello_governance_votes" },
  ),
);
