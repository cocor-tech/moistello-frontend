import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import InvitePage from "../[code]/page"

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ code: "ABC123" }),
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/lib/api-client", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
}))

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (s: { addToast: unknown }) => unknown) =>
    selector({ addToast: vi.fn() }),
}))

const HOUR = 3_600_000
const inHours = (h: number) => new Date(Date.now() + h * HOUR).toISOString()

function invite(over: Record<string, unknown> = {}) {
  return {
    code: "ABC123",
    circleId: "circle-1",
    circleName: "Rounds Club",
    expiresAt: inHours(24),
    useCount: 0,
    maxUses: 5,
    ...over,
  }
}

describe("InvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders for a non-member and shows the circle and countdown", async () => {
    mockGet.mockResolvedValue({ invite: invite() })
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-valid")).toBeDefined())
    expect(screen.getByText("Rounds Club")).toBeDefined()
    expect(screen.getByTestId("invite-countdown")).toHaveTextContent(/Expires in/)
  })

  it("looks the invite up by the code in the URL", async () => {
    mockGet.mockResolvedValue({ invite: invite() })
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-valid")).toBeDefined())
    expect(mockGet).toHaveBeenCalledWith("/circles/invites/ABC123")
  })

  it("explains an expired link instead of showing a generic error", async () => {
    mockGet.mockResolvedValue({ invite: invite({ expiresAt: inHours(-1) }) })
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-unavailable")).toBeDefined())
    expect(screen.getByRole("heading", { name: /invite expired/i })).toBeDefined()
    // Actionable: the recipient is told to ask for a new one.
    expect(screen.getByTestId("invite-unavailable")).toHaveTextContent(/new one/i)
  })

  it("explains a spent link distinctly from an expired one", async () => {
    mockGet.mockResolvedValue({ invite: invite({ useCount: 5, maxUses: 5 }) })
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-unavailable")).toBeDefined())
    expect(screen.getByTestId("invite-unavailable")).toHaveTextContent(
      /maximum number of times/i,
    )
  })

  it("hides the join button for an expired link", async () => {
    mockGet.mockResolvedValue({ invite: invite({ expiresAt: inHours(-1) }) })
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-unavailable")).toBeDefined())
    expect(screen.queryByTestId("invite-join-button")).toBeNull()
  })

  it("treats an unparseable expiry as expired rather than granting access", async () => {
    mockGet.mockResolvedValue({ invite: invite({ expiresAt: "garbage" }) })
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-unavailable")).toBeDefined())
    expect(screen.queryByTestId("invite-join-button")).toBeNull()
  })

  it("joins the circle and navigates there on success", async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ invite: invite() })
    mockPost.mockResolvedValue({})
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-join-button")).toBeDefined())
    await user.click(screen.getByTestId("invite-join-button"))

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/circles/circle-1/join", {
      inviteCode: "ABC123",
    }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/circles/circle-1"))
  })

  it("stays on the page and surfaces the error when joining fails", async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ invite: invite() })
    mockPost.mockRejectedValue(new Error("Invite already used"))
    render(<InvitePage />)

    await waitFor(() => expect(screen.getByTestId("invite-join-button")).toBeDefined())
    await user.click(screen.getByTestId("invite-join-button"))

    // A failed join must not look like a successful one.
    await waitFor(() => expect(screen.getByTestId("invite-valid")).toBeDefined())
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.queryByTestId("invite-joined")).toBeNull()
  })
})
