import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ProposalDetailPage from "../[id]/page"
import { getProposal, QUORUM_THRESHOLD_VOTES, type GovernanceProposal } from "@/lib/governance-api"

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "prop_101" }),
}))

vi.mock("@/lib/governance-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/governance-api")>(
    "@/lib/governance-api",
  )
  return {
    ...actual,
    getProposal: vi.fn(),
    voteOnProposal: vi.fn().mockResolvedValue({ success: true }),
  }
})

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

function makeProposal(overrides: Partial<GovernanceProposal> = {}): GovernanceProposal {
  return {
    id: "prop_101",
    title: "Test proposal",
    description: "A proposal used to exercise the quorum bar.",
    status: "active",
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    timelockEndsAt: null,
    ...overrides,
  }
}

function renderDetail() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ProposalDetailPage />
    </QueryClientProvider>,
  )
}

describe("ProposalDetailPage quorum progress", () => {
  beforeEach(() => {
    vi.mocked(getProposal).mockReset()
  })

  it("reports the current total against the threshold when quorum is not met", async () => {
    vi.mocked(getProposal).mockResolvedValue(
      makeProposal({ votesFor: 300, votesAgainst: 100, votesAbstain: 50 }),
    )
    renderDetail()

    const bar = await screen.findByRole("progressbar", { name: /quorum progress/i })
    // 450 of 1000 votes => 45%
    expect(bar.getAttribute("aria-valuenow")).toBe("45")
    expect(bar.getAttribute("aria-valuemin")).toBe("0")
    expect(bar.getAttribute("aria-valuemax")).toBe("100")
    expect(screen.getByTestId("quorum-status").textContent).toContain("450")
    expect(screen.getByText(/550 more votes needed to reach quorum/i)).toBeDefined()
  })

  it("counts every vote, including abstentions, toward quorum", async () => {
    // 600 For + 0 Against + 400 Abstain = exactly the threshold.
    vi.mocked(getProposal).mockResolvedValue(
      makeProposal({ votesFor: 600, votesAgainst: 0, votesAbstain: 400 }),
    )
    renderDetail()

    await waitFor(() => {
      expect(screen.getByTestId("quorum-status").textContent).toBe("Reached")
    })
    const bar = screen.getByRole("progressbar", { name: /quorum progress/i })
    expect(bar.getAttribute("aria-valuenow")).toBe("100")
  })

  it("caps the bar at 100% once well past the threshold", async () => {
    vi.mocked(getProposal).mockResolvedValue(
      makeProposal({ votesFor: 9_000, votesAgainst: 0, votesAbstain: 0 }),
    )
    renderDetail()

    await waitFor(() => {
      expect(screen.getByTestId("quorum-status").textContent).toBe("Reached")
    })
    const bar = screen.getByRole("progressbar", { name: /quorum progress/i })
    expect(bar.getAttribute("aria-valuenow")).toBe("100")
    expect(screen.getByText(/quorum reached/i)).toBeDefined()
  })

  it("handles a proposal with no votes yet without dividing by zero", async () => {
    vi.mocked(getProposal).mockResolvedValue(makeProposal())
    renderDetail()

    const bar = await screen.findByRole("progressbar", { name: /quorum progress/i })
    expect(bar.getAttribute("aria-valuenow")).toBe("0")
    expect(
      screen.getByText(
        new RegExp(
          `${QUORUM_THRESHOLD_VOTES.toLocaleString()} more votes needed to reach quorum`,
          "i",
        ),
      ),
    ).toBeDefined()
  })

  it("uses a singular label when exactly one vote is still needed", async () => {
    vi.mocked(getProposal).mockResolvedValue(
      makeProposal({ votesFor: QUORUM_THRESHOLD_VOTES - 1, votesAgainst: 0, votesAbstain: 0 }),
    )
    renderDetail()

    expect(await screen.findByText(/1 more vote needed to reach quorum/i)).toBeDefined()
  })

  it("does not round up to a full bar while quorum is still unreached", async () => {
    // 999/1000 would round to 100% and read as "quorum met" next to a status
    // that says otherwise, so the bar is floored to 99%.
    vi.mocked(getProposal).mockResolvedValue(
      makeProposal({ votesFor: QUORUM_THRESHOLD_VOTES - 1, votesAgainst: 0, votesAbstain: 0 }),
    )
    renderDetail()

    const bar = await screen.findByRole("progressbar", { name: /quorum progress/i })
    expect(bar.getAttribute("aria-valuenow")).toBe("99")
    expect(screen.getByTestId("quorum-status").textContent).not.toBe("Reached")
  })
})
