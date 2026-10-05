import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { RoundHistoryTimeline } from "./round-history-timeline"
import type { CircleMember, CircleRound, Contribution } from "@/types"

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: overrides.id ?? "c1",
    circleId: "circle-1",
    userId: overrides.userId ?? "user-1",
    roundNumber: overrides.roundNumber ?? 1,
    amount: overrides.amount ?? 50,
    txnHash: null,
    status: overrides.status ?? "confirmed",
    onTime: overrides.onTime ?? true,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  }
}

const members: CircleMember[] = [
  {
    id: "m1",
    circleId: "circle-1",
    userId: "user-1",
    position: 1,
    status: "active",
    userName: "Ada Lovelace",
    joinedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "m2",
    circleId: "circle-1",
    userId: "user-2",
    position: 2,
    status: "active",
    userName: "Grace Hopper",
    joinedAt: "2025-01-01T00:00:00.000Z",
  },
]

const rounds: CircleRound[] = [
  {
    roundNumber: 1,
    contributions: [
      contribution({ id: "a", userId: "user-1", roundNumber: 1 }),
      contribution({ id: "b", userId: "user-2", roundNumber: 1, status: "failed" }),
    ],
    payout: {
      id: "p1",
      circleId: "circle-1",
      recipientId: "user-1",
      roundNumber: 1,
      amount: 500,
      feeAmount: 1,
      txnHash: null,
      payoutType: "random",
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  },
  {
    roundNumber: 2,
    contributions: [contribution({ id: "c", userId: "user-2", roundNumber: 2 })],
  },
]

/** A circle with `count` rounds, each with `perRound` members contributing. */
function manyRounds(count: number, perRound = 6): CircleRound[] {
  return Array.from({ length: count }, (_, index) => ({
    roundNumber: index + 1,
    contributions: Array.from({ length: perRound }, (_, member) =>
      contribution({
        id: `c-${index}-${member}`,
        userId: `user-${member}`,
        roundNumber: index + 1,
        status: "confirmed",
      }),
    ),
  }))
}

function renderTimeline(overrides: Partial<React.ComponentProps<typeof RoundHistoryTimeline>> = {}) {
  return render(
    <RoundHistoryTimeline
      rounds={rounds}
      members={members}
      maxMembers={2}
      contributionAmount={50}
      currentRound={3}
      currency="USDC"
      circleName="Alpha Savings"
      {...overrides}
    />,
  )
}

describe("RoundHistoryTimeline — empty state", () => {
  it("explains that the circle has not started yet", () => {
    renderTimeline({ rounds: [], circleName: "Alpha Savings" })

    expect(screen.getByText("No rounds yet")).toBeInTheDocument()
    expect(screen.getByText(/Alpha Savings has not started its first round yet/i)).toBeInTheDocument()
  })

  it("renders no timeline chrome when there is nothing to summarise", () => {
    renderTimeline({ rounds: [] })

    expect(screen.queryByRole("heading", { name: /round history/i })).not.toBeInTheDocument()
  })
})

describe("RoundHistoryTimeline — summary", () => {
  it("summarises each round with its date, participation and payout", () => {
    renderTimeline()

    const round1 = screen.getByRole("button", { name: /round 1/i })

    // Newest first, so round 2 precedes round 1 in the DOM.
    expect(round1).toHaveAttribute("aria-expanded", "false")
    expect(within(round1).getByText("1/2 contributed")).toBeInTheDocument()
    expect(within(round1).getByText(/500\.00 USDC/)).toBeInTheDocument()
  })

  it("shows a collected total for a round with no payout yet", () => {
    renderTimeline()

    const round2 = screen.getByRole("button", { name: /round 2/i })

    expect(within(round2).getByText("1/2 contributed")).toBeInTheDocument()
    expect(within(round2).getByText(/50\.00 USDC collected/)).toBeInTheDocument()
  })

  it("orders rounds newest first", () => {
    renderTimeline()

    const headings = screen.getAllByRole("button", { name: /round \d/i })
    expect(headings[0]).toHaveAccessibleName(/round 2/i)
  })

  it("marks the in-progress round", () => {
    renderTimeline({ currentRound: 1 })

    expect(screen.getByText("In progress")).toBeInTheDocument()
  })

  it("reports aggregate participation and total paid out", () => {
    renderTimeline()

    // 1/2 then 1/2 = 50% across the circle's rounds.
    expect(screen.getByText("50%")).toBeInTheDocument()

    // Scoped to the stat cell: the same figure also appears in round 1's own
    // payout pill, so a bare getByText would be ambiguous.
    const totalCell = screen.getByText("Total paid out").parentElement
    expect(totalCell).toHaveTextContent("500.00 USDC")
    expect(screen.getByText("1 completed payout")).toBeInTheDocument()
  })
})

describe("RoundHistoryTimeline — expanding for per-member detail", () => {
  it("mounts no member detail until a round is opened", () => {
    renderTimeline()

    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument()
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument()
  })

  it("reveals the named contributors for the opened round", () => {
    renderTimeline()

    const round1 = screen.getByRole("button", { name: /round 1/i })
    fireEvent.click(round1)

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument()
  })

  it("falls back to a truncated address for an unknown contributor", () => {
    renderTimeline({
      rounds: [
        {
          roundNumber: 1,
          contributions: [contribution({ userId: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" })],
        },
      ],
      members: [],
    })

    fireEvent.click(screen.getByRole("button", { name: /round 1/i }))

    expect(screen.getByText("GXXXXX...XXXX")).toBeInTheDocument()
  })

  it("toggles aria-expanded and closes again on a second click", () => {
    renderTimeline()

    const round1 = screen.getByRole("button", { name: /round 1/i })

    fireEvent.click(round1)
    expect(round1).toHaveAttribute("aria-expanded", "true")

    fireEvent.click(round1)
    expect(round1).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument()
  })

  it("points aria-controls at the panel it owns", () => {
    renderTimeline()

    const round1 = screen.getByRole("button", { name: /round 1/i })
    const panelId = round1.getAttribute("aria-controls")

    expect(panelId).toBeTruthy()
    fireEvent.click(round1)
    expect(document.getElementById(panelId!)).toBeInTheDocument()
  })

  it("opens one round at a time, so detail never stacks up", () => {
    renderTimeline()

    const round1 = screen.getByRole("button", { name: /round 1/i })
    const round2 = screen.getByRole("button", { name: /round 2/i })

    fireEvent.click(round1)
    fireEvent.click(round2)

    expect(round1).toHaveAttribute("aria-expanded", "false")
    expect(round2).toHaveAttribute("aria-expanded", "true")
    // Round 1's members are unmounted, not merely hidden.
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument()
  })

  it("says so when a round has no contributions at all", () => {
    renderTimeline({
      rounds: [{ roundNumber: 1, contributions: [] }],
      maxMembers: 4,
    })

    fireEvent.click(screen.getByRole("button", { name: /round 1/i }))

    expect(screen.getByText(/no contributions were recorded in round 1/i)).toBeInTheDocument()
  })
})

describe("RoundHistoryTimeline — 50+ rounds", () => {
  // The acceptance criterion. A 60-round circle with 6 members each is 360
  // potential detail rows; the collapsed timeline must mount none of them, and
  // must not mount 60 summary rows either.
  it("mounts a bounded number of rows for 60 rounds", () => {
    renderTimeline({ rounds: manyRounds(60), maxMembers: 6, currentRound: 0 })

    const rows = screen.getAllByRole("button", { name: /round \d/i })

    expect(rounds.length).toBeLessThan(60) // guards the fixture itself
    expect(rows.length).toBe(20)
    // The newest rounds are the ones shown.
    expect(rows[0]).toHaveAccessibleName(/round 60/i)
  })

  it("mounts zero per-member rows before anything is expanded", () => {
    renderTimeline({ rounds: manyRounds(60), maxMembers: 6, currentRound: 0 })

    // 60 rounds x 6 members would be 360 detail rows. Collapsed, none exist.
    // Scoped to the named member list, since the timeline rows are `listitem`
    // too and a bare count would be ambiguous.
    expect(
      screen.queryByRole("list", { name: /members in round \d/i }),
    ).not.toBeInTheDocument()
  })

  it("reveals earlier rounds on request, and still mounts detail lazily", () => {
    renderTimeline({ rounds: manyRounds(60), maxMembers: 6, currentRound: 0 })

    fireEvent.click(screen.getByRole("button", { name: /show 20 earlier rounds/i }))

    const rows = screen.getAllByRole("button", { name: /round \d/i })
    expect(rows).toHaveLength(40)
    expect(screen.getByRole("button", { name: /show 20 earlier rounds/i })).toBeInTheDocument()

    // Opening one round renders that round's members and nothing more.
    fireEvent.click(rows[39])

    const memberList = screen.getByRole("list", { name: /members in round 21/i })
    expect(within(memberList).getAllByRole("listitem")).toHaveLength(6)
  })

  it("drops the control once every round is shown", () => {
    renderTimeline({ rounds: manyRounds(25), maxMembers: 6, currentRound: 0 })

    fireEvent.click(screen.getByRole("button", { name: /show 5 earlier rounds/i }))

    expect(
      screen.queryByRole("button", { name: /show .* earlier rounds/i }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /round \d/i })).toHaveLength(25)
  })

  it("mounts no per-member panel for any round until one is opened", () => {
    const { container } = renderTimeline({
      rounds: manyRounds(60),
      maxMembers: 6,
      currentRound: 0,
    })

    // 60 rounds x 6 members would be 360 detail rows. Collapsed, none are
    // mounted: no panel id exists in the DOM for any round.
    expect(container.querySelectorAll("[id$='-detail']")).toHaveLength(0)

    // Summaries are computed once for the whole set, not per rendered row.
    expect(screen.getAllByRole("button", { name: /round \d/i })).toHaveLength(20)
  })
})

describe("RoundHistoryTimeline — accessibility", () => {
  it("labels the timeline as a named region", () => {
    renderTimeline()

    expect(
      screen.getByRole("region", { name: /round history/i }),
    ).toBeInTheDocument()
  })

  it("exposes the participation meter as a labelled image", () => {
    renderTimeline()

    expect(screen.getAllByRole("img", { name: /50% participation/i })).not.toHaveLength(0)
  })

  it("states contribution status in text, not colour alone", () => {
    renderTimeline()

    fireEvent.click(screen.getByRole("button", { name: /round 1/i }))

    expect(screen.getByText("On time")).toBeInTheDocument()
    expect(screen.getByText("failed")).toBeInTheDocument()
  })
})
