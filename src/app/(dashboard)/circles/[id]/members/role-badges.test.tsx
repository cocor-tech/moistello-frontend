import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "circle-1" }),
}))

const mockUseAuth = vi.fn(() => ({ user: { id: "user-1" } }))
const mockUseCircleMembers = vi.fn(() => ({
  data: [
    {
      id: "member-1",
      circleId: "circle-1",
      userId: "organizer-123",
      userName: "Alice",
      userAddress: "GABC",
      position: 1,
      status: "active",
      joinedAt: "2026-07-23T12:00:00.000Z",
    },
    {
      id: "member-2",
      circleId: "circle-1",
      userId: "member-456",
      userName: "Bob",
      userAddress: "GDEF",
      position: 2,
      status: "active",
      joinedAt: "2026-07-24T12:00:00.000Z",
    },
  ],
  isLoading: false,
  isError: false,
}))
const mockUseCircle = vi.fn(() => ({
  data: { organizerId: "organizer-123" },
  isLoading: false,
  isError: false,
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/hooks/use-circles", () => ({
  useCircleMembers: () => mockUseCircleMembers(),
  useCircle: () => mockUseCircle(),
}))

vi.mock("@/stores/ui-store", () => ({
  useUIStore: () => ({ addToast: vi.fn() }),
}))

import CircleMembersPage from "./page"

describe("CircleMembersPage role badges", () => {
  it("renders Organizer badge for the circle organizer", () => {
    render(<CircleMembersPage />)

    const badges = screen.getAllByText("Organizer")
    expect(badges).toHaveLength(1)
  })

  it("does not render Organizer badge for non-organizers", () => {
    render(<CircleMembersPage />)

    const bob = screen.getByText("Bob")
    expect(bob).toBeDefined()
    expect(screen.queryAllByText("Organizer")).toHaveLength(1)
  })

  it("renders no badges when organizerId is not set", () => {
    mockUseCircle.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    })

    render(<CircleMembersPage />)

    expect(screen.queryAllByText("Organizer")).toHaveLength(0)
  })
})
