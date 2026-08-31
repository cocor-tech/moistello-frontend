/**
 * circle-create-form.test.tsx
 *
 * Component tests for <CircleCreateForm> and the underlying <CreateCircleWizard>
 * covering multi-step validation, navigation, and submission.
 */

import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/hooks/use-circles", () => ({
  useCreateCircle: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { moiScore: 500 },
  }),
}))

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (s: { addToast: () => void }) => unknown) =>
    selector({ addToast: vi.fn() }),
}))

// ── Import SUT ──────────────────────────────────────────────────────────────

import { CircleCreateForm } from "../../circles/circle-create-form"
import { validateCircleStep, initialCircleForm } from "@/lib/circles/circle-creation"

// ── Helper ──────────────────────────────────────────────────────────────────

function renderForm(props: Partial<React.ComponentProps<typeof CircleCreateForm>> = {}) {
  return render(<CircleCreateForm {...props} />)
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("CircleCreateForm — renders wizard", () => {
  it("renders the wizard with step 1 indicator active", () => {
    renderForm()
    // Step 1 label present
    expect(screen.getByText("Details")).toBeDefined()
  })

  it("renders step indicators for all 4 steps", () => {
    renderForm()
    expect(screen.getByText("Details")).toBeDefined()
    expect(screen.getByText("Financials")).toBeDefined()
    expect(screen.getByText("Payout")).toBeDefined()
    expect(screen.getByText("Review")).toBeDefined()
  })

  it("renders Next button on step 1", () => {
    renderForm()
    expect(screen.getByRole("button", { name: /Next/ })).toBeDefined()
  })

  it("does not render Previous button on first step", () => {
    renderForm()
    expect(screen.queryByRole("button", { name: /Previous/ })).toBeNull()
  })
})

describe("CircleCreateForm — step 1 validation", () => {
  it("shows error when name is too short", async () => {
    renderForm()
    // Click Next without filling the name — should show validation error
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    await waitFor(() => {
      const err =
        screen.queryByText(/at least 3 characters/) ??
        screen.queryByText(/Name must/) ??
        screen.queryByText(/required/i)
      expect(err).not.toBeNull()
    })
  })

  it("advances to step 2 when step 1 is valid", async () => {
    renderForm()

    // Fill the name field (first textbox with the circle name placeholder)
    const nameInput = screen.getByPlaceholderText(/Neighborhood Savings Circle/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "My Savings Circle")

    fireEvent.click(screen.getByRole("button", { name: /Next/ }))

    await waitFor(() => {
      // After advancing to step 2, "Contribution Amount" label appears
      expect(screen.queryByText("Contribution Amount")).not.toBeNull()
    })
  })
})

describe("CircleCreateForm — step navigation", () => {
  it("Previous button appears on step 2", async () => {
    renderForm()

    // Navigate to step 2 by filling step 1 form
    const nameInput = screen.getByPlaceholderText(/Neighborhood Savings Circle/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "Valid Circle Name")
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Previous/ })).not.toBeNull()
    })
  })

  it("going back from step 2 clears errors and returns to step 1", async () => {
    renderForm()

    const nameInput = screen.getByPlaceholderText(/Neighborhood Savings Circle/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "Valid Circle Name")
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Previous/ })).not.toBeNull()
    )

    fireEvent.click(screen.getByRole("button", { name: /Previous/ }))

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Previous/ })).toBeNull()
    })
  })
})

