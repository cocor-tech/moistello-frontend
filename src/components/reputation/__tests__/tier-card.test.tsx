import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TierCard } from "../tier-card"

describe("TierCard", () => {
  it("shows a loading state while the score is unavailable", () => {
    render(<TierCard score={undefined} />)

    expect(screen.getByLabelText("Loading tier progress")).toBeDefined()
  })

  it("renders the current tier, progress, and benefits", () => {
    render(<TierCard score={150} />)

    expect(screen.getByRole("heading", { name: "Bronze" })).toBeDefined()
    expect(screen.getByText("MoiScore: 150 / 1,000")).toBeDefined()
    expect(screen.getByText("Progress to Silver")).toBeDefined()
    expect(screen.getByText("50%")).toBeDefined()
    expect(screen.getByText("Create circles (up to 5 members)")).toBeDefined()
    expect(screen.getByText("Locked â€” Silver Benefits")).toBeDefined()
  })
})