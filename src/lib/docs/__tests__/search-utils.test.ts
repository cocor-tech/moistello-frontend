import { describe, expect, it } from "vitest"
import { buildTerms, escapeRegExp, searchDocs, windowSnippet, type DocPage } from "@/lib/docs/search-utils"

describe("search utility edge cases", () => {
  it("escapes regular-expression metacharacters and normalizes query terms", () => {
    expect(escapeRegExp("wallet.*(test)")).toBe("wallet\\.\\*\\(test\\)")
    expect(buildTerms("  Stellar   Wallet ")).toEqual(["stellar", "wallet"])
  })

  it("returns readable opening, empty, and centered snippets", () => {
    expect(windowSnippet("", ["wallet"])).toBe("Search this article for details.")
    expect(windowSnippet("opening text", ["missing"])).toBe("opening text")
    const content = "word ".repeat(60) + "wallet"
    expect(windowSnippet(content, ["wallet"])).toContain("wallet")
    expect(windowSnippet(content, ["wallet"]).startsWith("â€¦")).toBe(true)
  })

  it("ranks title matches, maps source URLs, and respects the result limit", () => {
    const pages: DocPage[] = [
      { slug: "wallet", title: "Wallet", source: "docs", content: "account details" },
      { slug: "faq", title: "FAQ", source: "page", content: "wallet help" },
      { slug: "wallet-guide", title: "Wallet guide", source: "docs", content: "wallet help" },
    ]
    const results = searchDocs(pages, "wallet", 2)
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ href: "/docs/wallet", title: "Wallet" })
    expect(results.map((result) => result.href)).toContain("/faq")
  })
})