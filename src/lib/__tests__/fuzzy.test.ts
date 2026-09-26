import { describe, it, expect } from "vitest";

import { fuzzyMatch, fuzzyRank } from "@/lib/fuzzy";

describe("fuzzyMatch", () => {
  it("returns a zero-score result for an empty query", () => {
    expect(fuzzyMatch("", "Wallet")).toEqual({ score: 0, indices: [] });
    expect(fuzzyMatch("   ", "Wallet")).toEqual({ score: 0, indices: [] });
  });

  it("matches a contiguous substring and reports its indices", () => {
    const result = fuzzyMatch("wall", "Wallet settings");
    expect(result).not.toBeNull();
    expect(result?.indices).toEqual([0, 1, 2, 3]);
  });

  it("matches a non-contiguous subsequence", () => {
    const result = fuzzyMatch("wl", "Wallet");
    expect(result).not.toBeNull();
    expect(result?.indices).toEqual([0, 2]);
  });

  it("returns null when a query character is missing", () => {
    expect(fuzzyMatch("zz", "Wallet")).toBeNull();
  });

  it("respects character order", () => {
    // "th" appears in "Settings theme" but reversed, so it must not match.
    expect(fuzzyMatch("th", "ht")).toBeNull();
  });

  it("is case insensitive", () => {
    expect(fuzzyMatch("WALLET", "wallet")).toEqual(fuzzyMatch("wallet", "WALLET"));
  });

  it("scores word-boundary matches above mid-word matches", () => {
    const boundary = fuzzyMatch("s", "Wallet settings");
    const midWord = fuzzyMatch("s", "Transactions");
    expect(boundary).not.toBeNull();
    expect(midWord).not.toBeNull();
    expect(boundary!.score).toBeGreaterThan(midWord!.score);
  });

  it("rewards consecutive runs over scattered characters", () => {
    const consecutive = fuzzyMatch("wal", "Wallet");
    const scattered = fuzzyMatch("wal", "Weekly allocation log");
    expect(consecutive).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(consecutive!.score).toBeGreaterThan(scattered!.score);
  });

  it("ignores whitespace in the query so multi-word input still matches", () => {
    expect(fuzzyMatch("wall et", "Wallet")).not.toBeNull();
  });

  it("prefers the shorter target when relevance ties", () => {
    const short = fuzzyMatch("wallet", "Wallet");
    const long = fuzzyMatch("wallet", "Wallet transaction history");
    expect(short).not.toBeNull();
    expect(long).not.toBeNull();
    expect(short!.score).toBeGreaterThan(long!.score);
  });

  it("reports indices against the original casing of the target", () => {
    const result = fuzzyMatch("w", "Wallet");
    expect(result?.indices).toEqual([0]);
  });
});

describe("fuzzyRank", () => {
  const items = [
    { id: "wallet", label: "Wallet" },
    { id: "wallets", label: "Wallet addresses" },
    { id: "circles", label: "Circles" },
  ];
  const byLabel = (item: { label: string }) => item.label;

  it("returns every item in source order for an empty query", () => {
    expect(fuzzyRank("", items, byLabel).map((r) => r.item.id)).toEqual([
      "wallet",
      "wallets",
      "circles",
    ]);
  });

  it("drops items that do not match", () => {
    const ranked = fuzzyRank("circ", items, byLabel);
    expect(ranked.map((r) => r.item.id)).toEqual(["circles"]);
  });

  it("orders the best match first", () => {
    const ranked = fuzzyRank("wallet", items, byLabel);
    expect(ranked[0].item.id).toBe("wallet");
  });

  it("returns an empty list when nothing matches", () => {
    expect(fuzzyRank("qqqq", items, byLabel)).toEqual([]);
  });

  it("carries through match indices for highlighting", () => {
    const ranked = fuzzyRank("wal", items, byLabel);
    expect(ranked[0].indices).toEqual([0, 1, 2]);
  });
});
