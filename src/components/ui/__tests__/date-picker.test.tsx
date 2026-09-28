import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DatePicker } from "../date-picker"

describe("DatePicker Component", () => {
  it("renders with label and placeholder", () => {
    render(<DatePicker value={null} onChange={vi.fn()} label="Expiry Date" placeholder="Pick a date" />)
    expect(screen.getByLabelText("Expiry Date")).toBeDefined()
    expect(screen.getByText("Pick a date")).toBeDefined()
  })

  it("opens calendar dialog on click", () => {
    render(<DatePicker value={null} onChange={vi.fn()} label="Select Date" />)
    const button = screen.getByLabelText("Select Date")
    fireEvent.click(button)

    expect(screen.getByRole("dialog", { name: "Calendar date picker" })).toBeDefined()
  })

  it("selects a date on day click", () => {
    const handleChange = vi.fn()
    render(<DatePicker value="2026-09-15" onChange={handleChange} label="Select Date" />)

    fireEvent.click(screen.getByLabelText("Select Date"))
    const dayBtn = screen.getByText("20")
    fireEvent.click(dayBtn)

    expect(handleChange).toHaveBeenCalledWith("2026-09-20")
  })

  it("supports clearing the selected date", () => {
    const handleChange = vi.fn()
    render(<DatePicker value="2026-09-15" onChange={handleChange} label="Select Date" />)

    const clearBtn = screen.getByLabelText("Clear date")
    fireEvent.click(clearBtn)

    expect(handleChange).toHaveBeenCalledWith("")
  })

  it("closes dialog on Escape key", () => {
    render(<DatePicker value={null} onChange={vi.fn()} label="Select Date" />)
    const button = screen.getByLabelText("Select Date")
    fireEvent.click(button)

    expect(screen.queryByRole("dialog")).toBeDefined()
    fireEvent.keyDown(button, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
