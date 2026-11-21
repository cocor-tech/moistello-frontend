import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Avatar } from "../avatar"

describe("Avatar", () => {
  it("shows initials fallback when no src is given", () => {
    render(<Avatar fallback="Jane Doe" />)
    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("renders an online indicator when online is true", () => {
    render(<Avatar fallback="Jane Doe" online />)
    expect(screen.getByLabelText("online")).toBeInTheDocument()
  })
})