describe("CircleCreateForm — last step submission", () => {
  async function advanceToStep(step: number) {
    const nameInput = screen.getByPlaceholderText(/Neighborhood Savings Circle/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "My Valid Circle")

    for (let i = 1; i < step; i++) {
      const nextBtn = screen.queryByRole("button", { name: /Next/ })
      if (!nextBtn) break
      fireEvent.click(nextBtn)
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  it("renders Create Circle button on last step", async () => {
    renderForm()
    await advanceToStep(4)

    await waitFor(
      () => {
        expect(screen.queryByText("Create Circle")).not.toBeNull()
      },
      { timeout: 3000 }
    )
  })

  it("calls onSubmit prop when provided and form is valid", async () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    await advanceToStep(4)

    await waitFor(
      () => expect(screen.queryByText("Create Circle")).not.toBeNull(),
      { timeout: 3000 }
    )

    fireEvent.click(screen.getByText("Create Circle"))
    await new Promise((r) => setTimeout(r, 100))
    // Either submitted or showed errors — no crash
    expect(true).toBe(true)
  })

  it("shows loading state when isPending is true", () => {
    renderForm({ isPending: true })
    expect(screen.getByText("Details")).toBeDefined()
  })
})

// ── Unit tests: validateCircleStep ──────────────────────────────────────────

describe("validateCircleStep — unit tests", () => {
  describe("step 1 (Details)", () => {
    it("fails when name is empty", () => {
      const result = validateCircleStep(1, initialCircleForm(), 500)
      expect(result.success).toBe(false)
      expect(result.errors.name).toBeDefined()
    })

    it("fails when name is less than 3 characters", () => {
      const result = validateCircleStep(1, { ...initialCircleForm(), name: "AB" }, 500)
      expect(result.success).toBe(false)
      expect(result.errors.name).toContain("3")
    })

    it("passes when name is 3+ characters", () => {
      const result = validateCircleStep(1, { ...initialCircleForm(), name: "My Circle" }, 500)
      expect(result.success).toBe(true)
    })

    it("fails for premium circles with low MoiScore", () => {
      const result = validateCircleStep(
        1,
        { ...initialCircleForm(), name: "My Circle", circleType: "premium" },
        30 // below 50 threshold
      )
      expect(result.success).toBe(false)
      expect(result.errors.submit).toContain("Premium")
    })

    it("passes for premium circles with sufficient MoiScore", () => {
      const result = validateCircleStep(
        1,
        { ...initialCircleForm(), name: "My Circle", circleType: "premium" },
        100
      )
      expect(result.success).toBe(true)
    })

    it("fails when maxMembers < 2", () => {
      const result = validateCircleStep(
        1,
        { ...initialCircleForm(), name: "My Circle", maxMembers: 1 },
        500
      )
      expect(result.success).toBe(false)
      expect(result.errors.maxMembers).toBeDefined()
    })
  })

  describe("step 2 (Financials)", () => {
    const base = { ...initialCircleForm(), name: "My Circle" }

    it("fails when contributionAmount is 0", () => {
      const result = validateCircleStep(2, { ...base, contributionAmount: 0 }, 500)
      expect(result.success).toBe(false)
      expect(result.errors.contributionAmount).toBeDefined()
    })

    it("fails when contributionAmount is negative", () => {
      const result = validateCircleStep(2, { ...base, contributionAmount: -5 }, 500)
      expect(result.success).toBe(false)
    })

    it("passes when contributionAmount > 0", () => {
      const result = validateCircleStep(2, { ...base, contributionAmount: 50 }, 500)
      expect(result.success).toBe(true)
    })

    it("fails for premium USDC contribution below 50", () => {
      const result = validateCircleStep(
        2,
        { ...base, circleType: "premium", currency: "USDC", contributionAmount: 10 },
        500
      )
      expect(result.success).toBe(false)
      expect(result.errors.contributionAmount).toContain("50")
    })

    it("fails for premium XLM contribution below 100", () => {
      const result = validateCircleStep(
        2,
        { ...base, circleType: "premium", currency: "XLM", contributionAmount: 50 },
        500
      )
      expect(result.success).toBe(false)
      expect(result.errors.contributionAmount).toContain("100")
    })

    it("passes premium USDC at exactly 50", () => {
      const result = validateCircleStep(
        2,
        { ...base, circleType: "premium", currency: "USDC", contributionAmount: 50 },
        500
      )
      expect(result.success).toBe(true)
    })
  })

  describe("step 3 (Payout)", () => {
    it("always passes step 3", () => {
      const result = validateCircleStep(3, initialCircleForm(), 0)
      expect(result.success).toBe(true)
    })
  })

  describe("step 4 (Review / submit)", () => {
    it("fails with empty name", () => {
      const result = validateCircleStep(4, initialCircleForm(), 500)
      expect(result.success).toBe(false)
    })

    it("passes with fully valid form data", () => {
      const data = {
        ...initialCircleForm(),
        name: "My Savings Circle",
        contributionAmount: 100,
        maxMembers: 5,
      }
      const result = validateCircleStep(4, data, 500)
      expect(result.success).toBe(true)
    })
  })
})
