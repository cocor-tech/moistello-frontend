import type { GovernanceProposal } from "@/lib/governance-api"

/**
 * Minimum yes+no votes a proposal needs to reach quorum. Matches the
 * "Quorum threshold: 1,000 votes" requirement shown on the proposal page.
 */
export const QUORUM_THRESHOLD = 1000

export interface QuorumStatus {
  /** Votes counted toward quorum — yes+no only, excluding abstentions. */
  quorumVotes: number
  /** Percent of QUORUM_THRESHOLD reached, capped at 100. */
  quorumPercent: number
  quorumReached: boolean
}

/**
 * Quorum is yes+no votes against the threshold — the contract excludes
 * abstentions from quorum entirely, so a proposal where most votes are
 * abstain can legitimately fail to reach quorum even with high turnout
 * (issue #491). Abstentions are still shown, just labeled separately
 * rather than folded into this calculation.
 */
export function calculateQuorum(
  proposal: Pick<GovernanceProposal, "votesFor" | "votesAgainst">,
  threshold: number = QUORUM_THRESHOLD,
): QuorumStatus {
  const quorumVotes = (proposal.votesFor ?? 0) + (proposal.votesAgainst ?? 0)
  const quorumPercent = threshold > 0 ? Math.min(100, Math.round((quorumVotes / threshold) * 100)) : 100
  return {
    quorumVotes,
    quorumPercent,
    quorumReached: quorumVotes >= threshold,
  }
}
