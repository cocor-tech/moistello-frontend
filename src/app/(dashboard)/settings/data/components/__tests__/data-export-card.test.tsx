import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DataExportCard } from "../data-export-card"

/**
 * The acceptance criteria put two requirements on the client side: the action is
 * confirmed through an explicit modal, and the result is a real download.
 *
 * `URL.createObjectURL` is patched by defining the two properties directly and
 * deleting them afterwards. Stubbing the whole `URL` global instead leaks into
 * every later test in the file, because assigning onto the real constructor is
 * permanent.
 */

const ARCHIVE = {
  schemaVersion: 1,
  generatedAt: "2026-06-17T12:00:00.000Z",
  subject: { userId: "user-alice" },
  profile: { id: "user-alice" },
  contributions: [],
  notifications: [],
  counts: { contributions: 0, notifications: 0 },
}

const SERVER_FILENAME = "moistello-data-user-alice-2026-06-17.json"

const createObjectURL = vi.fn(() => "blob:mock-url")
const revokeObjectURL = vi.fn()
const anchorClick = vi.fn()

const fetchMock = vi.fn()

function jsonResponse(headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(ARCHIVE), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${SERVER_FILENAME}"`,
      ...headers,
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  createObjectURL.mockReturnValue("blob:mock-url")
  fetchMock.mockResolvedValue(jsonResponse())

  vi.stubGlobal("fetch", fetchMock)
  Object.defineProperty(URL, "createObjectURL", {
    value: createObjectURL,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revokeObjectURL,
    configurable: true,
    writable: true,
  })
  HTMLAnchorElement.prototype.click = anchorClick
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete (URL as unknown as Record<string, unknown>).createObjectURL
  delete (URL as unknown as Record<string, unknown>).revokeObjectURL
  vi.useRealTimers()
})

/** Opens the confirmation dialog and returns it. */
async function openDialog() {
  render(<DataExportCard />)
  fireEvent.click(screen.getByRole("button", { name: /^download my data$/i }))
  return screen.findByRole("dialog")
}

/** The dialog's confirm button, disambiguated from the page's trigger. */
function confirmButton(dialog: HTMLElement) {
  return within(dialog).getByRole("button", { name: /download my data/i })
}

describe("DataExportCard", () => {
  it("renders a download action", () => {
    render(<DataExportCard />)
    expect(screen.getByRole("button", { name: /download my data/i })).toBeInTheDocument()
  })

  it("does not request anything until the action is confirmed", async () => {
    const dialog = await openDialog()

    expect(dialog).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("states what the file contains before the user commits", async () => {
    const dialog = await openDialog()

    expect(dialog.textContent).toMatch(/json file with your profile/i)
    expect(dialog.textContent).toMatch(/only your own records|contains everything we hold/i)
  })

  it("requests the archive once confirmed", async () => {
    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/export", expect.any(Object)),
    )
  })

  it("sends the request same-origin so the session cookie travels", async () => {
    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.credentials).toBe("same-origin")
  })

  it("saves the file under the name the server chose", async () => {
    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => expect(anchorClick).toHaveBeenCalled())
    const anchor = anchorClick.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe(SERVER_FILENAME)
  })

  it("falls back to a default filename when the header is missing", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(ARCHIVE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => expect(anchorClick).toHaveBeenCalled())
    const anchor = anchorClick.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe("moistello-data-export.json")
  })

  it("cleans the anchor out of the document after clicking it", async () => {
    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => expect(anchorClick).toHaveBeenCalled())
    expect(document.querySelectorAll("a[download]")).toHaveLength(0)
  })

  it("revokes the object URL, but not before the download starts", async () => {
    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    // Revoking synchronously cancels the download in some browsers.
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it("confirms success", async () => {
    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => expect(screen.getByText(/download has started/i)).toBeInTheDocument())
  })

  it("explains a rate-limited response instead of downloading the error", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "Retry-After": "42", "Content-Type": "application/json" },
      }),
    )

    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    expect(await screen.findByRole("alert")).toHaveTextContent(/42s/)
    expect(anchorClick).not.toHaveBeenCalled()
  })

  it("explains an expired session", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }))

    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    expect(await screen.findByRole("alert")).toHaveTextContent(/session expired/i)
    expect(anchorClick).not.toHaveBeenCalled()
  })

  it("reports a server failure without downloading", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }))

    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not prepare/i)
    expect(anchorClick).not.toHaveBeenCalled()
  })

  it("reports a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("offline"))

    const dialog = await openDialog()
    fireEvent.click(confirmButton(dialog))

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not prepare/i)
  })

  it("lets the user cancel without requesting anything", async () => {
    const dialog = await openDialog()
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
