import { describe, expect, it } from "vitest"
import { TransactionBuilder } from "../transaction-builder"

describe("TransactionBuilder", () => {
  it("simulate returns a successful SimulatedTransaction stub", async () => {
    const builder = new TransactionBuilder()
    const result = await builder.simulate()

    expect(result.ok).toBe(true)
    expect(typeof result.resourceFee).toBe("number")
    expect(typeof result.minLedger).toBe("number")
  })

  it("build returns a BuiltTransaction with xdr and estimatedFee", async () => {
    const builder = new TransactionBuilder()
    const result = await builder.build()

    expect(typeof result.xdr).toBe("string")
    expect(typeof result.estimatedFee).toBe("number")
  })

  it("signAndSubmit returns a string", async () => {
    const builder = new TransactionBuilder()
    const result = await builder.signAndSubmit()

    expect(typeof result).toBe("string")
  })

  it("pollUntilFinal returns a boolean", async () => {
    const builder = new TransactionBuilder()
    const result = await builder.pollUntilFinal()

    expect(typeof result).toBe("boolean")
    expect(result).toBe(true)
  })

  it("each method call returns a fresh promise", async () => {
    const builder = new TransactionBuilder()
    const p1 = builder.simulate()
    const p2 = builder.simulate()

    expect(p1).not.toBe(p2)
    await expect(Promise.all([p1, p2])).resolves.toHaveLength(2)
  })
})
