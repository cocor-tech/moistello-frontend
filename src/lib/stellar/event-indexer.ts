/**
 * On-chain event indexer (frontend hook-point).
 *
 * Minimal stub for polling and ledger-cursor tracking. The full indexer
 * (poller, processor, deduplicator) lives in the backend.
 */

import { getRedisClient } from "../redis/client"

export interface IndexedEvent {
  ledger: number
  txHash: string
  type: string
}

const CURSOR_KEY = "moistello:indexer:cursor"

export class EventIndexer {
  async currentCursor(): Promise<string> {
    return (await getRedisClient().get(CURSOR_KEY)) ?? ""
  }

  async saveCursor(cursor: string): Promise<void> {
    await getRedisClient().set(CURSOR_KEY, cursor)
  }

  async pollOnce(): Promise<IndexedEvent[]> {
    return []
  }
}
