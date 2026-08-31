/**
 * Transaction builder with pre-flight simulation (frontend hook-point).
 *
 * Wire-up stub for the transaction lifecycle built on the backend indexer.
 * Kept intentionally thin so it compiles without pulling in the SDK.
 */

export interface SimulatedTransaction {
  resourceFee: number
  minLedger: number
  ok: boolean
}

export interface BuiltTransaction {
  xdr: string
  estimatedFee: number
}

export class TransactionBuilder {
  async simulate(): Promise<SimulatedTransaction> {
    return { resourceFee: 0, minLedger: 0, ok: true }
  }

  async build(): Promise<BuiltTransaction> {
    return { xdr: "", estimatedFee: 0 }
  }

  async signAndSubmit(): Promise<string> {
    return ""
  }

  async pollUntilFinal(): Promise<boolean> {
    return true
  }
}
