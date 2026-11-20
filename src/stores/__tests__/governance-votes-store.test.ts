import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/governance-api", () => ({
  recordVote: vi.fn(),
}))

import { useGovernanceVotes } from "@/stores/governance-votes-store"

describe("GovernanceVotesStore", () => {
  beforeEach(() => {
    useGovernanceVotes.setState({ votes: {} })
  })

  it("records a vote for a proposal", () => {
    const { recordVote } = useGovernanceVotes.getState()
    recordVote("prop-1", "FOR")
    expect(useGovernanceVotes.getState().votes["prop-1"]).toEqual({
      choice: "FOR",
      at: expect.any(Number),
    })
  })

  it("gets a vote for a proposal", () => {
    const { recordVote, getVote } = useGovernanceVotes.getState()
    recordVote("prop-1", "AGAINST")
    expect(getVote("prop-1")).toEqual({
      choice: "AGAINST",
      at: expect.any(Number),
    })
    expect(getVote("prop-2")).toBeUndefined()
  })

  it("clears a vote for a proposal", () => {
    const { recordVote, clearVote } = useGovernanceVotes.getState()
    recordVote("prop-1", "FOR")
    clearVote("prop-1")
    expect(useGovernanceVotes.getState().votes["prop-1"]).toBeUndefined()
  })

  it("clears all votes", () => {
    const { recordVote, clearAll } = useGovernanceVotes.getState()
    recordVote("prop-1", "FOR")
    recordVote("prop-2", "AGAINST")
    clearAll()
    expect(Object.keys(useGovernanceVotes.getState().votes)).toHaveLength(0)
  })

  it("does not clear non-existent vote", () => {
    const { clearVote } = useGovernanceVotes.getState()
    clearVote("nonexistent")
    expect(useGovernanceVotes.getState().votes).toEqual({})
  })
})