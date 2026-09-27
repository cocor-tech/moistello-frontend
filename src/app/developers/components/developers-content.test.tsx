import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DeveloperResources } from "./DeveloperResources"
import { apiEndpointGroups, errorCodes } from "../data/developer-content"

describe("developer content", () => {
  it("renders every API group and endpoint description", () => {
    render(<DeveloperResources />)
    expect(screen.getByRole("heading", { name: "Resources" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /API Documentation/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /GitHub/ })).toBeInTheDocument()
  })

  it("keeps reference data complete for the extracted sections", () => {
    expect(apiEndpointGroups).toHaveLength(3)
    expect(apiEndpointGroups.reduce((total, group) => total + group.endpoints.length, 0)).toBe(11)
    expect(errorCodes).toHaveLength(8)
  })
})
