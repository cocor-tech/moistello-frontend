import { describe, it, expect } from "vitest"
import {
  buildTerms,
  windowSnippet,
  searchDocs,
  type DocPage,
} from "@/lib/docs/search-utils"

describe("buildTerms", () => {
  it("splits, trims and lowercases terms", () => {
    expect(buildTerms("  Stellar Wallet  ")).toEqual(["stellar", "wallet"])
    expect(buildTerms("   ")).toEqual([])
  })
})

describe("windowSnippet", () => {
  it("centers the snippet on the first match", () => {
    const content = "one two three four five six seven eight nine ten ".repeat(5)
    const snippet = windowSnippet(content, ["three"])
    expect(snippet).toContain("three")
    expect(snippet.length).toBeLessThan(content.length)
  })

  it("marks truncated borders with ellipses", () => {
    const long = Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ")
    const snippet = windowSnippet(long, ["w59"])
    expect(snippet.startsWith("…") || snippet.endsWith("…")).toBe(true)
  })

  it("falls back to the opening text when nothing matches", () => {
    const snippet = windowSnippet("hello there", ["zzz"])
    expect(snippet).toContain("hello")
  })

  it("returns a prompt for empty content", () => {
    expect(windowSnippet("   ", ["x"])).toContain("Search")
  })
})

describe("searchDocs", () => {
  const pages: DocPage[] = [
    { slug: "circles", title: "Circles", source: "docs", content: "create a circle and contribute weekly to reach a payout goal" },
    { slug: "wallet", title: "Wallet", source: "docs", content: "fund your passkey wallet with USDC from a Stellar anchor" },
    { slug: "faq", title: "FAQ", source: "page", content: "how do I contribute to a circle" },
  ]

  it("ranks title matches above content-only matches", () => {
    const [top] = searchDocs(pages, "wallet")
    expect(top.href).toBe("/docs/wallet")
  })

  it("returns hrefs mapped by source", () => {
    const results = searchDocs(pages, "circle")
    const hrefs = results.map((r) => r.href)
    expect(hrefs).toContain("/docs/circles")
    expect(hrefs).toContain("/faq")
  })

  it("includes a snippet containing the matched term", () => {
    const [top] = searchDocs(pages, "anchor")
    expect(top.snippet.toLowerCase()).toContain("anchor")
  })

  it("returns nothing for a blank query", () => {
    expect(searchDocs(pages, "  ")).toEqual([])
  })
})