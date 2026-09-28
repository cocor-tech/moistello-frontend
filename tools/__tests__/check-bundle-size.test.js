const { describe, it, expect } = require("vitest");
const { formatBytes, loadBudgets } = require("../check-bundle-size");

describe("check-bundle-size tool", () => {
  it("formats bytes into human readable KB strings", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(204800)).toBe("200.0 KB");
  });

  it("loads route budget config with defaults", () => {
    const budgets = loadBudgets();
    expect(budgets.totalBudget).toBeDefined();
    expect(budgets.defaultRouteBudget).toBeDefined();
    expect(typeof budgets.routes).toBe("object");
  });
});
