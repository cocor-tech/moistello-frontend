"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  listProposals,
  getProposal,
  createProposal,
  voteOnProposal,
  type ProposalStatus,
} from "@/lib/governance-api"

export function useGovernanceProposals(status: ProposalStatus) {
  return useQuery({
    queryKey: queryKeys.governance.list({ status }),
    queryFn: () => listProposals(status),
    staleTime: 30_000,
  })
}

export function useGovernanceProposal(id: string) {
  return useQuery({
    queryKey: queryKeys.governance.detail(id),
    queryFn: () => getProposal(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.all })
    },
  })
}

export function useVoteOnProposal(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (support: boolean | "abstain") => voteOnProposal(id, support),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.all })
    },
  })
}
