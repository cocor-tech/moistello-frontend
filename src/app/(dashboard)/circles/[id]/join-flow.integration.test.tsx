import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { get, post } from "@/lib/api-client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import CircleDetailPage from "./page"

/**
 * Page-level integration coverage of the code-entry join path (#473).
 *
 * `circles/[id]/page.test.tsx` stubs `CircleJoinCodeModal` to `null`, so the
 * whole "code entry → submit" leg is untested there. This file renders the real
 * modal and the real `useJoinCircle`, replacing only the HTTP transport and the
 * presentational sub-components, so the assertion can be on member state.
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "circle-42" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "user-7" } }) }))
vi.mock("@/lib/api-client", () => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (s: { addToast: unknown }) => unknown) => selector({ addToast: vi.fn() }),
}))
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock("./circle-members-preview", () => ({
  CircleMembersPreview: () => <div data-testid="members-preview" />,
}))
vi.mock("./circle-stat-cards", () => ({
  CircleStatCards: () => <div data-testid="stat-cards" />,
}))
vi.mock("./circle-round-timeline", () => ({
  CircleRoundTimeline: () => <div data-testid="round-timeline" />,
}))
vi.mock("./circle-payouts-list", () => ({
  CirclePayoutsList: () => <div data-testid="payouts-list" />,
}))
vi.mock("./circle-contribute-modal", () => ({
  CircleContributeModal: () => null,
}))
vi.mock("./circle-invite-modal", () => ({
  CircleInviteModal: () => null,
}))
vi.mock("./use-invite-generation", () => ({
  useInviteGeneration: () => ({
    isOpen: false,
    isLoading: false,
    isError: false,
    error: null,
    code: "",
    copied: false,
    generate: vi.fn(),
    close: vi.fn(),
    copy: vi.fn(),
  }),
}))

const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)

const CIRCLE = {
  id: "circle-42",
  name: "Savers Guild",
  description: "A community of disciplined savers.",
  organizerId: "user-1",
  contributionAmount: 25,
  currency: "USDC",
  circleType: "private",
  status: "active",
}

const MEMBER = {
  id: "m2",
  circleId: CIRCLE.id,
  userId: "user-7",
  position: 2,
  status: "active",
  userName: "Ada",
  joinedAt: "2026-06-17T10:00:00.000Z",
}

function apiOk<T>(data: T) {
  return { success: true as const, data }
}

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { response: { status, data: { error: message } } })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <CircleDetailPage />
    </QueryClientProvider>,
  )
}

/**
 * Renders and waits for the circle to load, so the join actions are live.
 *
 * Waits on the join affordance rather than the circle name: the name appears in
 * both the breadcrumb and the heading, so `getByText` would match twice.
 */
async function renderLoadedPage() {
  const result = renderPage()
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /join with invite code|^join circle$/i }),
    ).toBeInTheDocument(),
  )
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGet.mockImplementation(async (url: string) => {
    if (String(url).includes("/members")) return apiOk({ members: [] })
    if (String(url).includes("/payouts")) return apiOk({ payouts: [] })
    return apiOk({ circle: CIRCLE })
  })
  mockedPost.mockResolvedValue(apiOk(MEMBER))
})

