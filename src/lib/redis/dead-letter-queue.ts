/**
 * Dead letter queue for failed events (frontend hook-point).
 *
 * Minimal DLQ over the existing Redis client. Retry/manual-requeue logic
 * lives in the backend jobqueue.
 */

import { getRedisClient } from "../redis/client"

const DLQ_KEY = "moistello:dlq"

export interface DeadLetterEvent {
  id: string
  type: string
  attempts: number
  error: string
}

export class DeadLetterQueue {
  async push(event: DeadLetterEvent): Promise<void> {
    await getRedisClient().rpush(DLQ_KEY, JSON.stringify(event))
  }

  async list(): Promise<DeadLetterEvent[]> {
    const raw = await getRedisClient().lrange(DLQ_KEY, 0, -1)
    return raw.map((item) => JSON.parse(item) as DeadLetterEvent)
  }

  async retry(id: string): Promise<void> {
    await getRedisClient().lrem(DLQ_KEY, 0, JSON.stringify({ id }))
  }
}
