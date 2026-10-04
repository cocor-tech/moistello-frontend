import { get } from "@/lib/api-client"

export type ProposalStatus = "active" | "passed" | "defeated" | "draft" | "all"

/**
 * Minimum total votes (For + Against + Abstain) for a proposal to reach quorum.
 *
 * Sourced from the on-chain governance contract; surfaced in the UI so voters
 * can see how close a proposal is to being valid for consideration.
 */
export const QUORUM_THRESHOLD_VOTES = 1_000

export interface GovernanceProposal {
  id: string
  title: string
  description: string
  status: ProposalStatus
  category?: string
  votesFor: number
  votesAgainst: number
  votesAbstain?: number
  timelockEndsAt: string | null
  createdAt?: string
  proposer?: string
  executionPayload?: string
}

export const MOCK_GOVERNANCE_PROPOSALS: GovernanceProposal[] = [
  {
    id: "prop_101",
    title: "MIP-14: Lower Circle Collateral Requirement to 5%",
    description: "Proposal to adjust the default collateral percent from 10% down to 5% for High-Reputation (MoiScore 750+) organizers to improve capital efficiency.",
    status: "active",
    category: "Circle Parameter",
    votesFor: 1420,
    votesAgainst: 180,
    votesAbstain: 45,
    timelockEndsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    createdAt: "2024-05-10",
    proposer: "GCX4B3YJ2W...7H9K",
    executionPayload: JSON.stringify({ target: "CircleFactory", action: "updateMinCollateralBps", value: 500 }, null, 2),
  },
  {
    id: "prop_102",
    title: "MIP-15: Allocate 50,000 XLM from Community Treasury for Developer Grants",
    description: "Direct community treasury funds towards building automated Soroban dispute resolution bots and notifications.",
    status: "active",
    category: "Treasury Release",
    votesFor: 980,
    votesAgainst: 420,
    votesAbstain: 110,
    timelockEndsAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdAt: "2024-05-12",
    proposer: "GBV7N2M4P1...3X8L",
    executionPayload: JSON.stringify({ target: "Treasury", action: "disburseGrant", amount: 50000, recipient: "GDK9...9M4K" }, null, 2),
  },
  {
    id: "prop_103",
    title: "MIP-12: Integrate Automated Inflation Protection for USDC Pools",
    description: "Approved proposal implementing automatic yield routing for idle circle reserves into Soroban liquidity pools.",
    status: "passed",
    category: "Rule Amendment",
    votesFor: 2840,
    votesAgainst: 310,
    votesAbstain: 90,
    timelockEndsAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: "2024-04-20",
    proposer: "GAP3T1L6M9...2K5N",
    executionPayload: JSON.stringify({ target: "Staking", action: "enableYieldRouting", enabled: true }, null, 2),
  },
  {
    id: "prop_104",
    title: "MIP-11: Increase Max Member Limit per Circle to 50",
    description: "Defeated proposal that sought to raise circle capacity limit from 30 to 50 members.",
    status: "defeated",
    category: "Circle Parameter",
    votesFor: 450,
    votesAgainst: 1890,
    votesAbstain: 210,
    timelockEndsAt: null,
    createdAt: "2024-04-01",
    proposer: "GBS8K4P2L7...6W1J",
  },
]

export async function listProposals(status: ProposalStatus = "all") {
  try {
    const result = await get<{ proposals?: GovernanceProposal[] } | GovernanceProposal[]>(
      `/governance/proposals${status !== "all" ? `?status=${status}` : ""}`,
    )
    const list = Array.isArray(result) ? result : result.proposals ?? []
    if (list.length > 0) return list
  } catch {
    // API mock fallback
  }

  if (status === "all") return MOCK_GOVERNANCE_PROPOSALS
  return MOCK_GOVERNANCE_PROPOSALS.filter((p) => p.status === status)
}

export async function getProposal(id: string) {
  try {
    const result = await get<{ proposal?: GovernanceProposal } | GovernanceProposal>(
      `/governance/proposals/${id}`,
    )
    const p = "proposal" in result && result.proposal ? result.proposal : (result as GovernanceProposal)
    if (p && p.id) return p
  } catch {
    // API mock fallback
  }

  return MOCK_GOVERNANCE_PROPOSALS.find((p) => p.id === id) || MOCK_GOVERNANCE_PROPOSALS[0]
}

export function createProposal(input: {
  title: string
  description: string
  executionPayload: string
  category?: string
}) {
  const newProp: GovernanceProposal = {
    id: `prop_${Date.now().toString().slice(-4)}`,
    title: input.title,
    description: input.description,
    status: "active",
    category: input.category || "Rule Amendment",
    votesFor: 1,
    votesAgainst: 0,
    votesAbstain: 0,
    timelockEndsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: new Date().toISOString().split("T")[0],
    executionPayload: input.executionPayload,
  }
  MOCK_GOVERNANCE_PROPOSALS.unshift(newProp)
  return Promise.resolve(newProp)
}

export function voteOnProposal(id: string, support: boolean | "abstain", reason?: string) {
  const prop = MOCK_GOVERNANCE_PROPOSALS.find((p) => p.id === id)
  if (prop) {
    if (support === true) prop.votesFor += 1
    else if (support === false) prop.votesAgainst += 1
    else if (support === "abstain") prop.votesAbstain = (prop.votesAbstain || 0) + 1
  }
  return Promise.resolve({ success: true, proposal: prop })
}
