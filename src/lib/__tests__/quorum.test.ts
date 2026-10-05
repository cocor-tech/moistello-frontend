import { describe, it, expect } from "vitest"
import { calculateQuorum, QUORUM_THRESHOLD } from "@/lib/quorum"

describe("calculateQuorum", () => {
  it("counts only yes+no votes toward quorum", () => {
    const result = calculateQuorum({ votesFor: 400, votesAgainst: 300 })
    expect(result.quorumVotes).toBe(700)
  })

  it("excludes abstentions even when they make up most of the votes (issue #491)", () => {
    // A majority-abstain proposal: 5000 abstain, but only 300 yes+no —
    // quorum must reflect the 300, not the 5300 total turnout.
    const result = calculateQuorum({ votesFor: 200, votesAgainst: 100 })
    expect(result.quorumVotes).toBe(300)
    expect(result.quorumReached).toBe(false)
    expect(result.quorumPercent).toBe(Math.round((300 / QUORUM_THRESHOLD) * 100))
  })

  it("reports quorum reached once yes+no meets the threshold, regardless of abstain volume", () => {
    const result = calculateQuorum({ votesFor: 700, votesAgainst: 300 })
    expect(result.quorumVotes).toBe(QUORUM_THRESHOLD)
    expect(result.quorumReached).toBe(true)
    expect(result.quorumPercent).toBe(100)
  })

  it("caps the percent at 100 when yes+no exceeds the threshold", () => {
    const result = calculateQuorum({ votesFor: 5000, votesAgainst: 5000 })
    expect(result.quorumPercent).toBe(100)
  })

  it("defaults missing vote counts to zero", () => {
    const result = calculateQuorum({} as { votesFor: number; votesAgainst: number })
    expect(result.quorumVotes).toBe(0)
    expect(result.quorumReached).toBe(false)
  })
})
