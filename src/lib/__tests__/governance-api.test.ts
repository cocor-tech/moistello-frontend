import { describe, it, expect, vi, beforeEach } from "vitest"
import { get, post } from "@/lib/api-client"
import {
  QUORUM_THRESHOLD_VOTES,
  MOCK_GOVERNANCE_PROPOSALS,
  listProposals,
  getProposal,
  createProposal,
  VOTE_PATH,
  voteOnProposal,
  type GovernanceProposal,
} from "../governance-api"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)

describe("governance-api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("QUORUM_THRESHOLD_VOTES and VOTE_PATH", () => {
    it("exports standard quorum threshold", () => {
      expect(QUORUM_THRESHOLD_VOTES).toBe(1000)
    })

    it("generates correct vote endpoint path", () => {
      expect(VOTE_PATH("prop_101")).toBe("/governance/proposals/prop_101/votes")
    })
  })

  describe("listProposals", () => {
    it("returns proposals from array API response", async () => {
      const apiProposals: GovernanceProposal[] = [
        {
          id: "p1",
          title: "Proposal 1",
          description: "Desc 1",
          status: "active",
          votesFor: 10,
          votesAgainst: 2,
          timelockEndsAt: null,
        },
      ]
      mockedGet.mockResolvedValueOnce(apiProposals)

      const result = await listProposals()

      expect(mockedGet).toHaveBeenCalledWith("/governance/proposals")
      expect(result).toEqual(apiProposals)
    })

    it("returns proposals from object wrapper API response", async () => {
      const apiProposals: GovernanceProposal[] = [
        {
          id: "p2",
          title: "Proposal 2",
          description: "Desc 2",
          status: "passed",
          votesFor: 50,
          votesAgainst: 1,
          timelockEndsAt: null,
        },
      ]
      mockedGet.mockResolvedValueOnce({ proposals: apiProposals })

      const result = await listProposals("passed")

      expect(mockedGet).toHaveBeenCalledWith(
        "/governance/proposals?status=passed",
      )
      expect(result).toEqual(apiProposals)
    })

    it("falls back to mock proposals when API fails with status='all'", async () => {
      mockedGet.mockRejectedValueOnce(new Error("Network Error"))

      const result = await listProposals("all")

      expect(result).toEqual(MOCK_GOVERNANCE_PROPOSALS)
    })

    it("falls back to filtered mock proposals when API fails with specific status", async () => {
      mockedGet.mockRejectedValueOnce(new Error("Network Error"))

      const result = await listProposals("defeated")

      expect(result.every((p) => p.status === "defeated")).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("getProposal", () => {
    it("returns proposal from wrapped API response", async () => {
      const mockProp: GovernanceProposal = {
        id: "p_custom",
        title: "Custom",
        description: "Custom Desc",
        status: "active",
        votesFor: 100,
        votesAgainst: 0,
        timelockEndsAt: null,
      }
      mockedGet.mockResolvedValueOnce({ proposal: mockProp })

      const result = await getProposal("p_custom")

      expect(mockedGet).toHaveBeenCalledWith("/governance/proposals/p_custom")
      expect(result).toEqual(mockProp)
    })

    it("returns proposal from direct object API response", async () => {
      const mockProp: GovernanceProposal = {
        id: "p_direct",
        title: "Direct",
        description: "Direct Desc",
        status: "active",
        votesFor: 50,
        votesAgainst: 5,
        timelockEndsAt: null,
      }
      mockedGet.mockResolvedValueOnce(mockProp)

      const result = await getProposal("p_direct")

      expect(mockedGet).toHaveBeenCalledWith("/governance/proposals/p_direct")
      expect(result).toEqual(mockProp)
    })

    it("falls back to matching mock proposal on API failure", async () => {
      mockedGet.mockRejectedValueOnce(new Error("API offline"))

      const result = await getProposal("prop_102")

      expect(result.id).toBe("prop_102")
      expect(result.title).toContain("MIP-15")
    })

    it("falls back to first mock proposal if requested ID is not in mock list on API failure", async () => {
      mockedGet.mockRejectedValueOnce(new Error("API offline"))

      const result = await getProposal("nonexistent_id")

      expect(result).toBe(MOCK_GOVERNANCE_PROPOSALS[0])
    })
  })

  describe("createProposal", () => {
    it("creates, unshifts onto mock list, and returns new proposal with default category", async () => {
      const initialCount = MOCK_GOVERNANCE_PROPOSALS.length

      const newProp = await createProposal({
        title: "MIP-99: Test Proposal",
        description: "Test description for new proposal",
        executionPayload: '{"action":"test"}',
      })

      expect(newProp.id).toMatch(/^prop_\d+$/)
      expect(newProp.title).toBe("MIP-99: Test Proposal")
      expect(newProp.category).toBe("Rule Amendment")
      expect(newProp.status).toBe("active")
      expect(newProp.votesFor).toBe(1)
      expect(newProp.votesAgainst).toBe(0)
      expect(newProp.votesAbstain).toBe(0)
      expect(newProp.executionPayload).toBe('{"action":"test"}')
      expect(MOCK_GOVERNANCE_PROPOSALS.length).toBe(initialCount + 1)
      expect(MOCK_GOVERNANCE_PROPOSALS[0]).toBe(newProp)
    })

    it("uses custom category if specified", async () => {
      const newProp = await createProposal({
        title: "MIP-100: Treasury Update",
        description: "Custom category test",
        executionPayload: "{}",
        category: "Treasury Release",
      })

      expect(newProp.category).toBe("Treasury Release")
    })
  })

  describe("voteOnProposal", () => {
    it("normalizes boolean support=true to 'for' and passes reason", async () => {
      const updatedProp: GovernanceProposal = {
        id: "prop_101",
        title: "Title",
        description: "Desc",
        status: "active",
        votesFor: 1421,
        votesAgainst: 180,
        timelockEndsAt: null,
      }
      mockedPost.mockResolvedValueOnce({ proposal: updatedProp })

      const res = await voteOnProposal("prop_101", true, "Good proposal")

      expect(mockedPost).toHaveBeenCalledWith(
        "/governance/proposals/prop_101/votes",
        {
          support: "for",
          reason: "Good proposal",
        },
      )
      expect(res).toEqual({ success: true, proposal: updatedProp })
    })

    it("normalizes boolean support=false to 'against'", async () => {
      const updatedProp: GovernanceProposal = {
        id: "prop_101",
        title: "Title",
        description: "Desc",
        status: "active",
        votesFor: 1420,
        votesAgainst: 181,
        timelockEndsAt: null,
      }
      mockedPost.mockResolvedValueOnce(updatedProp)

      const res = await voteOnProposal("prop_101", false)

      expect(mockedPost).toHaveBeenCalledWith(
        "/governance/proposals/prop_101/votes",
        {
          support: "against",
        },
      )
      expect(res).toEqual({ success: true, proposal: updatedProp })
    })

    it("normalizes choice 'abstain' and updates local tally if API returns empty body", async () => {
      mockedPost.mockResolvedValueOnce({})

      const target = MOCK_GOVERNANCE_PROPOSALS.find((p) => p.id === "prop_102")!
      const initialAbstain = target.votesAbstain || 0

      const res = await voteOnProposal("prop_102", "abstain")

      expect(mockedPost).toHaveBeenCalledWith(
        "/governance/proposals/prop_102/votes",
        {
          support: "abstain",
        },
      )
      expect(res.success).toBe(true)
      expect(res.proposal?.id).toBe("prop_102")
      expect(res.proposal?.votesAbstain).toBe(initialAbstain + 1)
    })

    it("propagates API errors without swallowing", async () => {
      mockedPost.mockRejectedValueOnce(new Error("Unauthorized signer"))

      await expect(voteOnProposal("prop_101", "for")).rejects.toThrow(
        "Unauthorized signer",
      )
    })
  })
})
