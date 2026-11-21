import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Progress } from "../progress"

describe("Progress", () => {
  it("exposes the value as an accessible progressbar", () => {
    render(<Progress value={40} />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "40")
    expect(bar).toHaveAttribute("aria-valuemin", "0")
    expect(bar).toHaveAttribute("aria-valuemax", "100")
  })

  it("clamps values below 0 to 0", () => {
    render(<Progress value={-25} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
  })

  it("clamps values above 100 to 100", () => {
    render(<Progress value={180} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })

  it("hides the percentage label by default", () => {
    render(<Progress value={50} />)
    expect(screen.queryByText("50%")).not.toBeInTheDocument()
  })

  it("shows a rounded percentage label when showLabel is set", () => {
    render(<Progress value={66.6} showLabel />)
    expect(screen.getByText("67%")).toBeInTheDocument()
  })

  it("labels the clamped value, not the raw input", () => {
    render(<Progress value={250} showLabel />)
    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("merges a custom className onto the wrapper", () => {
    render(<Progress value={10} className="my-progress" />)
    expect(screen.getByRole("progressbar")).toHaveClass("my-progress")
  })
})
