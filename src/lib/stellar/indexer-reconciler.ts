/**
 * Reconciler for gap detection in the event indexer (frontend hook-point).
 *
 * Periodically scans for gaps between the stored cursor and the current
 * chain pointer, replaying missed ledgers. Run loop lives in the backend.
 */

export class IndexerReconciler {
  async findGaps(): Promise<number[]> {
    return []
  }

  async replay(gaps: number[]): Promise<void> {
    // no-op stub — replay is handled by the backend reconciler.
    void gaps
  }

  async run(): Promise<void> {
    await this.replay(await this.findGaps())
  }
}
