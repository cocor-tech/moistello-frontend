import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useSubmitGuard } from "@/hooks/use-submit-guard"
import { Button } from "@/components/ui/button"

function TestMutationForm({ onSubmit }: { onSubmit: (data: string) => Promise<void> }) {
  const { guard, isPending } = useSubmitGuard()
  const [val, setVal] = React.useState("test")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void guard(async () => {
      await onSubmit(val)
    })()
  }

  return (
    <form onSubmit={handleSubmit} data-testid="test-form">
      <input
        aria-label="Test Input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <Button
        type="submit"
        isLoading={isPending}
        disabled={isPending}
        data-testid="submit-btn"
      >
        Submit
      </Button>
    </form>
  )
}

describe("Form double-submit guard integration (#479)", () => {
  it("prevents form from submitting twice on rapid double click and shows pending state", async () => {
    let resolveSubmit: () => void
    const mockSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        }),
    )

    render(<TestMutationForm onSubmit={mockSubmit} />)
    const btn = screen.getByTestId("submit-btn")

    // Rapid double click
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)

    // Only invoked once
    expect(mockSubmit).toHaveBeenCalledTimes(1)
    // Pending state is visible on the submit control
    expect(btn).toHaveProperty("disabled", true)
    expect(btn.getAttribute("aria-busy")).toBe("true")

    // Finish submission
    resolveSubmit!()

    await waitFor(() => {
      expect(btn).toHaveProperty("disabled", false)
      expect(btn.getAttribute("aria-busy")).toBeNull()
    })
  })
})
