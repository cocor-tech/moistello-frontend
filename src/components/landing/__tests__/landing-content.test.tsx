import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LandingContent } from "../landing-content"

const translations: Record<string, string> = {
  "landing.badge": "The future of collective savings",
  "landing.saveTogether": "Save together",
  "landing.grow": "Grow",
  "landing.together": "Together",
  "landing.heroDesc": "Pool contributions and fund shared goals.",
  "landing.launchApp": "Launch app",
  "landing.howItWorks": "How it works",
  "landing.fees": "Zero fees",
  "landing.settlement": "Instant settlement",
  "landing.architectureTitle": "Built for communities",
  "landing.feat1Title": "Trustless pools",
  "landing.feat1Desc": "Transparent on-chain savings",
  "landing.feat2Title": "Global access",
  "landing.feat2Desc": "Available everywhere",
  "landing.feat3Title": "Reputation",
  "landing.feat3Desc": "Portable on-chain history",
  "landing.feat4Title": "Instant payouts",
  "landing.feat4Desc": "Fast shared distributions",
  "landing.feat5Title": "Flexible rotations",
  "landing.feat5Desc": "Adaptable contribution cycles",
  "landing.feat6Title": "Low cost",
  "landing.feat6Desc": "Minimal transaction fees",
  "landing.contractsCount": "1,284",
  "landing.contractsLabel": "Contracts deployed",
  "landing.contractsList": "Audited and verified smart contracts",
  "landing.readyTitle": "Ready to save together?",
  "landing.readyDesc": "Start your first community pool today.",
}

const mockT = vi.fn((key: string) => translations[key] ?? key)

vi.mock("@/lib/locale/context", () => ({
  useTranslate: () => ({ t: mockT }),
}))

describe("LandingContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the translated hero, calls-to-action, and key stats", () => {
    render(<LandingContent />)

    expect(
      screen.getByText("The future of collective savings")
    ).toBeInTheDocument()
    expect(screen.getByText("Save together")).toBeInTheDocument()
    expect(screen.getByText("Grow")).toBeInTheDocument()
    expect(screen.getByText("Together")).toBeInTheDocument()
    expect(
      screen.getByText("Pool contributions and fund shared goals.")
    ).toBeInTheDocument()

    const launchLinks = screen.getAllByRole("link", { name: /Launch app/i })
    expect(launchLinks).toHaveLength(2)
    expect(launchLinks[0]).toHaveAttribute("href", "/register")
    expect(launchLinks[1]).toHaveAttribute("href", "/register")

    expect(
      screen.getByRole("link", { name: "How it works" })
    ).toHaveAttribute("href", "/how-it-works")
    expect(screen.getByText("1.3B+ Unbanked")).toBeInTheDocument()
    expect(screen.getByText("Zero fees")).toBeInTheDocument()
    expect(screen.getByText("Instant settlement")).toBeInTheDocument()
  })

  it("renders all feature cards and the contracts section", () => {
    render(<LandingContent />)

    const featureTitles = [
      "Trustless pools",
      "Global access",
      "Reputation",
      "Instant payouts",
      "Flexible rotations",
      "Low cost",
    ]
    const featureDescriptions = [
      "Transparent on-chain savings",
      "Available everywhere",
      "Portable on-chain history",
      "Fast shared distributions",
      "Adaptable contribution cycles",
      "Minimal transaction fees",
    ]

    expect(screen.getByText("Built for communities")).toBeInTheDocument()
    for (const title of featureTitles) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    for (const description of featureDescriptions) {
      expect(screen.getByText(description)).toBeInTheDocument()
    }

    expect(screen.getByText("1,284")).toBeInTheDocument()
    expect(screen.getByText("Contracts deployed")).toBeInTheDocument()
    expect(
      screen.getByText("Audited and verified smart contracts")
    ).toBeInTheDocument()
    expect(screen.getByText("Ready to save together?")).toBeInTheDocument()
    expect(
      screen.getByText("Start your first community pool today.")
    ).toBeInTheDocument()

    expect(mockT).toHaveBeenCalledWith("landing.feat1Title")
    expect(mockT).toHaveBeenCalledWith("landing.feat6Desc")
  })

  it("still renders the page when translation entries are missing", () => {
    mockT.mockImplementation((key: string) => key)
    render(<LandingContent />)

    expect(screen.getByText("landing.badge")).toBeInTheDocument()
    expect(screen.getByText("landing.readyTitle")).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(3)
  })
})
