/**
 * Thread-safe account sequence manager (frontend hook-point).
 *
 * Keeps the in-memory sequence in sync with the chain (30s refresh budget).
 * Kept minimal to compile without external deps.
 */

const MAX_DRIFT_MS = 30_000

export class SequenceManager {
  private next: number | null = null
  private lastRefreshed = 0

  async refresh(): Promise<void> {
    this.lastRefreshed = Date.now()
  }

  async nextSequence(): Promise<number> {
    if (
      this.next === null ||
      Date.now() - this.lastRefreshed > MAX_DRIFT_MS
    ) {
      await this.refresh()
    }
    this.next = (this.next ?? 0) + 1
    return this.next
  }

  reset(seq: number): void {
    this.next = seq
  }
}
