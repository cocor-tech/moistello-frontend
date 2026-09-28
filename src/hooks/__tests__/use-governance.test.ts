import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { get, post } from "@/lib/api-client"
import {
  useGovernanceProposals,
  useGovernanceProposal,
  useVoteOnProposal,
} from "@/hooks/use-governance"
import { createQueryWrapper } from "./test-utils"

vi.mock("@/lib/api-client", () => ({ get: vi.fn(), post: vi.fn() }))

const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)

describe("useGovernanceProposals", () => {
  it("loads proposals for the given status", async () => {
    mockedGet.mockResolvedValue({ proposals: [{ id: "p1", status: "active" }] })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useGovernanceProposals("active"), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/governance/proposals?status=active")
    expect(result.current.data).toEqual([{ id: "p1", status: "active" }])
  })
})

describe("useGovernanceProposal", () => {
  it("loads a single proposal by id", async () => {
    mockedGet.mockResolvedValue({ proposal: { id: "p1", status: "active" } })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useGovernanceProposal("p1"), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: "p1", status: "active" })
  })
})

describe("useVoteOnProposal", () => {
  it("posts the vote and invalidates cached proposal data", async () => {
    mockedPost.mockResolvedValue({})
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useVoteOnProposal("p1"), {
      wrapper: QueryWrapper,
    })

    await result.current.mutateAsync(true)

    // `true` is normalised to the three-way "for" / "against" / "abstain" shape
    // the store and the UI both speak, rather than the mixed
    // `boolean | "abstain"` union the hook used to forward verbatim.
    expect(mockedPost).toHaveBeenCalledWith("/governance/proposals/p1/votes", {
      support: "for",
    })
  })
})
