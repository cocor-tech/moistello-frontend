import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ContributionForm } from "../contribution-form"

function mockFetchOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  )
}

describe("ContributionForm validation error summary", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockFetchOk()
  })

  it("does not show a summary before the first submit attempt", () => {
    render(<ContributionForm />)
    // Announcing every field as invalid on first paint would be hostile.
    expect(screen.queryByTestId("error-summary")).toBeNull()
  })

  it("announces a single summary listing every invalid field on submit", async () => {
    const user = userEvent.setup()
    render(<ContributionForm />)

    await user.click(screen.getByRole("button", { name: /submit application/i }))

    const summary = await screen.findByTestId("error-summary")
    expect(summary).toHaveAttribute("role", "alert")
    expect(summary.textContent).toMatch(/please fix the following errors/i)
    // name + github + contribution are required; bio is optional.
    expect(summary.textContent).toMatch(/name is required/i)
    expect(summary.textContent).toMatch(/github profile is required/i)
    expect(summary.textContent).toMatch(/select an area/i)
  })

  it("moves focus to the summary so the alert is not missed", async () => {
    const user = userEvent.setup()
    render(<ContributionForm />)

    await user.click(screen.getByRole("button", { name: /submit application/i }))
    await screen.findByTestId("error-summary")

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByTestId("error-summary").querySelector("p"),
      )
    })
  })

  it("links each summary entry to its field and focuses it on click", async () => {
    const user = userEvent.setup()
    render(<ContributionForm />)

    await user.click(screen.getByRole("button", { name: /submit application/i }))
    const summary = await screen.findByTestId("error-summary")

    const githubLink = screen.getByRole("link", { name: /github profile/i })
    expect(githubLink.getAttribute("href")).toBe("#app-github")
    expect(summary.contains(githubLink)).toBe(true)

    await user.click(githubLink)
    expect(document.activeElement).toBe(document.getElementById("app-github"))
  })

  it("associates each invalid field with its own error via aria-describedby", async () => {
    const user = userEvent.setup()
    render(<ContributionForm />)

    await user.click(screen.getByRole("button", { name: /submit application/i }))
    await screen.findByTestId("error-summary")

    const nameField = document.getElementById("app-name") as HTMLInputElement
    expect(nameField.getAttribute("aria-invalid")).toBe("true")
    const describedBy = nameField.getAttribute("aria-describedby")
    expect(describedBy).toBe("app-name-error")
    // The id must actually resolve, or the association is meaningless.
    const errorNode = document.getElementById(describedBy!)
    expect(errorNode).not.toBeNull()
    expect(errorNode!.textContent).toMatch(/name is required/i)
  })

  it("removes the summary once the fields become valid", async () => {
    const user = userEvent.setup()
    render(<ContributionForm />)

    await user.click(screen.getByRole("button", { name: /submit application/i }))
    await screen.findByTestId("error-summary")

    await user.type(document.getElementById("app-name")!, "Jane Doe")
    await user.type(document.getElementById("app-github")!, "https://github.com/janedoe")
    await user.selectOptions(document.getElementById("app-area")!, "Design & UI/UX")

    await waitFor(() => {
      expect(screen.queryByTestId("error-summary")).toBeNull()
    })
  })

  it("does not steal focus back while the user corrects the fields", async () => {
    const user = userEvent.setup()
    render(<ContributionForm />)

    await user.click(screen.getByRole("button", { name: /submit application/i }))
    await screen.findByTestId("error-summary")

    // The summary must not re-focus on every re-render, or the caret is
    // yanked out of the field the user is typing into.
    const nameField = document.getElementById("app-name") as HTMLInputElement
    await user.click(nameField)
    await user.type(nameField, "Jane")
    expect(document.activeElement).toBe(nameField)
  })

  it("does not submit to the API when validation fails", async () => {
    const user = userEvent.setup()
    render(<ContributionForm />)

    await user.click(screen.getByRole("button", { name: /submit application/i }))
    await screen.findByTestId("error-summary")

    expect(fetch).not.toHaveBeenCalled()
  })
})
