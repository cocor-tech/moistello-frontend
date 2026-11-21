import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PageHeader } from "../page-header"

describe("PageHeader", () => {
  it("renders the title and breadcrumbs", () => {
    render(
      <PageHeader
        title="Dashboard"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Profile" }]}
      />,
    )
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()
    expect(screen.getByText("Profile")).toHaveAttribute("aria-current", "page")
  })
})