describe("join with an invite code — successful", () => {
  it("sends the entered code to the join endpoint", async () => {
    await renderLoadedPage()

    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    fireEvent.change(await screen.findByLabelText(/circle invite code/i), {
      target: { value: "JOIN-123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^join circle$/i }))

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith(`/circles/${CIRCLE.id}/join`, {
        inviteCode: "JOIN-123",
      }),
    )
  })

  it("trims the code before sending it", async () => {
    await renderLoadedPage()

    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    fireEvent.change(await screen.findByLabelText(/circle invite code/i), {
      target: { value: "  JOIN-123  " },
    })
    fireEvent.click(screen.getByRole("button", { name: /^join circle$/i }))

    // The page owns trimming; the hook forwards verbatim.
    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith(`/circles/${CIRCLE.id}/join`, {
        inviteCode: "JOIN-123",
      }),
    )
  })

  it("closes the modal and clears the code after a successful join", async () => {
    await renderLoadedPage()

    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    const input = await screen.findByLabelText(/circle invite code/i)
    fireEvent.change(input, { target: { value: "JOIN-123" } })
    fireEvent.click(screen.getByRole("button", { name: /^join circle$/i }))

    await waitFor(() => expect(screen.queryByLabelText(/circle invite code/i)).toBeNull())
  })

  it("refreshes the member list so the new state is visible", async () => {
    const memberCalls: string[] = []
    mockedGet.mockImplementation(async (url: string) => {
      const href = String(url)
      if (href.includes("/members")) {
        memberCalls.push(href)
        return apiOk({ members: memberCalls.length > 1 ? [MEMBER] : [] })
      }
      if (href.includes("/payouts")) return apiOk({ payouts: [] })
      return apiOk({ circle: CIRCLE })
    })

    await renderLoadedPage()
    const before = memberCalls.length

    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    fireEvent.change(await screen.findByLabelText(/circle invite code/i), {
      target: { value: "JOIN-123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^join circle$/i }))

    // onSuccess invalidates the members key, which triggers a refetch.
    await waitFor(() => expect(memberCalls.length).toBeGreaterThan(before))
  })
})

describe("join with an invite code — invalid or expired", () => {
  it("shows the server's error and keeps the modal open", async () => {
    mockedPost.mockRejectedValue(httpError("Invite code has expired"))

    await renderLoadedPage()

    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    fireEvent.change(await screen.findByLabelText(/circle invite code/i), {
      target: { value: "EXPIRED" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^join circle$/i }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/invite code has expired/i)
    // Staying open is what lets the user correct the code.
    expect(screen.getByLabelText(/circle invite code/i)).toBeInTheDocument()
  })

  it("does not clear the entered code after a failure", async () => {
    mockedPost.mockRejectedValue(httpError("Invite code is no longer valid"))

    await renderLoadedPage()
    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    fireEvent.change(await screen.findByLabelText(/circle invite code/i), {
      target: { value: "STALE" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^join circle$/i }))

    await screen.findByRole("alert")
    expect(screen.getByLabelText(/circle invite code/i)).toHaveValue("STALE")
  })

  it("will not submit an empty code", async () => {
    await renderLoadedPage()

    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    const submit = await screen.findByRole("button", { name: /^join circle$/i })

    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(mockedPost).not.toHaveBeenCalled()
  })
})

describe("join — already a member", () => {
  it("hides the join affordance once the user is a member", async () => {
    mockedGet.mockImplementation(async (url: string) => {
      const href = String(url)
      if (href.includes("/members")) return apiOk({ members: [MEMBER] })
      if (href.includes("/payouts")) return apiOk({ payouts: [] })
      return apiOk({ circle: CIRCLE })
    })

    // Waits on the loaded detail section (a mocked child), not on a join
    // button: the assertion below is that this button never appears.
    renderPage()
    await waitFor(() => expect(screen.getByTestId("stat-cards")).toBeInTheDocument())

    // The roster already contains the user, so the page must not offer to join
    // again — that is the re-entry guard, before any request is made.
    expect(screen.queryByRole("button", { name: /join with invite code/i })).toBeNull()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it("offers to join a public circle the user has not joined", async () => {
    mockedGet.mockImplementation(async (url: string) => {
      const href = String(url)
      if (href.includes("/members")) return apiOk({ members: [] })
      if (href.includes("/payouts")) return apiOk({ payouts: [] })
      return apiOk({ circle: { ...CIRCLE, circleType: "public" } })
    })

    await renderLoadedPage()

    // Public circles skip the code step entirely.
    expect(screen.getByRole("button", { name: /^join circle$/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /join with invite code/i })).toBeNull()
  })

  it("surfaces a conflict from a double submit without breaking the page", async () => {
    mockedPost.mockRejectedValue(httpError("You are already a member of this circle", 409))

    await renderLoadedPage()
    fireEvent.click(screen.getByRole("button", { name: /join with invite code/i }))
    fireEvent.change(await screen.findByLabelText(/circle invite code/i), {
      target: { value: "JOIN-123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^join circle$/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/already a member/i)
    // The page is still interactive.
    expect(screen.getByLabelText(/circle invite code/i)).toBeEnabled()
  })
})
